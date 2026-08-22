import 'package:drift/drift.dart' show Value;
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../local/database.dart';

/// Hasil submit scan, mirror { success, warning, message, childBarcode } yang
/// dikembalikan submitScan() di Active/Code.js.
class ScanSubmitResult {
  final bool success;
  final bool warning;
  final String message;
  final String? childBarcode;
  final bool queuedOffline;

  const ScanSubmitResult({
    required this.success,
    required this.warning,
    required this.message,
    this.childBarcode,
    this.queuedOffline = false,
  });

  factory ScanSubmitResult.fromJson(Map<String, dynamic> json) => ScanSubmitResult(
        success: json['success'] == true,
        warning: json['warning'] == true,
        message: json['message'] as String? ?? '',
        childBarcode: json['childBarcode'] as String?,
      );
}

class ScanRepository {
  final ApiClient _api;
  final AppDatabase _db;
  final _uuid = const Uuid();

  ScanRepository(this._api, this._db);

  /// Submit 1 scan. Kalau online, langsung kirim & kembalikan hasil real-time
  /// (persis alur Scanner.html). Kalau gagal karena TIDAK ADA KONEKSI (bukan
  /// gagal validasi server -- itu tetap dilempar sebagai error ke UI), otomatis
  /// masuk antrian offline lokal supaya scan tidak hilang, lalu disinkronkan
  /// belakangan oleh SyncService begitu online kembali.
  Future<ScanSubmitResult> submitScan({
    required String barcodeText,
    required String eventCode,
    String? mesinCode,
    String? jumlah,
    String? noReservasi,
    required String nik,
  }) async {
    final clientRequestId = _uuid.v4();
    try {
      final res = await _api.call('submitScan', {
        'clientRequestId': clientRequestId,
        'barcodeText': barcodeText,
        'eventCode': eventCode,
        'mesinCode': mesinCode,
        'jumlah': jumlah,
        'noReservasi': noReservasi,
      });
      return ScanSubmitResult.fromJson(res);
    } on ApiException catch (e) {
      if (!e.isConnectivityError) rethrow;

      await _db.enqueue(PendingScansCompanion.insert(
        localId: clientRequestId,
        barcodeText: barcodeText,
        eventCode: eventCode,
        mesinCode: Value(mesinCode),
        jumlah: Value(jumlah),
        noReservasi: Value(noReservasi),
        nik: nik,
        createdAt: DateTime.now(),
      ));

      return const ScanSubmitResult(
        success: true,
        warning: true,
        queuedOffline: true,
        message: 'Tidak ada koneksi -- scan disimpan di antrian lokal dan akan '
            'dikirim otomatis begitu online kembali.',
      );
    }
  }
}
