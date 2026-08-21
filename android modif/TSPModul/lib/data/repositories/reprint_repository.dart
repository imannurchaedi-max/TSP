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

  Future<String> deleteReprintBarcode(String barcodeAnak) async {
    final res = await _api.call('deleteReprintBarcode', {'barcodeAnak': barcodeAnak});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menghapus barcode reprint.');
    }
    return res['message'] as String? ?? 'Barcode berhasil dihapus.';
  }
}
