import 'dart:io';

void main() async {
  final client = HttpClient();
  client.connectionFactory = (uri, proxyHost, proxyPort) async {
    print('Lookup: \');
    final addresses = await InternetAddress.lookup(uri.host);
    final ipv4 = addresses.where((a) => a.type == InternetAddressType.IPv4).toList();
    final target = ipv4.isNotEmpty ? ipv4.first : addresses.first;
    print('Connecting to \');
    return Socket.startConnect(target, uri.port);
  };

  try {
    final req = await client.postUrl(Uri.parse('https://script.google.com/macros/s/AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ/exec'));
    final res = await req.close();
    print('Status: \');
    if (res.statusCode == 302) {
      final loc = res.headers.value('location');
      print('Location: \');
      final req2 = await client.getUrl(Uri.parse(loc!));
      final res2 = await req2.close();
      print('Status2: \');
    }
  } catch (e) {
    print('Error: \');
  }
}
