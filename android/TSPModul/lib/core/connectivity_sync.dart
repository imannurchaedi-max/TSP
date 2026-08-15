import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers.dart';

/// Memicu SyncService.syncPending() otomatis setiap kali koneksi kembali online
/// SELAMA APP DI FOREGROUND. Untuk saat app tidak dibuka sama sekali, cakupan
/// tambahan ditangani oleh WorkManager periodic task (lihat background_sync.dart).
class ConnectivitySyncWatcher {
  final Ref _ref;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  ConnectivitySyncWatcher(this._ref);

  void start() {
    _sub = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        _ref.read(syncServiceProvider).syncPending();
      }
    });

    // Cek juga saat pertama kali start (mis. app baru dibuka dan sudah online,
    // ada sisa antrian dari sesi sebelumnya).
    _ref.read(syncServiceProvider).syncPending();
  }

  void dispose() => _sub?.cancel();
}

final connectivitySyncWatcherProvider = Provider<ConnectivitySyncWatcher>((ref) {
  final watcher = ConnectivitySyncWatcher(ref);
  ref.onDispose(watcher.dispose);
  return watcher;
});
