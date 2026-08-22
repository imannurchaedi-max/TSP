num _n(dynamic v) => (v as num?) ?? 0;
String _s(dynamic v) => v as String? ?? '';

/// 1 baris material di dashboard Stock TSP. Mirror shape hasil computeTspStock_()
/// (Active/StockService.js).
class TspStockRow {
  final String mid;
  final String deskripsi;
  final String supplier;
  final String uom;
  final num stockAwal;
  final num masuk;
  final num keluar;
  final num returIn;
  final num returOut;
  final num rumus;
  final num stockAkhir;
  final String statusItem;

  const TspStockRow({
    required this.mid,
    required this.deskripsi,
    required this.supplier,
    required this.uom,
    required this.stockAwal,
    required this.masuk,
    required this.keluar,
    required this.returIn,
    required this.returOut,
    required this.rumus,
    required this.stockAkhir,
    required this.statusItem,
  });

  factory TspStockRow.fromJson(Map<String, dynamic> json) => TspStockRow(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        supplier: _s(json['supplier']),
        uom: _s(json['uom']),
        stockAwal: _n(json['stockAwal']),
        masuk: _n(json['masuk']),
        keluar: _n(json['keluar']),
        returIn: _n(json['returIn']),
        returOut: _n(json['returOut']),
        rumus: _n(json['rumus']),
        stockAkhir: _n(json['stockAkhir']),
        statusItem: _s(json['statusItem']),
      );
}

class TspStockData {
  final String shift;
  final String date;
  final String statusNeraca;
  final String validatorNama;
  final List<TspStockRow> rows;

  const TspStockData({
    required this.shift,
    required this.date,
    required this.statusNeraca,
    required this.validatorNama,
    required this.rows,
  });

  factory TspStockData.fromJson(Map<String, dynamic> json) => TspStockData(
        shift: _s(json['shift']),
        date: _s(json['date']),
        statusNeraca: _s(json['statusNeraca']),
        validatorNama: _s(json['validatorNama']),
        rows: (json['rows'] as List<dynamic>? ?? [])
            .map((e) => TspStockRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 1 baris material di dashboard Stock Mesin. Mirror computeMesinStock_().
class MesinStockRow {
  final String mid;
  final String deskripsi;
  final String supplier;
  final String uom;
  final num stockAwal;
  final num masuk;
  final num keluar;
  final num stockAkhir;

  const MesinStockRow({
    required this.mid,
    required this.deskripsi,
    required this.supplier,
    required this.uom,
    required this.stockAwal,
    required this.masuk,
    required this.keluar,
    required this.stockAkhir,
  });

  factory MesinStockRow.fromJson(Map<String, dynamic> json) => MesinStockRow(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        supplier: _s(json['supplier']),
        uom: _s(json['uom']),
        stockAwal: _n(json['stockAwal']),
        masuk: _n(json['masuk']),
        keluar: _n(json['keluar']),
        stockAkhir: _n(json['stockAkhir']),
      );
}

class MesinStockData {
  final String shift;
  final String date;
  final List<MesinStockRow> rows;

  const MesinStockData({required this.shift, required this.date, required this.rows});

  factory MesinStockData.fromJson(Map<String, dynamic> json) => MesinStockData(
        shift: _s(json['shift']),
        date: _s(json['date']),
        rows: (json['rows'] as List<dynamic>? ?? [])
            .map((e) => MesinStockRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 1 item material dalam ringkasan monitoring per mesin. Mirror computeTspMesinMonitoring_().
class MonitoringItem {
  final String mid;
  final String deskripsi;
  final String uom;
  final num stockAkhir;
  final String status; // NORMAL | LOW | CRITICAL
  final String statusText;

  const MonitoringItem({
    required this.mid,
    required this.deskripsi,
    required this.uom,
    required this.stockAkhir,
    required this.status,
    required this.statusText,
  });

  factory MonitoringItem.fromJson(Map<String, dynamic> json) => MonitoringItem(
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        uom: _s(json['uom']),
        stockAkhir: _n(json['stockAkhir']),
        status: _s(json['status']),
        statusText: _s(json['statusText']),
      );
}

class MachineSummary {
  final String name;
  final int totalActive;
  final int lowCount;
  final int criticalCount;
  final List<MonitoringItem> items;

  const MachineSummary({
    required this.name,
    required this.totalActive,
    required this.lowCount,
    required this.criticalCount,
    required this.items,
  });

  factory MachineSummary.fromJson(Map<String, dynamic> json) => MachineSummary(
        name: _s(json['name']),
        totalActive: _n(json['totalActive']).toInt(),
        lowCount: _n(json['lowCount']).toInt(),
        criticalCount: _n(json['criticalCount']).toInt(),
        items: (json['items'] as List<dynamic>? ?? [])
            .map((e) => MonitoringItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 1 item kebutuhan suplai di monitoring mesin. Mirror elemen array `alerts`
/// yang dikirim computeTspMesinMonitoring_() (Active/StockService.js).
class MonitoringAlert {
  final String mesin;
  final String mid;
  final String deskripsi;
  final String uom;
  final num stockAkhir;
  final String status; // LOW | CRITICAL
  final String statusText;

  const MonitoringAlert({
    required this.mesin,
    required this.mid,
    required this.deskripsi,
    required this.uom,
    required this.stockAkhir,
    required this.status,
    required this.statusText,
  });

  factory MonitoringAlert.fromJson(Map<String, dynamic> json) => MonitoringAlert(
        mesin: _s(json['mesin']),
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        uom: _s(json['uom']),
        stockAkhir: _n(json['stockAkhir']),
        status: _s(json['status']),
        statusText: _s(json['statusText']),
      );
}

class MesinMonitoringData {
  final String shift;
  final String date;
  final int totalAlerts;
  final List<MonitoringAlert> alerts;
  final List<MachineSummary> machines;

  const MesinMonitoringData({
    required this.shift,
    required this.date,
    required this.totalAlerts,
    required this.alerts,
    required this.machines,
  });

  factory MesinMonitoringData.fromJson(Map<String, dynamic> json) => MesinMonitoringData(
        shift: _s(json['shift']),
        date: _s(json['date']),
        totalAlerts: _n(json['totalAlerts']).toInt(),
        alerts: (json['alerts'] as List<dynamic>? ?? [])
            .map((e) => MonitoringAlert.fromJson(e as Map<String, dynamic>))
            .toList(),
        machines: (json['machines'] as List<dynamic>? ?? [])
            .map((e) => MachineSummary.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// 1 baris transaksi shift (Penerimaan/Pengiriman TSP, atau Terima/Consume Operator).
/// Mirror computeShiftReceipts_/computeShiftDispatches_/computeOperatorReceipts_/
/// computeOperatorConsumption_ -- semuanya berbagi bentuk yang sama, `mesin` cuma
/// terisi untuk shift dispatches.
class TransactionRow {
  final String waktu;
  final String barcode;
  final String? mesin;
  final String mid;
  final String supplier;
  final String deskripsi;
  final num jumlah;

  const TransactionRow({
    required this.waktu,
    required this.barcode,
    this.mesin,
    required this.mid,
    required this.supplier,
    required this.deskripsi,
    required this.jumlah,
  });

  factory TransactionRow.fromJson(Map<String, dynamic> json) => TransactionRow(
        waktu: _s(json['waktu']),
        barcode: _s(json['barcode']),
        mesin: json['mesin'] as String?,
        mid: _s(json['mid']),
        supplier: _s(json['supplier']),
        deskripsi: _s(json['deskripsi']),
        jumlah: _n(json['jumlah']),
      );
}

