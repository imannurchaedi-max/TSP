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

  /// Aksi resmi Admin TSP: tarik/reset Stok Awal shift aktif dari neraca akhir
  /// shift sebelumnya (aman dipanggil berkali-kali -- mirror tarikStokAwalShift_
  /// di StockService.js, "hanya memuat, tidak menghapus" kalau datanya sudah ada).
  Future<String> tarikStokAwalShift() async {
    final res = await _api.call('tarikStokAwalShift');
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menarik stok awal.');
    }
    return res['message'] as String? ?? 'Stok awal berhasil ditarik.';
  }

  /// Aksi resmi Admin TSP: kunci neraca stok shift aktif sebagai VALID setelah
  /// verifikasi fisik keliling selesai.
  Future<String> konfirmasiNeracaStokShift() async {
    final res = await _api.call('konfirmasiNeracaStokShift', {'aktualData': null});
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal mengonfirmasi neraca stok.');
    }
    return res['message'] as String? ?? 'Neraca stok berhasil dikonfirmasi.';
  }

  /// Konfirmasi/revisi 1 item material saat keliling lapangan. statusType:
  /// 'BENAR' (aktual = nilai rumus sistem apa adanya) atau 'REVISI' (aktual =
  /// hasil hitung fisik manual).
  Future<void> konfirmasiItemStokShift({
    required String mid,
    required num aktualValue,
    required String statusType,
  }) async {
    final res = await _api.call('konfirmasiItemStokShift', {
      'mid': mid,
      'aktualValue': aktualValue,
      'statusType': statusType,
    });
    if (res['success'] != true) {
      throw ApiException(res['message'] as String? ?? 'Gagal menyimpan status item.');
    }
  }
}
