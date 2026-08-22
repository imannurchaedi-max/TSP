import '../../core/api_client.dart';
import '../../core/session.dart';
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
  final SessionManager _session;
  bool _isSyncing = false;

  SyncService(this._api, this._db, this._session);

  bool get isSyncing => _isSyncing;

  Future<void> syncPending() async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      // Baris yang macet di 'syncing' akibat app/proses mati di tengah request
      // sebelumnya dipulihkan dulu ke 'pending' supaya tidak tertahan permanen.
      await _db.resetStuckSyncing();

      // Hanya sync antrian milik user yang SEDANG login -- antrian operator
      // lain yang belum sempat terkirim sebelum ganti sesi dibiarkan pending
      // sampai operator tsb login kembali, supaya tidak terkirim atas nama
      // user yang salah.
      final user = await _session.getUser();
      if (user == null) return;

      final pending = await _db.getPendingInOrder(nik: user.nik);
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
        } catch (e) {
          // Kegagalan tak terduga (mis. parsing/DB) -- jangan biarkan baris
          // tertahan selamanya di 'syncing', kembalikan ke 'pending' supaya
          // tetap punya jalan retry otomatis di siklus berikutnya.
          await _db.updateStatus(scan.localId, status: 'pending', message: e.toString());
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
