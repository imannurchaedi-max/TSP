import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// User hasil login, mirror return value login_() di Active/AuthService.js.
class SessionUser {
  final String nik;
  final String nama;
  final String jabatan;
  final String role;

  const SessionUser({
    required this.nik,
    required this.nama,
    required this.jabatan,
    required this.role,
  });

  factory SessionUser.fromJson(Map<String, dynamic> json) => SessionUser(
        nik: json['nik'] as String? ?? '',
        nama: json['nama'] as String? ?? '',
        jabatan: json['jabatan'] as String? ?? '',
        role: json['role'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'nik': nik,
        'nama': nama,
        'jabatan': jabatan,
        'role': role,
      };
}

/// Kredensial NIK+password tersimpan aman di perangkat, dipakai untuk silent
/// re-login otomatis saat token API kadaluarsa (lihat ApiClient) -- supaya
/// operator di lantai produksi tidak perlu login manual ulang di tengah shift.
class SessionManager {
  static const _storage = FlutterSecureStorage();

  static const _kToken = 'api_token';
  static const _kNik = 'cred_nik';
  static const _kPassword = 'cred_password';
  static const _kUserJson = 'session_user';

  Future<void> saveSession({
    required String token,
    required SessionUser user,
    required String nik,
    required String password,
  }) async {
    await Future.wait([
      _storage.write(key: _kToken, value: token),
      _storage.write(key: _kUserJson, value: jsonEncode(user.toJson())),
      _storage.write(key: _kNik, value: nik),
      _storage.write(key: _kPassword, value: password),
    ]);
  }

  Future<String?> getToken() => _storage.read(key: _kToken);

  Future<void> updateToken(String token) => _storage.write(key: _kToken, value: token);

  Future<SessionUser?> getUser() async {
    final raw = await _storage.read(key: _kUserJson);
    if (raw == null) return null;
    return SessionUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  /// Return (nik, password) atau null kalau belum pernah login.
  Future<(String, String)?> getCredentials() async {
    final nik = await _storage.read(key: _kNik);
    final password = await _storage.read(key: _kPassword);
    if (nik == null || password == null) return null;
    return (nik, password);
  }

  Future<bool> hasSession() async => (await getToken()) != null;

  Future<void> clear() => _storage.deleteAll();
}
