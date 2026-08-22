num _n(dynamic v) => (v as num?) ?? 0;
String _s(dynamic v) => v as String? ?? '';

/// 1 baris material Riwayat Stock Mesin. Mirror computeHistoricalMesinStock_()
/// (Active/StockService.js) -- shape-nya beda dari MesinStockRow real-time
/// (nama field terima/consume/retur, bukan masuk/keluar).
class HistoricalMesinStockRow {
  final String mid;
  final String deskripsi;
  final String supplier;
  final String uom;
  final num stockAwal;
  final num terima;
  final num consume;
  final num retur;
  final num stockAkhir;

  const HistoricalMesinStockRow({
    required this.mid,
    required this.deskripsi,
    required this.supplier,
    required this.uom,
    required this.stockAwal,
    required this.terima,
    required this.consume,
    required this.retur,
    required this.stockAkhir,
  });

  factory HistoricalMesinStockRow.fromJson(Map<String, dynamic> json) => HistoricalMesinStockRow(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        supplier: _s(json['supplier']),
        uom: _s(json['uom']),
        stockAwal: _n(json['stockAwal']),
        terima: _n(json['terima']),
        consume: _n(json['consume']),
        retur: _n(json['retur']),
        stockAkhir: _n(json['stockAkhir']),
      );
}

class HistoricalMesinStockData {
  final String shift;
  final String date;
  final String statusNeraca;
  final String validatorNama;
  final List<HistoricalMesinStockRow> rows;

  const HistoricalMesinStockData({
    required this.shift,
    required this.date,
    required this.statusNeraca,
    required this.validatorNama,
    required this.rows,
  });

  factory HistoricalMesinStockData.fromJson(Map<String, dynamic> json) => HistoricalMesinStockData(
        shift: _s(json['shift']),
        date: _s(json['date']),
        statusNeraca: _s(json['statusNeraca']),
        validatorNama: _s(json['validatorNama']),
        rows: (json['data'] as List<dynamic>? ?? [])
            .map((e) => HistoricalMesinStockRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 1 baris material Riwayat Format Portal per jam. Mirror computePortalHistory_().
class PortalHistoryRow {
  final String materialName;
  final String supplier;
  final num stkAwal;
  final num masuk;
  final num retur;
  final num totProd;
  final num sisa;
  final Map<String, num> hourly;

  const PortalHistoryRow({
    required this.materialName,
    required this.supplier,
    required this.stkAwal,
    required this.masuk,
    required this.retur,
    required this.totProd,
    required this.sisa,
    required this.hourly,
  });

  factory PortalHistoryRow.fromJson(Map<String, dynamic> json) {
    final hourlyJson = json['hourly'] as Map<String, dynamic>? ?? {};
    return PortalHistoryRow(
      materialName: _s(json['materialName']),
      supplier: _s(json['supplier']),
      stkAwal: _n(json['stkAwal']),
      masuk: _n(json['masuk']),
      retur: _n(json['retur']),
      totProd: _n(json['totProd']),
      sisa: _n(json['sisa']),
      hourly: hourlyJson.map((key, value) => MapEntry(key, _n(value))),
    );
  }
}

class PortalHistoryData {
  final String shift;
  final String date;
  final List<int> hoursHeader;
  final List<PortalHistoryRow> rows;

  const PortalHistoryData({
    required this.shift,
    required this.date,
    required this.hoursHeader,
    required this.rows,
  });

  factory PortalHistoryData.fromJson(Map<String, dynamic> json) => PortalHistoryData(
        shift: _s(json['shift']),
        date: _s(json['date']),
        hoursHeader: (json['hoursHeader'] as List<dynamic>? ?? []).map((e) => (e as num).toInt()).toList(),
        rows: (json['data'] as List<dynamic>? ?? [])
            .map((e) => PortalHistoryRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
