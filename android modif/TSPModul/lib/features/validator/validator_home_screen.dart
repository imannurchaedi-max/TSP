import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/models/validator_models.dart';
import '../shell/app_bottom_nav.dart';

/// Bandingkan Penerimaan TSP (hasil scan terima_wrm) vs MB51 (data SAP) untuk
/// shift aktif. Mirror computeValidator_() -- read-only, tsp/spv only.
class ValidatorHomeScreen extends ConsumerStatefulWidget {
  const ValidatorHomeScreen({super.key});

  @override
  ConsumerState<ValidatorHomeScreen> createState() => _ValidatorHomeScreenState();
}

class _ValidatorHomeScreenState extends ConsumerState<ValidatorHomeScreen> {
  late Future<ValidatorData> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(validatorRepositoryProvider).getValidatorData();
  }

  Future<void> _reload() async {
    final next = ref.read(validatorRepositoryProvider).getValidatorData();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Validasi vs MB51')),
      body: FutureBuilder<ValidatorData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView(children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(children: [
                    const Icon(Icons.error_outline, size: 40, color: Colors.red),
                    const SizedBox(height: 12),
                    Text('Gagal memuat data: ${snapshot.error}', textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    OutlinedButton(onPressed: _reload, child: const Text('Coba Lagi')),
                  ]),
                ),
              ]),
            );
          }

          final data = snapshot.data!;
          final selisihCount = data.rows.where((r) => r.status != 'OK').length;

          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Card(
                  color: selisihCount > 0 ? Colors.orange.shade50 : Colors.green.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Icon(
                          selisihCount > 0 ? Icons.warning_amber : Icons.check_circle,
                          color: selisihCount > 0 ? Colors.orange : Colors.green,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            selisihCount > 0
                                ? '$selisihCount material selisih dengan MB51 · Shift ${data.shift}'
                                : 'Semua penerimaan sesuai dengan MB51 · Shift ${data.shift}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                if (data.rows.isEmpty)
                  const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Belum ada data untuk shift ini.'))),
                for (final row in data.rows) _ValidatorRowCard(row: row),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: AppBottomNav(currentRoute: '/validator', items: navItemsForRole(user?.role)),
    );
  }
}

class _ValidatorRowCard extends StatelessWidget {
  final ValidatorRow row;
  const _ValidatorRowCard({required this.row});

  @override
  Widget build(BuildContext context) {
    final isOk = row.status == 'OK';
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isOk ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(row.status,
                      style: TextStyle(
                          color: isOk ? Colors.green.shade800 : Colors.red.shade800,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Supplier: ${row.supplier}', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 12,
              children: [
                Text('Masuk (Scan): ${row.masukScan}', style: const TextStyle(fontSize: 12)),
                Text('Masuk (MB51): ${row.masukMb51}', style: const TextStyle(fontSize: 12)),
                Text('Selisih: ${row.selisih}',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isOk ? Colors.green.shade700 : Colors.red.shade700)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
