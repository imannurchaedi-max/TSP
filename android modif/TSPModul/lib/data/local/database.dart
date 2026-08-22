import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'database.g.dart';

/// Antrian scan offline. 1 baris = 1 scan yang belum (atau gagal) tersinkron
/// ke server. localId dipakai juga sebagai clientRequestId (idempotency key)
/// yang dikenali apiSubmitScanIdempotent_() di Active/ApiService.js.
class PendingScans extends Table {
  TextColumn get localId => text()();
  TextColumn get barcodeText => text()();
  TextColumn get eventCode => text()();
  TextColumn get mesinCode => text().nullable()();
  TextColumn get jumlah => text().nullable()();
  TextColumn get noReservasi => text().nullable()();
  TextColumn get nik => text()();
  DateTimeColumn get createdAt => dateTime()();

  /// pending | syncing | synced | failed
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  TextColumn get serverMessage => text().nullable()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {localId};
}

@DriftDatabase(tables: [PendingScans])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 1;

  /// Urutan FIFO (createdAt ascending) WAJIB dijaga saat sinkronisasi -- state
  /// machine di BarcodeService.js menolak event lanjutan (mis. kirim_mesin) kalau
  /// prasyaratnya (terima_wrm) untuk barcode yang sama belum tercatat duluan.
  Stream<List<PendingScan>> watchQueue() {
    return (select(pendingScans)..orderBy([(t) => OrderingTerm.asc(t.createdAt)])).watch();
  }

  /// Hanya scan milik [nik] yang diambil -- mencegah antrian offline operator
  /// lain (yang belum sempat sync sebelum ganti sesi) ikut terkirim atas nama
  /// user yang sedang login sekarang.
  Future<List<PendingScan>> getPendingInOrder({required String nik}) {
    return (select(pendingScans)
          ..where((t) => t.syncStatus.equals('pending') & t.nik.equals(nik))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  /// Dipanggil di awal syncPending() untuk memulihkan baris yang macet di
  /// status 'syncing' akibat app/proses mati di tengah request sebelumnya --
  /// tanpa ini baris tsb tidak pernah terpilih lagi oleh getPendingInOrder()
  /// dan tidak ada jalan retry dari UI (lihat SyncQueueScreen).
  Future<void> resetStuckSyncing() {
    return (update(pendingScans)..where((t) => t.syncStatus.equals('syncing'))).write(
      const PendingScansCompanion(syncStatus: Value('pending')),
    );
  }

  Future<int> countPending() async {
    final rows = await (select(pendingScans)..where((t) => t.syncStatus.equals('pending'))).get();
    return rows.length;
  }

  Future<void> enqueue(PendingScansCompanion entry) => into(pendingScans).insert(entry);

  Future<void> updateStatus(String localId, {required String status, String? message}) {
    return (update(pendingScans)..where((t) => t.localId.equals(localId))).write(
      PendingScansCompanion(
        syncStatus: Value(status),
        serverMessage: Value(message),
      ),
    );
  }

  Future<void> incrementRetry(String localId) async {
    final row = await (select(pendingScans)..where((t) => t.localId.equals(localId))).getSingleOrNull();
    if (row == null) return;
    await (update(pendingScans)..where((t) => t.localId.equals(localId)))
        .write(PendingScansCompanion(retryCount: Value(row.retryCount + 1)));
  }

  Future<void> deleteEntry(String localId) =>
      (delete(pendingScans)..where((t) => t.localId.equals(localId))).go();

  Future<void> clearSynced() => (delete(pendingScans)..where((t) => t.syncStatus.equals('synced'))).go();
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'tsp_modul.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
