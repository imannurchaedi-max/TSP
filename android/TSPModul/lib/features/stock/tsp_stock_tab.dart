import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/stock_models.dart';
import 'widgets/async_tab.dart';

class TspStockTab extends ConsumerWidget {
  const TspStockTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(stockRepositoryProvider);
    return AsyncTab<TspStockData>(
      loader: repo.getTspStock,
      builder: (context, data) => _TspStockList(data: data),
    );
  }
}

class _TspStockList extends StatelessWidget {
  final TspStockData data;
  const _TspStockList({required this.data});

  Color _neracaColor() {
    switch (data.statusNeraca) {
      case 'VALID':
        return Colors.green;
      case 'BELUM_DIKONFIRMASI':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          color: _neracaColor().withValues(alpha: 0.08),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Icons.fact_check, color: _neracaColor()),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${data.date} · Shift ${data.shift}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('Status Neraca: ${data.statusNeraca}',
                          style: TextStyle(color: _neracaColor(), fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (data.rows.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('Belum ada data stok.')),
        for (final row in data.rows) _StockRowCard(row: row),
      ],
    );
  }
}

class _StockRowCard extends StatelessWidget {
  final TspStockRow row;
  const _StockRowCard({required this.row});

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
            const SizedBox(height: 4),
            Text('Supplier: ${row.supplier}', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                _Metric(label: 'Awal', value: row.stockAwal),
                _Metric(label: 'Masuk', value: row.masuk),
                _Metric(label: 'Keluar', value: row.keluar),
                _Metric(label: 'Retur Masuk', value: row.returIn),
                _Metric(label: 'Retur Keluar', value: row.returOut),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final num value;
  const _Metric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: '$label: ', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          TextSpan(text: '$value', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
