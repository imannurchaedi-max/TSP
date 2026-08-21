import 'dart:io';

void main() async {
  final client = HttpClient();
  
  try {
    print('Testing secure with host...');
    final socket = await Socket.connect('script.google.com', 443);
    final secure = await SecureSocket.secure(socket, host: 'script.google.com');
    secure.write('GET / HTTP/1.1\r\nHost: script.google.com\r\n\r\n');
    secure.listen((data) {
      print(String.fromCharCodes(data));
    });
  } catch (e) {
    print('Error: \');
  }
}
