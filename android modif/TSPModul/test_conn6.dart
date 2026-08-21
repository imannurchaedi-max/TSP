import 'dart:io';

void main() async {
  final client = HttpClient();
  client.connectionFactory = (uri, proxyHost, proxyPort) {
    print('Using connectionFactory to return SecureSocket directly');
    return Future.value(ConnectionTask.fromSocket(
      SecureSocket.connect(uri.host, uri.port, supportedProtocols: ['http/1.1']),
      () {}
    ));
  };
  
  try {
    final req = await client.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
    final res = await req.close();
    print('Status: ${res.statusCode}');
  } catch (e) {
    print('Error: $e');
  }
}
