import 'dart:io';

import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Download APK dari GitHub Release ke storage lokal app, lalu serahkan ke
/// installer sistem Android (butuh permission REQUEST_INSTALL_PACKAGES +
/// user mengizinkan "install unknown apps" utk app ini -- system akan minta
/// otomatis kalau belum diizinkan).
Future<void> downloadAndInstallApk(String url, {void Function(double progress)? onProgress}) async {
  final dir = await getTemporaryDirectory();
  final savePath = p.join(dir.path, 'tsp_modul_update.apk');

  final dio = Dio();
  await dio.download(
    url,
    savePath,
    onReceiveProgress: (received, total) {
      if (total > 0 && onProgress != null) onProgress(received / total);
    },
  );

  final result = await OpenFilex.open(savePath);
  if (result.type != ResultType.done) {
    throw Exception('Gagal membuka installer: ${result.message}');
  }
}

/// Bersihkan file APK update lama dari cache (dipanggil setelah instalasi
/// selesai / dibatalkan, best-effort).
Future<void> cleanupDownloadedApk() async {
  try {
    final dir = await getTemporaryDirectory();
    final file = File(p.join(dir.path, 'tsp_modul_update.apk'));
    if (await file.exists()) await file.delete();
  } catch (_) {
    // Best-effort, abaikan kalau gagal.
  }
}
