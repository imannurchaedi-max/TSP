import '../../core/api_client.dart';
import '../models/stock_models.dart';

class StockRepository {
  final ApiClient _api;
  StockRepository(this._api);

  Future<T> _call<T>(String action, Map<String, dynamic> body, T Function(Map<String, dynamic>) parse) async {
    final res = await _api.call(action, body);
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat data ($action).');
    }
    return parse(res['data'] as Map<String, dynamic>);
  }

  Future<List<T>> _callList<T>(String action, Map<String, dynamic> body, T Function(Map<String, dynamic>) parse) async {
    final res = await _api.call(action, body);
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal memuat data ($action).');
    }
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => parse(e as Map<String, dynamic>)).toList();
  }

  Future<TspStockData> getTspStock() => _call('getTspStock', const {}, TspStockData.fromJson);

  Future<MesinStockData> getMesinStock(String mesinCode) =>
      _call('getMesinStock', {'mesinCode': mesinCode}, MesinStockData.fromJson);

  Future<MesinMonitoringData> getMesinMonitoring() =>
      _call('getTspMesinMonitoring', const {}, MesinMonitoringData.fromJson);

  Future<List<TransactionRow>> getShiftReceipts() =>
      _callList('getShiftReceipts', const {}, TransactionRow.fromJson);

  Future<List<TransactionRow>> getShiftDispatches() =>
      _callList('getShiftDispatches', const {}, TransactionRow.fromJson);

  Future<List<TransactionRow>> getOperatorReceipts(String mesin) =>
      _callList('getOperatorReceipts', {'mesin': mesin}, TransactionRow.fromJson);

  Future<List<TransactionRow>> getOperatorConsumption(String mesin) =>
      _callList('getOperatorConsumption', {'mesin': mesin}, TransactionRow.fromJson);
}
