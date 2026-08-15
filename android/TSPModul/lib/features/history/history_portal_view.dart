import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/history_models.dart';

/// Laporan produksi per jam (mirror computePortalHistory_ / "Download Format
/// Portal (CSV)" di web app). Tabelnya lebar (kolom per jam), jadi ditampilkan
/// scroll horizontal -- pola wajar untuk laporan padat seperti ini, sama
/// seperti versi web yang juga berupa tabel lebar.
class HistoryPortalView extends ConsumerWidget {
  final String mesin;
  final String dateStr;
  final String shiftNum;

  const HistoryPortalView({super.key, required this.mesin, required this.dateStr, required this.shiftNum});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(historyRepositoryProvider);
    return FutureBuilder<PortalHistoryData>(
      future: repo.getPortalHistory(mesinCode: mesin, dateStr: dateStr, shiftNum: shiftNum),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Gagal memuat riwayat portal: ${snapshot.error}'));
        }
        final data = snapshot.data!;
        if (data.rows.isEmpty) {
          return const Center(child: Text('Tidak ada data untuk mesin/tanggal/shift ini.'));
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.all(12),
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 16,
            columns: [
              const DataColumn(label: Text('Material')),
              const DataColumn(label: Text('Stk Awal'), numeric: true),
              const DataColumn(label: Text('Masuk'), numeric: true),
              const DataColumn(label: Text('Retur'), numeric: true),
              for (final h in data.hoursHeader) DataColumn(label: Text(h.toString().padLeft(2, '0')), numeric: true),
              const DataColumn(label: Text('Tot. Prod'), numeric: true),
              const DataColumn(label: Text('Sisa'), numeric: true),
            ],
            rows: data.rows
                .map((row) => DataRow(cells: [
                      DataCell(Text(row.materialName)),
                      DataCell(Text('${row.stkAwal}')),
                      DataCell(Text('${row.masuk}')),
                      DataCell(Text('${row.retur}')),
                      for (final h in data.hoursHeader) DataCell(Text('${row.hourly[h.toString()] ?? 0}')),
                      DataCell(Text('${row.totProd}', style: const TextStyle(fontWeight: FontWeight.bold))),
                      DataCell(Text('${row.sisa}')),
                    ]))
                .toList(),
          ),
        );
      },
    );
  }
}
