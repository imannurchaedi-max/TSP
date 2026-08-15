import '../../core/api_client.dart';
import '../models/material_models.dart';

class MaterialRepository {
  final ApiClient _api;
  MaterialRepository(this._api);

  Future<List<MaterialItem>> getMaterialList() async {
    final res = await _api.call('getMaterialList');
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat Material List.');
    }
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => MaterialItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> saveMaterial({
    required String mid,
    required String deskripsi,
    required String uom,
    required String supplier,
    required String status,
  }) async {
    final res = await _api.call('saveMaterial', {
      'mid': mid,
      'deskripsi': deskripsi,
      'uom': uom,
      'supplier': supplier,
      'status': status,
    });
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menyimpan material.');
    }
    return res['message'] as String? ?? 'Material berhasil disimpan.';
  }

  Future<String> saveMaterialBatch(List<Map<String, dynamic>> items) async {
    final res = await _api.call('saveMaterialBatch', {'items': items});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal mengimpor batch material.');
    }
    return res['message'] as String? ?? 'Batch material berhasil diimpor.';
  }

  Future<String> deleteMaterial(String mid) async {
    final res = await _api.call('deleteMaterial', {'mid': mid});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menghapus material.');
    }
    return res['message'] as String? ?? 'Material berhasil dihapus.';
  }

  Future<List<MinMaxItem>> getMinMaxSettings() async {
    final res = await _api.call('getMinMaxSettings');
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat Min/Max Stock.');
    }
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => MinMaxItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> saveMinMaxSetting({
    required String mid,
    required String lokasi,
    required num minStock,
    required num maxStock,
  }) async {
    final res = await _api.call('saveMinMaxSetting', {
      'mid': mid,
      'lokasi': lokasi,
      'minStock': minStock,
      'maxStock': maxStock,
    });
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menyimpan Min/Max.');
    }
    return res['message'] as String? ?? 'Min/Max berhasil disimpan.';
  }

  Future<String> saveMinMaxBatch(List<Map<String, dynamic>> items) async {
    final res = await _api.call('saveMinMaxBatch', {'items': items});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal mengimpor batch Min/Max.');
    }
    return res['message'] as String? ?? 'Batch Min/Max berhasil diimpor.';
  }

  Future<String> deleteMinMaxSetting({required String mid, required String lokasi}) async {
    final res = await _api.call('deleteMinMaxSetting', {'mid': mid, 'lokasi': lokasi});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menghapus Min/Max.');
    }
    return res['message'] as String? ?? 'Min/Max berhasil dihapus.';
  }
}
