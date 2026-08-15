import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/providers.dart';
import 'scan_flow_state.dart';

class ScanHomeScreen extends ConsumerWidget {
  const ScanHomeScreen({super.key});

  void _selectEvent(BuildContext context, WidgetRef ref, ScanEventDef event) {
    ref.read(scanFlowProvider.notifier).state = ScanFlowState(event: event);
    final needsFields = event.requiresMesin || event.requiresJumlah || event.requiresReservasi;
    context.push(needsFields ? '/scan/fields' : '/scan/camera');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final events = user == null ? const <ScanEventDef>[] : scanEventsForRole(user.role);
    final pendingQueue = ref.watch(pendingQueueProvider);
    final pendingCount = pendingQueue.maybeWhen(
      data: (rows) => rows.where((r) => r.syncStatus == 'pending' || r.syncStatus == 'failed').length,
      orElse: () => 0,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('TSP Modul'),
        actions: [
          IconButton(
            tooltip: 'Antrian Sinkronisasi',
            icon: Badge(
              label: Text('$pendingCount'),
              isLabelVisible: pendingCount > 0,
              child: const Icon(Icons.sync),
            ),
            onPressed: () => context.push('/sync'),
          ),
          IconButton(
            tooltip: 'Keluar',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authRepositoryProvider).logout();
              ref.read(currentUserProvider.notifier).state = null;
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user?.nama ?? '-', style: Theme.of(context).textTheme.titleMedium),
                Text('${user?.nik ?? '-'} · ${user?.jabatan ?? '-'}',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Expanded(
            child: events.isEmpty
                ? const Center(child: Text('Tidak ada aksi scan untuk role Anda.'))
                : GridView.count(
                    padding: const EdgeInsets.all(16),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.1,
                    children: events
                        .map((event) => _EventCard(event: event, onTap: () => _selectEvent(context, ref, event)))
                        .toList(),
                  ),
          ),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final ScanEventDef event;
  final VoidCallback onTap;

  const _EventCard({required this.event, required this.onTap});

  IconData get _icon {
    switch (event.code) {
      case 'terima_wrm':
        return Icons.move_to_inbox;
      case 'kirim_mesin':
        return Icons.local_shipping;
      case 'terima_operator':
        return Icons.download_done;
      case 'consume_operator':
        return Icons.remove_circle_outline;
      case 'retur_dari_mesin':
        return Icons.undo;
      case 'retur_ke_wrm':
        return Icons.assignment_return;
      default:
        return Icons.qr_code_scanner;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_icon, size: 36, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                event.label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
