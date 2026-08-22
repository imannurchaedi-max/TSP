import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../core/providers.dart';

class SyncQueueScreen extends ConsumerWidget {
  const SyncQueueScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case 'synced':
        return Colors.green;
      case 'failed':
        return Colors.red;
      case 'syncing':
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'synced':
        return 'Tersinkron';
      case 'failed':
        return 'Gagal';
      case 'syncing':
        return 'Mengirim...';
      default:
        return 'Menunggu';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queueAsync = ref.watch(pendingQueueProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Antrian Sinkronisasi'),
        actions: [
          IconButton(
            tooltip: 'Sinkronkan Sekarang',
            icon: const Icon(Icons.sync),
            onPressed: () => ref.read(syncServiceProvider).syncPending(),
          ),
        ],
      ),
      body: queueAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Gagal memuat antrian: $e')),
        data: (rows) {
          if (rows.isEmpty) {
            return const Center(child: Text('Tidak ada scan yang mengantre. Semua sudah tersinkron.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: rows.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final row = rows[index];
              final eventLabel = kScanEvents[row.eventCode]?.label ?? row.eventCode;
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _statusColor(row.syncStatus).withValues(alpha: 0.15),
                    child: Icon(Icons.qr_code, color: _statusColor(row.syncStatus)),
                  ),
                  title: Text(row.barcodeText, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(eventLabel),
                      Text(
                        _statusLabel(row.syncStatus),
                        style: TextStyle(color: _statusColor(row.syncStatus), fontWeight: FontWeight.w600),
                      ),
                      if (row.serverMessage != null && row.syncStatus == 'failed')
                        Text(row.serverMessage!, style: const TextStyle(fontSize: 12, color: Colors.red)),
                    ],
                  ),
                  isThreeLine: row.syncStatus == 'failed' && row.serverMessage != null,
                  trailing: row.syncStatus == 'failed'
                      ? IconButton(
                          tooltip: 'Coba Lagi',
                          icon: const Icon(Icons.refresh),
                          onPressed: () => ref.read(syncServiceProvider).retryFailed(row.localId),
                        )
                      : null,
                ),
              );
            },
          );
        },
      ),
    );
  }
}
