import 'dart:io';

void main() {
  final client = HttpClient();
  print(client.connectionTimeout);
}
