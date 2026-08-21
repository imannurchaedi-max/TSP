import '../../core/api_client.dart';
import '../local/database.dart';

/// Memproses PendingScans yang berstatus 'pending', SATU PER SATU secara
/// berurutan (createdAt ascending) -- BUKAN paralel. Urutan ini wajib dijaga
/// karena state machine di BarcodeService.js menolak event lanjutan (mis.
/// kirim_mesin) kalau prasyaratnya (terima_wrm) untuk barcode yang sama belum
/// tercatat duluan di server. Kalau 1 scan gagal karena TIDAK ADA KONEKSI,
/// proses dihentikan (coba lagi di siklus berikutnya) supaya urutan tidak
/// rusak; kalau gagal karena server menolak (validasi bisnis), scan itu
/// ditandai 'failed' dan proses tetap dihentikan di situ -- scan-scan sesudahnya
/// kemungkinan besar juga akan gagal karena bergantung pada scan yang gagal ini,
/// jadi user perlu meninjau dari layar antrian sebelum retry manual.
class SyncService {
  final ApiClient _api;
  final AppDatabase _db;
  bool _isSyncing = false;

  SyncService(this._api, this._db);

  bool get isSyncing => _isSyncing;

  Future<void> syncPending() async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      final pending = await _db.getPendingInOrder();
      for (final scan in pending) {
        await _db.updateStatus(scan.localId, status: 'syncing');
        try {
          final res = await _api.call('submitScan', {
            'clientRequestId': scan.localId,
            'barcodeText': scan.barcodeText,
            'eventCode': scan.eventCode,
            'mesinCode': scan.mesinCode,
            'jumlah': scan.jumlah,
            'noReservasi': scan.noReservasi,
          });

          if (res['success'] == true) {
            await _db.updateStatus(scan.localId, status: 'synced', message: res['message'] as String?);
          } else {
            await _db.updateStatus(scan.localId, status: 'failed', message: res['message'] as String?);
            await _db.incrementRetry(scan.localId);
            break;
          }
        } on ApiException catch (e) {
          await _db.updateStatus(scan.localId, status: 'pending', message: e.message);
          break;
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  /// Dipanggil dari layar antrian saat user menekan "Coba Lagi" pada 1 item
  /// yang gagal -- kembalikan statusnya ke 'pending' supaya ikut diproses lagi
  /// pada syncPending() berikutnya (tetap di posisi urutan aslinya berdasarkan
  /// createdAt, bukan dipindah ke akhir antrian).
  Future<void> retryFailed(String localId) async {
    await _db.updateStatus(localId, status: 'pending');
    await syncPending();
  }
}
