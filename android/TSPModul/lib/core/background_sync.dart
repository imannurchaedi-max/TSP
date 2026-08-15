import 'package:workmanager/workmanager.dart';

import '../data/local/database.dart';
import '../data/repositories/sync_service.dart';
import 'api_client.dart';
import 'session.dart';

const String kSyncTaskName = 'tsp_modul_sync_pending_scans';

/// Entry point terpisah dijalankan WorkManager di isolate background (app bisa
/// dalam keadaan tertutup) -- 15 menit sekali, hanya saat ada koneksi. Ini
/// jaring pengaman untuk kasus app tidak pernah dibuka lagi setelah scan
/// offline; sinkronisasi utama tetap terjadi lewat ConnectivitySyncWatcher
/// selama app di foreground.
@pragma('vm:entry-point')
void backgroundSyncDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final session = SessionManager();
      final api = ApiClient(session);
      final db = AppDatabase();
      final sync = SyncService(api, db);
      await sync.syncPending();
      await db.close();
      return true;
    } catch (_) {
      return false;
    }
  });
}

Future<void> initBackgroundSync() async {
  await Workmanager().initialize(backgroundSyncDispatcher);
  await Workmanager().registerPeriodicTask(
    kSyncTaskName,
    kSyncTaskName,
    frequency: const Duration(minutes: 15),
    constraints: Constraints(networkType: NetworkType.connected),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
  );
}
