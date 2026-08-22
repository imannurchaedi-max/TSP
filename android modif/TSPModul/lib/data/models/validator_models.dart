num _n(dynamic v) => (v as num?) ?? 0;
String _s(dynamic v) => v as String? ?? '';

/// 1 baris perbandingan Penerimaan TSP (hasil scan) vs MB51 (SAP). Mirror
/// computeValidator_() (Active/StockService.js).
class ValidatorRow {
  final String mid;
  final String supplier;
  final String deskripsi;
  final num masukScan;
  final num masukMb51;
  final num selisih;
  final String status; // OK | SELISIH

  const ValidatorRow({
    required this.mid,
    required this.supplier,
    required this.deskripsi,
    required this.masukScan,
    required this.masukMb51,
    required this.selisih,
    required this.status,
  });

  factory ValidatorRow.fromJson(Map<String, dynamic> json) => ValidatorRow(
        mid: _s(json['mid']),
        supplier: _s(json['supplier']),
        deskripsi: _s(json['deskripsi']),
        masukScan: _n(json['masukScan']),
        masukMb51: _n(json['masukMb51']),
        selisih: _n(json['selisih']),
        status: _s(json['status']),
      );
}

class ValidatorData {
  final String shift;
  final List<ValidatorRow> rows;

  const ValidatorData({required this.shift, required this.rows});

  factory ValidatorData.fromJson(Map<String, dynamic> json) => ValidatorData(
        shift: _s(json['shift']),
        rows: (json['rows'] as List<dynamic>? ?? [])
            .map((e) => ValidatorRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
