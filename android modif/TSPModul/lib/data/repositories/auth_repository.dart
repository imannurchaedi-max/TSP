import '../../core/api_client.dart';
import '../../core/session.dart';

class AuthRepository {
  final ApiClient _api;
  final SessionManager _session;

  AuthRepository(this._api, this._session);

  Future<SessionUser> login(String nik, String password) async {
    final res = await _api.login(nik, password);
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Login gagal.');
    }
    final user = SessionUser.fromJson(res['user'] as Map<String, dynamic>);
    final token = res['token'] as String;
    await _session.saveSession(token: token, user: user, nik: nik, password: password);
    return user;
  }

  Future<SessionUser?> restoreSession() async {
    if (await _session.getUser() == null || await _session.getToken() == null) return null;
    try {
      final res = await _api.call('getSession');
      if (res['success'] != true) throw ApiException(res['message'] as String? ?? 'Sesi tidak valid.');
      final user = SessionUser.fromJson(res['data'] as Map<String, dynamic>);
      await _session.updateUser(user);
      return user;
    } on ApiException {
      await _session.clear();
      return null;
    }
  }

  Future<void> logout() => _session.clear();
}
