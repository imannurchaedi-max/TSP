import 'dart:convert';

import 'package:dio/dio.dart';

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

/// Client JSON API TSP Modul. Semua request adalah POST ke doPost(e) di
/// Active/ApiService.js dengan body { action, token, ...params }.
///
/// Endpoint Apps Script /exec selalu membalas 302 redirect (POST diproses di hop
/// pertama, hasil JSON diambil GET di redirect target) -- perilaku default Dio
/// (followRedirects mengikuti kaidah HTTP standar: downgrade ke GET tanpa body pada
/// redirect) sudah cocok untuk pola ini, sudah diverifikasi manual lewat curl.
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
          followRedirects: true,
          maxRedirects: 5,
          validateStatus: (status) => status != null && status < 500,
        ));

  Future<Map<String, dynamic>> _raw(String action, Map<String, dynamic> body) async {
    try {
      final response = await _dio.post<dynamic>('', data: {'action': action, ...body});
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      if (data is String && data.trim().isNotEmpty) {
        final decoded = jsonDecode(data);
        if (decoded is Map<String, dynamic>) return decoded;
      }
      throw ApiException('Respons server tidak dikenali (HTTP ${response.statusCode}).');
    } on DioException catch (e) {
      throw _mapDioError(e);
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
