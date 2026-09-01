import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

import 'constants.dart';
import 'session.dart';

class ApiException implements Exception {
  final String message;
  final bool isConnectivityError;
  ApiException(this.message, {this.isConnectivityError = false});

  @override
  String toString() => message;
}

/// Substring pesan error dari validateApiToken_() di Active/ApiService.js saat
/// token API kadaluarsa/tidak valid -- dipakai untuk memicu silent re-login.
const _kSessionExpiredMarker = 'Sesi API tidak valid';

bool _isRedirectStatus(int? statusCode) =>
    statusCode == 301 || statusCode == 302 || statusCode == 303 || statusCode == 307 || statusCode == 308;

/// Client JSON API TSP Modul. Semua request adalah POST ke doPost(e) di
/// Active/ApiService.js dengan body { action, token, ...params }.
///
/// Endpoint Apps Script /exec selalu membalas 302 redirect ke URL "echo" satu-pakai
/// (POST diproses di hop pertama, hasil JSON baru bisa diambil lewat GET biasa --
/// TANPA body -- ke Location itu). curl default (tanpa -X override) otomatis
/// menangani pola ini dengan benar, tapi Dio's IOHttpClientAdapter TIDAK
/// auto-follow redirect utk request POST (beda dari asumsi awal yang cuma
/// dicek lewat curl) -- makanya di-follow manual di sini: matikan
/// followRedirects, baca header Location dari respons 302, lalu GET ke situ.
class ApiClient {
  final Dio _dio;
  final SessionManager _session;

  ApiClient(this._session)
      : _dio = Dio(BaseOptions(
          baseUrl: kApiBaseUrl,
          contentType: 'application/json',
          connectTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 30),
          followRedirects: false,
          validateStatus: (status) => status != null && status < 500,
        )) {
    // Gunakan resolver socket bawaan Dart/Android agar koneksi memakai IPv4
    // atau IPv6 sesuai jaringan. Google Apps Script berjalan di endpoint
    // Google dual-stack; mengunci IPv4 akan gagal pada jaringan IPv6-only.
    // HttpClient Dart menggunakan HTTPS HTTP/1.1, kompatibel dengan /exec.
    final httpClient = HttpClient()
      ..connectionTimeout = const Duration(seconds: 20)
      ..idleTimeout = const Duration(seconds: 15);
    _dio.httpClientAdapter =
        IOHttpClientAdapter(createHttpClient: () => httpClient);
  }

  Future<Map<String, dynamic>> _raw(String action, Map<String, dynamic> body) async {
    try {
      var response = await _dio.post<dynamic>('', data: {'action': action, ...body});

      // IOHttpClientAdapter mengembalikan 302 sebagai respons biasa saat
      // followRedirects=false; jangan memakai Response.isRedirect karena nilainya
      // tidak konsisten pada adapter tersebut. Ikuti berantai (bukan cuma 1 hop) --
      // Google pernah menyisipkan hop tambahan di infra echo URL-nya.
      var redirectHops = 0;
      while (_isRedirectStatus(response.statusCode) && redirectHops < 3) {
        final location = response.headers.value('location');
        if (location == null) {
          throw ApiException('Server mengembalikan redirect tanpa tujuan (HTTP ${response.statusCode}).');
        }
        final target = Uri.parse(location);
        response = await _dio.getUri<dynamic>(
          target.hasScheme ? target : response.realUri.resolveUri(target),
        );
        redirectHops++;
      }

      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      if (data is String && data.trim().isNotEmpty) {
        final decoded = jsonDecode(data);
        if (decoded is Map<String, dynamic>) return decoded;
      }
      throw ApiException('Respons server tidak dikenali (HTTP ${response.statusCode}).');
    } on DioException catch (e) {
      throw _mapDioError(e);
    } on SocketException catch (e) {
      throw ApiException('Koneksi ke server gagal: ${e.message}', isConnectivityError: true);
    } on HandshakeException catch (e) {
      throw ApiException('Koneksi aman ke server gagal: ${e.message}', isConnectivityError: true);
    } on FormatException catch (e) {
      // Apps Script kadang membalas HTML (kuota eksekusi habis, timeout, service
      // sibuk) alih-alih JSON saat server sedang tertekan -- status server di titik
      // itu tidak pasti (sukses/gagal), jadi diperlakukan sebagai gangguan konektivitas
      // supaya scan ikut mekanisme antrian offline (aman lewat clientRequestId
      // idempotency di apiSubmitScanIdempotent_), bukan exception mentah yang bocor ke UI.
      throw ApiException(
        'Server sedang sibuk atau kuota tereksekusi (respons bukan JSON): ${e.message}',
        isConnectivityError: true,
      );
    }
  }

  /// Login: tidak butuh token. Dipanggil langsung dari layar login, dan juga
  /// dipakai internal untuk silent re-login saat sesi kadaluarsa.
  Future<Map<String, dynamic>> login(String nik, String password) {
    return _raw('login', {'nik': nik, 'password': password});
  }

  /// Semua action selain login. Otomatis sisipkan token tersimpan; kalau server
  /// bilang sesi kadaluarsa, coba login ulang diam-diam pakai kredensial
  /// tersimpan lalu retry SEKALI sebelum menyerah.
  Future<Map<String, dynamic>> call(String action, [Map<String, dynamic> body = const {}]) async {
    final token = await _session.getToken();
    if (token == null) throw ApiException('Belum login.');

    var res = await _raw(action, {'token': token, ...body});
    final message = res['message'] as String? ?? '';
    if (res['success'] == false && message.contains(_kSessionExpiredMarker)) {
      final newToken = await _trySilentRelogin();
      res = await _raw(action, {'token': newToken, ...body});
    }
    return res;
  }

  Future<String> _trySilentRelogin() async {
    final creds = await _session.getCredentials();
    if (creds == null) {
      throw ApiException('Sesi habis, silakan login ulang secara manual.');
    }
    final res = await login(creds.$1, creds.$2);
    if (res['success'] != true) {
      throw ApiException('Sesi habis dan login ulang otomatis gagal: ${res['message'] ?? '-'}');
    }
    final token = res['token'] as String;
    await _session.updateToken(token);
    return token;
  }

  ApiException _mapDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('Koneksi timeout, coba lagi.', isConnectivityError: true);
      case DioExceptionType.connectionError:
        return ApiException('Tidak ada koneksi internet.', isConnectivityError: true);
      default:
        return ApiException('Gagal menghubungi server: ${e.message}');
    }
  }
}
