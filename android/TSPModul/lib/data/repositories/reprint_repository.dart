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

  Future<String> saveBatchReprint(List<ReprintLabel> labels) async {
    final res = await _api.call('saveBatchReprint', {'labels': labels.map((l) => l.toJson()).toList()});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal merekam reprint.');
    }
    return res['message'] as String? ?? 'Label berhasil direkam.';
  }

  /// [force] cuma dihormati server untuk role spv -- lihat deleteReprintBarcode_() di
  /// Active/BarcodeService.js. Barcode anak yang sudah punya checkpoint operator ditolak
  /// dengan `blocked: true`; kalau server menandai `requiresForce`, pemanggil boleh
  /// menawarkan konfirmasi kedua lalu memanggil ulang dengan force: true.
  Future<String> deleteReprintBarcode(String barcodeAnak, {bool force = false}) async {
    final res = await _api.call('deleteReprintBarcode', {'barcodeAnak': barcodeAnak, 'force': force});
    if (res['success'] != true) {
      final message = res['message'] as String? ?? 'Gagal menghapus barcode reprint.';
      if (res['blocked'] == true) {
        throw ReprintDeleteBlockedException(message, requiresForce: res['requiresForce'] == true);
      }
      throw ApiException(message);
    }
    return res['message'] as String? ?? 'Barcode berhasil dihapus.';
  }
}

/// Penghapusan ditolak karena barcode anak sudah punya checkpoint di lantai produksi.
class ReprintDeleteBlockedException extends ApiException {
  final bool requiresForce;
  ReprintDeleteBlockedException(super.message, {required this.requiresForce});
}
