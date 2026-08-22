import '../../core/api_client.dart';
import '../models/history_models.dart';
import '../models/stock_models.dart';

class HistoryRepository {
  final ApiClient _api;
  HistoryRepository(this._api);

  Future<TspStockData> getHistoricalTspStock({required String dateStr, required String shiftNum}) async {
    final res = await _api.call('getHistoricalTspStock', {'dateStr': dateStr, 'shiftNum': shiftNum});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat riwayat stock TSP.');
    }
    return TspStockData.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<HistoricalMesinStockData> getHistoricalMesinStock({
    required String mesinCode,
    required String dateStr,
    required String shiftNum,
  }) async {
    final res = await _api.call(
      'getHistoricalMesinStock',
      {'mesinCode': mesinCode, 'dateStr': dateStr, 'shiftNum': shiftNum},
    );
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat riwayat stock mesin.');
    }
    return HistoricalMesinStockData.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<PortalHistoryData> getPortalHistory({
    required String mesinCode,
    required String dateStr,
    required String shiftNum,
  }) async {
    final res = await _api.call(
      'getPortalHistory',
      {'mesinCode': mesinCode, 'dateStr': dateStr, 'shiftNum': shiftNum},
    );
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat riwayat portal.');
    }
    return PortalHistoryData.fromJson(res['data'] as Map<String, dynamic>);
  }
}
