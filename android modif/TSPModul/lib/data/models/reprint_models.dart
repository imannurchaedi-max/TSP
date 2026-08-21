num _n(dynamic v) => (v as num?) ?? 0;
String _s(dynamic v) => v as String? ?? '';

/// 1 baris histori reprint (Kode Anak) utk 1 Kode Induk. Mirror getReprintData_()
/// (Active/BarcodeService.js).
class ReprintHistoryRow {
  final String barcodeInduk;
  final String barcodeAnak;
  final String mid;
  final String deskripsi;
  final num jumlah;
  final String tanggal;
  final String shift;

  const ReprintHistoryRow({
    required this.barcodeInduk,
    required this.barcodeAnak,
    required this.mid,
    required this.deskripsi,
    required this.jumlah,
    required this.tanggal,
    required this.shift,
  });

  factory ReprintHistoryRow.fromJson(Map<String, dynamic> json) => ReprintHistoryRow(
        barcodeInduk: _s(json['barcodeInduk']),
        barcodeAnak: _s(json['barcodeAnak']),
        mid: _s(json['mid']),
        deskripsi: _s(json['deskripsi']),
        jumlah: _n(json['jumlah']),
        tanggal: _s(json['tanggal']),
        shift: _s(json['shift']),
      );
}

class ReprintSearchResult {
  final List<ReprintHistoryRow> history;
  final num parentQty;

  const ReprintSearchResult({required this.history, required this.parentQty});

  factory ReprintSearchResult.fromJson(Map<String, dynamic> json) => ReprintSearchResult(
        history: (json['history'] as List<dynamic>? ?? [])
            .map((e) => ReprintHistoryRow.fromJson(e as Map<String, dynamic>))
            .toList(),
        parentQty: _n(json['parentQty']),
      );
}

/// 1 label yang akan disimpan (saveBatchReprint) & dicetak. Dibentuk client-side
/// mirip generateReprintLabels() di Index.html.
class ReprintLabel {
  final String barcodeInduk;
  final String barcodeAnak;
  final String mid;
  final String deskripsi;
  final num jumlah;

  const ReprintLabel({
    required this.barcodeInduk,
    required this.barcodeAnak,
    required this.mid,
    required this.deskripsi,
    required this.jumlah,
  });

  Map<String, dynamic> toJson() => {
        'barcodeInduk': barcodeInduk,
        'barcodeAnak': barcodeAnak,
        'mid': mid,
        'deskripsi': deskripsi,
        'jumlah': jumlah,
      };
}
