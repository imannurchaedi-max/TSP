import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/stock_models.dart';
import 'widgets/async_tab.dart';
import 'widgets/status_badge.dart';

/// Monitoring 6 mesin (BHP 1-5, AHP 1) + notifikasi low-stock. Mirror
/// computeTspMesinMonitoring_() -- dipakai role tsp/spv untuk memantau semua
/// mesin sekaligus tanpa perlu pindah-pindah dropdown.
class MonitoringTab extends ConsumerWidget {
  const MonitoringTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(stockRepositoryProvider);
    return AsyncTab<MesinMonitoringData>(
      loader: repo.getMesinMonitoring,
      builder: (context, data) => _MonitoringList(data: data),
    );
  }
}

class _MonitoringList extends StatelessWidget {
  final MesinMonitoringData data;
  const _MonitoringList({required this.data});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          color: data.totalAlerts > 0 ? Colors.red.shade50 : Colors.green.shade50,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      data.totalAlerts > 0 ? Icons.warning_amber : Icons.check_circle,
                      color: data.totalAlerts > 0 ? Colors.red : Colors.green,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        data.totalAlerts > 0
                            ? '${data.totalAlerts} material butuh perhatian di ${data.date} Â· Shift ${data.shift}'
                            : 'Semua stok mesin aman Â· ${data.date} Â· Shift ${data.shift}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if (data.alerts.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  for (final a in data.alerts) _AlertRow(alert: a),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        for (final machine in data.machines) _MachineCard(machine: machine),
      ],
    );
  }
}

class _AlertRow extends StatelessWidget {
  final MonitoringAlert alert;
  const _AlertRow({required this.alert});

  @override
  Widget build(BuildContext context) {
    final isCritical = alert.status == 'CRITICAL';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isCritical ? Icons.error : Icons.warning_amber,
            size: 16,
            color: isCritical ? Colors.red.shade700 : Colors.orange.shade800,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              '${alert.mesin} Â· ${alert.mid} â€” ${alert.deskripsi} (sisa ${alert.stockAkhir} ${alert.uom})',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: isCritical ? Colors.red.shade800 : Colors.orange.shade900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MachineCard extends StatelessWidget {
  final MachineSummary machine;
  const _MachineCard({required this.machine});

  @override
  Widget build(BuildContext context) {
    final hasAlert = machine.criticalCount + machine.lowCount > 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        initiallyExpanded: hasAlert,
        title: Text(machine.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          '${machine.totalActive} material aktif'
          '${machine.criticalCount > 0 ? ' Â· ${machine.criticalCount} kritis' : ''}'
          '${machine.lowCount > 0 ? ' Â· ${machine.lowCount} rendah' : ''}',
        ),
        leading: CircleAvatar(
          backgroundColor: hasAlert ? Colors.red.shade50 : Colors.green.shade50,
          child: Icon(Icons.precision_manufacturing, color: hasAlert ? Colors.red : Colors.green),
        ),
        children: [
          for (final item in machine.items)
            ListTile(
              dense: true,
              title: Text('${item.mid} â€” ${item.deskripsi}', style: const TextStyle(fontSize: 13)),
              subtitle: Text('${item.stockAkhir} ${item.uom}', style: const TextStyle(fontSize: 12)),
              trailing: StatusBadge(status: item.status, label: item.statusText),
            ),
        ],
      ),
    );
  }
}

