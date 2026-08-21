import 'dart:io';

void main() async {
  final addresses = await InternetAddress.lookup('script.google.com');
  for (var addr in addresses) {
    print('Testing addr: ${addr.address} (${addr.type.name})');
    final client2 = HttpClient();
    client2.connectionFactory = (uri, proxyHost, proxyPort) async {
      return Socket.startConnect(addr, uri.port);
    };
    try {
      final req = await client2.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
      final res = await req.close();
      print('Status: ${res.statusCode}');
    } catch (e) {
      print('Error: $e');
    }
  }
}
