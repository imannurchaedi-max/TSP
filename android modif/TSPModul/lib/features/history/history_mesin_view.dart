import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/history_models.dart';

class HistoryMesinView extends ConsumerWidget {
  final String mesin;
  final String dateStr;
  final String shiftNum;

  const HistoryMesinView({super.key, required this.mesin, required this.dateStr, required this.shiftNum});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(historyRepositoryProvider);
    return FutureBuilder<HistoricalMesinStockData>(
      future: repo.getHistoricalMesinStock(mesinCode: mesin, dateStr: dateStr, shiftNum: shiftNum),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Gagal memuat riwayat: ${snapshot.error}'));
        }
        final data = snapshot.data!;
        if (data.rows.isEmpty) {
          return const Center(child: Text('Tidak ada data untuk mesin/tanggal/shift ini.'));
        }
        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$mesin · ${data.date} · Shift ${data.shift}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('Operator: ${data.validatorNama}', style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            for (final row in data.rows)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text('${row.mid} — ${row.deskripsi}'),
                  subtitle: Text(
                    'Awal: ${row.stockAwal} · Terima: ${row.terima} · Consume: ${row.consume} · Retur: ${row.retur}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: Text('${row.stockAkhir} ${row.uom}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
          ],
        );
      },
    );
  }
}
