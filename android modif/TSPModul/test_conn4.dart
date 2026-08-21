import 'dart:io';

void main() async {
  final client2 = HttpClient();
  client2.connectionFactory = (uri, proxyHost, proxyPort) async {
    final addresses = await InternetAddress.lookup(uri.host);
    final ipv4 = addresses.where((a) => a.type == InternetAddressType.IPv4).toList();
    final target = ipv4.isNotEmpty ? ipv4.first : addresses.first;
    
    // Create a SecureSocket manually
    final secureSocketFuture = SecureSocket.connect(target, uri.port, supportedProtocols: ['http/1.1'], host: uri.host);
    return ConnectionTask.fromSocket(secureSocketFuture, () {});
  };
  try {
    final req = await client2.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
    final res = await req.close();
    print('Status custom: ${res.statusCode}');
  } catch (e) {
    print('Error custom: $e');
  }
}
