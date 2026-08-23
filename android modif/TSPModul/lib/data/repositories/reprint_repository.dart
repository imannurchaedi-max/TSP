import '../../core/api_client.dart';
import '../models/reprint_models.dart';

class ReprintRepository {
  final ApiClient _api;
  ReprintRepository(this._api);

  Future<ReprintSearchResult> getReprintData(String query) async {
    final res = await _api.call('getReprintData', {'query': query});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Kode Induk tidak ditemukan.');
    }
    return ReprintSearchResult.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<List<ReprintLabel>> saveBatchReprint(List<ReprintRequest> requests) async {
    final res = await _api.call('saveBatchReprint', {'labels': requests.map((request) => request.toJson()).toList()});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal merekam reprint.');
    }
    final data = res['data'] as Map<String, dynamic>? ?? const {};
    final saved = data['labels'] as List<dynamic>? ?? const [];
    if (saved.isEmpty) throw ApiException('Server tidak mengembalikan label yang dialokasikan.');
    return saved.map((e) => ReprintLabel.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Hapus 1 barcode anak. Server menolak barcode yang sudah punya checkpoint operator dengan
  /// respons terstruktur { blocked: true, requiresForce } -- khusus role spv, penolakan itu bisa
  /// di-override dengan force: true (lihat deleteReprintBarcode_ di Active/BarcodeService.js dan
  /// _runDeleteReprint di Index.html). Sebelum ini repository hanya mengirim barcodeAnak, jadi
  /// SPV di Android tidak pernah bisa menjalankan koreksi yang sebenarnya didukung server.
  Future<ReprintDeleteResult> deleteReprintBarcode(String barcodeAnak, {bool force = false}) async {
    final res = await _api.call('deleteReprintBarcode', {
      'barcodeAnak': barcodeAnak,
      'force': force,
    });

    if (res['success'] == true) {
      return ReprintDeleteResult(
        success: true,
        message: res['message'] as String? ?? 'Barcode berhasil dihapus.',
        forced: res['forced'] == true,
      );
    }

    // Penolakan karena checkpoint -> dikembalikan sebagai hasil, bukan exception, supaya UI bisa
    // menawarkan hapus paksa ke SPV. Kegagalan lain tetap dilempar sebagai error biasa.
    if (res['blocked'] == true) {
      return ReprintDeleteResult(
        success: false,
        blocked: true,
        requiresForce: res['requiresForce'] == true,
        message: res['message'] as String? ?? 'Barcode sudah dipakai di produksi.',
        blockingColumns: (res['blockingColumns'] as List<dynamic>? ?? const [])
            .map((e) => e.toString())
            .toList(),
      );
    }

    throw ApiException(res['message'] as String? ?? 'Gagal menghapus barcode reprint.');
  }
}

/// Hasil hapus barcode reprint, mirror { success, blocked, requiresForce, blockingColumns,
/// message, forced } yang dikembalikan deleteReprintBarcode_() di Active/BarcodeService.js.
class ReprintDeleteResult {
  final bool success;
  final bool blocked;
  final bool requiresForce;
  final bool forced;
  final String message;
  final List<String> blockingColumns;

  const ReprintDeleteResult({
    required this.success,
    required this.message,
    this.blocked = false,
    this.requiresForce = false,
    this.forced = false,
    this.blockingColumns = const [],
  });
}
