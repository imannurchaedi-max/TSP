// Smoke test dasar: layar Login (satu-satunya layar tanpa dependensi platform
// channel di initState-nya) berhasil dirender dan menampilkan field NIK/Password.
// Tidak menguji TspModulApp/main.dart secara utuh karena initState-nya memanggil
// flutter_secure_storage & connectivity_plus yang butuh platform channel mock.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tsp_modul/features/auth/login_screen.dart';

void main() {
  testWidgets('LoginScreen menampilkan form NIK & Password', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('TSP Modul'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'NIK'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Password'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Masuk'), findsOneWidget);
  });
}
