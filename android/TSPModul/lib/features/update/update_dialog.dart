import 'package:flutter/material.dart';

import '../../core/apk_installer.dart';
import '../../core/update_checker.dart';

/// Cek update lalu (kalau ada) tampilkan dialog. Dipanggil otomatis diam-diam
/// tiap app dibuka (silent: true, tidak ada notifikasi apa pun kalau tidak ada
/// update atau kalau gagal cek/offline) dan juga dari tombol manual "Cek Update"
/// (silent: false, tampilkan hasil apa pun -- termasuk "sudah versi terbaru").
Future<void> checkAndPromptUpdate(BuildContext context, {required bool silent}) async {
  final info = await checkForUpdate();
  if (!context.mounted) return;

  if (info == null) {
    if (!silent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sudah menggunakan versi terbaru.')),
      );
    }
    return;
  }

  final shouldUpdate = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Update Tersedia: v${info.version}'),
      content: SingleChildScrollView(
        child: Text(info.releaseNotes.isEmpty ? 'Ada pembaruan aplikasi TSP Modul.' : info.releaseNotes),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Nanti')),
        FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Update Sekarang')),
      ],
    ),
  );

  if (shouldUpdate != true || !context.mounted) return;
  await _downloadAndInstall(context, info);
}

Future<void> _downloadAndInstall(BuildContext context, UpdateInfo info) async {
  final progressNotifier = ValueNotifier<double>(0);

  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      title: const Text('Mengunduh Update'),
      content: ValueListenableBuilder<double>(
        valueListenable: progressNotifier,
        builder: (context, progress, _) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LinearProgressIndicator(value: progress > 0 ? progress : null),
            const SizedBox(height: 12),
            Text('${(progress * 100).toStringAsFixed(0)}%'),
          ],
        ),
      ),
    ),
  );

  try {
    await downloadAndInstallApk(info.apkUrl, onProgress: (p) => progressNotifier.value = p);
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal mengunduh update: $e')));
    }
  } finally {
    if (context.mounted) Navigator.of(context, rootNavigator: true).pop();
  }
}
