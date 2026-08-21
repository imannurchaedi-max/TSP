import 'dart:io';

void main() async {
  final client = HttpClient();
  
  try {
    print('Testing normal get...');
    final req = await client.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
    final res = await req.close();
    print('Status: ${res.statusCode}');
  } catch (e) {
    print('Error normal: $e');
  }

  final client2 = HttpClient();
  client2.connectionFactory = (uri, proxyHost, proxyPort) async {
    final addresses = await InternetAddress.lookup(uri.host);
    final target = addresses.first;
    return Socket.startConnect(target, uri.port);
  };
  try {
    print('Testing custom connectionFactory...');
    final req = await client2.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
    final res = await req.close();
    print('Status: ${res.statusCode}');
  } catch (e) {
    print('Error custom: $e');
  }
}
