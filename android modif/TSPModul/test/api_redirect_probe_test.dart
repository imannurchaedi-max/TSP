import 'package:flutter_test/flutter_test.dart';
import 'package:tsp_modul/core/api_client.dart';
import 'package:tsp_modul/core/session.dart';

void main() {
  test('Apps Script POST redirect resolves to JSON', () async {
    final api = ApiClient(SessionManager());
    final response = await api.login('CONNECTION_PROBE', 'invalid');

    expect(response['success'], isFalse);
    expect(response['message'], isNotEmpty);
  }, timeout: const Timeout(Duration(seconds: 30)));
}
