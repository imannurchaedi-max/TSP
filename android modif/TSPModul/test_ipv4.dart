import 'dart:io';

void main() async {
  final client = HttpClient();
  client.connectionFactory = (uri, proxyHost, proxyPort) {
    print('Resolving \');
    return InternetAddress.lookup(uri.host).then((addresses) {
      final ip = addresses.firstWhere((a) => a.type == InternetAddressType.IPv4);
      print('Connecting to \');
      return Socket.startConnect(ip.address, uri.port);
    });
  };

  try {
    final req = await client.getUrl(Uri.parse('https://script.google.com/'));
    final res = await req.close();
    print('Status: \');
  } catch (e) {
    print('Error: \');
  }
}
