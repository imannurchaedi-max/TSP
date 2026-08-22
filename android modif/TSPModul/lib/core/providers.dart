import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/local/database.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/history_repository.dart';
import '../data/repositories/reference_repository.dart';
import '../data/repositories/material_repository.dart';
import '../data/repositories/reprint_repository.dart';
import '../data/repositories/scan_repository.dart';
import '../data/repositories/stock_repository.dart';
import '../data/repositories/sync_service.dart';
import '../data/repositories/validator_repository.dart';
import 'api_client.dart';
import 'session.dart';

final sessionManagerProvider = Provider<SessionManager>((ref) => SessionManager());

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.watch(sessionManagerProvider)));

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider), ref.watch(sessionManagerProvider)),
);

final scanRepositoryProvider = Provider<ScanRepository>(
  (ref) => ScanRepository(ref.watch(apiClientProvider), ref.watch(appDatabaseProvider)),
);

final referenceRepositoryProvider = Provider<ReferenceRepository>(
  (ref) => ReferenceRepository(ref.watch(apiClientProvider)),
);

final syncServiceProvider = Provider<SyncService>(
  (ref) => SyncService(ref.watch(apiClientProvider), ref.watch(appDatabaseProvider), ref.watch(sessionManagerProvider)),
);

final stockRepositoryProvider = Provider<StockRepository>(
  (ref) => StockRepository(ref.watch(apiClientProvider)),
);

final historyRepositoryProvider = Provider<HistoryRepository>(
  (ref) => HistoryRepository(ref.watch(apiClientProvider)),
);

final reprintRepositoryProvider = Provider<ReprintRepository>(
  (ref) => ReprintRepository(ref.watch(apiClientProvider)),
);

final materialRepositoryProvider = Provider<MaterialRepository>(
  (ref) => MaterialRepository(ref.watch(apiClientProvider)),
);

final validatorRepositoryProvider = Provider<ValidatorRepository>(
  (ref) => ValidatorRepository(ref.watch(apiClientProvider)),
);

/// Sesi user yang sedang login. Di-set setelah login sukses / restore sesi
/// tersimpan; null berarti belum login (arahkan ke layar Login).
final currentUserProvider = StateProvider<SessionUser?>((ref) => null);

/// Antrian pending scan lokal, dipantau real-time untuk badge & layar sync.
final pendingQueueProvider = StreamProvider<List<PendingScan>>((ref) {
  return ref.watch(appDatabaseProvider).watchQueue();
});
