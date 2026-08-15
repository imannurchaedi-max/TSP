import 'package:flutter/material.dart';

import '../../data/models/stock_models.dart';
import 'widgets/async_tab.dart';

/// List transaksi generik, dipakai utk Penerimaan Shift / Pengiriman Shift
/// (role tsp) dan Terima dari TSP / Consume (role operator) -- semuanya
/// berbagi bentuk TransactionRow yang sama.
class TransactionsTab extends StatelessWidget {
  final Future<List<TransactionRow>> Function() loader;
  final String emptyLabel;

  const TransactionsTab({super.key, required this.loader, required this.emptyLabel});

  @override
  Widget build(BuildContext context) {
    return AsyncTab<List<TransactionRow>>(
      loader: loader,
      builder: (context, rows) {
        if (rows.isEmpty) {
          return ListView(
            children: [Padding(padding: const EdgeInsets.all(32), child: Center(child: Text(emptyLabel)))],
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final row = rows[index];
            return Card(
              child: ListTile(
                leading: CircleAvatar(child: Text(row.waktu.split(':').first)),
                title: Text('${row.mid} — ${row.deskripsi}', overflow: TextOverflow.ellipsis),
                subtitle: Text(
                  [
                    row.barcode,
                    if (row.mesin != null) row.mesin!,
                    'Supplier: ${row.supplier}',
                  ].join(' · '),
                ),
                trailing: Text('${row.jumlah}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            );
          },
        );
      },
    );
  }
}
