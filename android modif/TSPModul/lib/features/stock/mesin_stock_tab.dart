import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/stock_models.dart';
import 'widgets/async_tab.dart';

class MesinStockTab extends ConsumerWidget {
  final String mesin;
  const MesinStockTab({super.key, required this.mesin});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(stockRepositoryProvider);
    return AsyncTab<MesinStockData>(
      loader: () => repo.getMesinStock(mesin),
      builder: (context, data) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text('$mesin · ${data.date} · Shift ${data.shift}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 8),
          if (data.rows.isEmpty)
            const Padding(padding: EdgeInsets.all(24), child: Text('Belum ada data stok untuk mesin ini.')),
          for (final row in data.rows) _MesinRowCard(row: row),
        ],
      ),
    );
  }
}

class _MesinRowCard extends StatelessWidget {
  final MesinStockRow row;
  const _MesinRowCard({required this.row});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('${row.mid} — ${row.deskripsi}',
                      style: const TextStyle(fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                ),
                Text('${row.stockAkhir} ${row.uom}',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
              ],
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              children: [
                Text('Awal: ${row.stockAwal}', style: const TextStyle(fontSize: 12)),
                Text('Masuk: ${row.masuk}', style: const TextStyle(fontSize: 12)),
                Text('Keluar: ${row.keluar}', style: const TextStyle(fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
