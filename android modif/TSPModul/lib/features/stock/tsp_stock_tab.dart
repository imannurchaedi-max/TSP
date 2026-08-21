import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../data/models/stock_models.dart';

class TspStockTab extends ConsumerStatefulWidget {
  const TspStockTab({super.key});

  @override
  ConsumerState<TspStockTab> createState() => _TspStockTabState();
}

class _TspStockTabState extends ConsumerState<TspStockTab> with AutomaticKeepAliveClientMixin {
  late Future<TspStockData> _future;
  bool _actionInProgress = false;

  final _searchController = TextEditingController();
  String _search = '';
  String _sort = '';

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _future = ref.read(stockRepositoryProvider).getTspStock();
    _searchController.addListener(() => setState(() => _search = _searchController.text));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final next = ref.read(stockRepositoryProvider).getTspStock();
    setState(() => _future = next);
    await next;
  }

  Future<void> _runAction(Future<void> Function() action) async {
    if (_actionInProgress) return;
    setState(() => _actionInProgress = true);
    try {
      await action();
      await _reload();
    } on ApiException catch (e) {
      if (mounted) _showError(e.message);
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
  }

  Future<bool> _confirm(String title, String message) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Ya, Lanjutkan')),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _tarikStokAwal() async {
    final repo = ref.read(stockRepositoryProvider);
    final ok = await _confirm(
      'Konfirmasi Tarik Stok Awal',
      'Sistem akan menarik/memuat Stok Awal untuk shift ini dari neraca akhir shift sebelumnya '
          '(kalau sudah ada, hanya dimuat ulang, tidak dihapus).',
    );
    if (!ok) return;
    await _runAction(() async {
      final message = await repo.tarikStokAwalShift();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    });
  }

  Future<void> _konfirmasiNeraca() async {
    final repo = ref.read(stockRepositoryProvider);
    final ok = await _confirm(
      'Validasi Neraca Stok',
      'Pastikan Anda sudah selesai keliling pemeriksaan fisik. Setelah dikonfirmasi, '
          'neraca stok shift ini akan resmi dikunci.',
    );
    if (!ok) return;
    await _runAction(() async {
      final message = await repo.konfirmasiNeracaStokShift();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    });
  }

  Future<void> _konfirmasiItemBenar(TspStockRow row) async {
    final repo = ref.read(stockRepositoryProvider);
    final ok = await _confirm(
      'Verifikasi Stok Sesuai',
      '${row.deskripsi}\nStok Sistem: ${row.rumus}\n\nApakah hasil pengecekan fisik sudah sesuai?',
    );
    if (!ok) return;
    await _runAction(() => repo.konfirmasiItemStokShift(mid: row.mid, aktualValue: row.rumus, statusType: 'BENAR'));
  }

  Future<void> _konfirmasiItemRevisi(TspStockRow row) async {
    final repo = ref.read(stockRepositoryProvider);
    final controller = TextEditingController(text: row.rumus.toString());
    final value = await showDialog<num>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revisi Stok Aktual'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${row.deskripsi}\n(Stok Rumus Sistem: ${row.rumus})'),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Jumlah Stok Aktual', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              final parsed = num.tryParse(controller.text.trim());
              Navigator.of(context).pop(parsed);
            },
            child: const Text('Simpan Revisi'),
          ),
        ],
      ),
    );
    if (value == null) return;
    await _runAction(() => repo.konfirmasiItemStokShift(mid: row.mid, aktualValue: value, statusType: 'REVISI'));
  }

  List<TspStockRow> _applySearchAndSort(List<TspStockRow> rows) {
    var result = rows;
    final query = _search.trim().toLowerCase();
    if (query.isNotEmpty) {
      result = result
          .where((r) =>
              r.mid.toLowerCase().contains(query) ||
              r.deskripsi.toLowerCase().contains(query) ||
              r.supplier.toLowerCase().contains(query))
          .toList();
    }
    switch (_sort) {
      case 'mid_asc':
        result = [...result]..sort((a, b) => a.mid.compareTo(b.mid));
        break;
      case 'mid_desc':
        result = [...result]..sort((a, b) => b.mid.compareTo(a.mid));
        break;
      case 'supplier_asc':
        result = [...result]..sort((a, b) => a.supplier.compareTo(b.supplier));
        break;
      case 'supplier_desc':
        result = [...result]..sort((a, b) => b.supplier.compareTo(a.supplier));
        break;
      case 'material_asc':
        result = [...result]..sort((a, b) => a.deskripsi.compareTo(b.deskripsi));
        break;
      case 'material_desc':
        result = [...result]..sort((a, b) => b.deskripsi.compareTo(a.deskripsi));
        break;
      default:
        break;
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final isTsp = ref.watch(currentUserProvider)?.role == 'tsp';

    return FutureBuilder<TspStockData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.error_outline, size: 40, color: Colors.red),
                      const SizedBox(height: 12),
                      Text('Gagal memuat data: ${snapshot.error}', textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _reload, child: const Text('Coba Lagi')),
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        final data = snapshot.data!;
        final rows = _applySearchAndSort(data.rows);
        return RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              _NeracaBanner(
                data: data,
                canAct: isTsp && !_actionInProgress,
                onTarikStokAwal: _tarikStokAwal,
                onKonfirmasiNeraca: _konfirmasiNeraca,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Cari MID / Supplier / Material...',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _sort,
                decoration: const InputDecoration(
                  labelText: 'Sortir',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: const [
                  DropdownMenuItem(value: '', child: Text('-- Sortir Berdasarkan --')),
                  DropdownMenuItem(value: 'mid_asc', child: Text('MID (A-Z)')),
                  DropdownMenuItem(value: 'mid_desc', child: Text('MID (Z-A)')),
                  DropdownMenuItem(value: 'supplier_asc', child: Text('Supplier (A-Z)')),
                  DropdownMenuItem(value: 'supplier_desc', child: Text('Supplier (Z-A)')),
                  DropdownMenuItem(value: 'material_asc', child: Text('Material (A-Z)')),
                  DropdownMenuItem(value: 'material_desc', child: Text('Material (Z-A)')),
                ],
                onChanged: (v) => setState(() => _sort = v ?? ''),
              ),
              const SizedBox(height: 8),
              if (rows.isEmpty)
                const Padding(padding: EdgeInsets.all(24), child: Text('Belum ada data stok.')),
              for (final row in rows)
                _StockRowCard(
                  row: row,
                  showItemActions: isTsp && data.statusNeraca == 'BELUM_DIKONFIRMASI' && !_actionInProgress,
                  onBenar: () => _konfirmasiItemBenar(row),
                  onRevisi: () => _konfirmasiItemRevisi(row),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _NeracaBanner extends StatelessWidget {
  final TspStockData data;
  final bool canAct;
  final VoidCallback onTarikStokAwal;
  final VoidCallback onKonfirmasiNeraca;

  const _NeracaBanner({
    required this.data,
    required this.canAct,
    required this.onTarikStokAwal,
    required this.onKonfirmasiNeraca,
  });

  Color get _color {
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
    return Card(
      color: _color.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.fact_check, color: _color),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${data.date} Â· Shift ${data.shift}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('Status Neraca: ${data.statusNeraca}',
                          style: TextStyle(color: _color, fontWeight: FontWeight.w600)),
                      if (data.statusNeraca == 'VALID')
                        Text('Divalidasi oleh: ${data.validatorNama}', style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
            if (canAct) ...[
              const SizedBox(height: 10),
              if (data.statusNeraca == 'BELUM_DITARIK')
                FilledButton.icon(
                  onPressed: onTarikStokAwal,
                  icon: const Icon(Icons.download),
                  label: const Text('Tarik Stok Awal Shift'),
                ),
              if (data.statusNeraca == 'BELUM_DIKONFIRMASI')
                FilledButton.icon(
                  onPressed: onKonfirmasiNeraca,
                  icon: const Icon(Icons.verified),
                  label: const Text('Konfirmasi & Validasi Neraca Stok'),
                ),
              if (data.statusNeraca == 'VALID')
                OutlinedButton.icon(
                  onPressed: onTarikStokAwal,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reset / Tarik Ulang'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StockRowCard extends StatelessWidget {
  final TspStockRow row;
  final bool showItemActions;
  final VoidCallback onBenar;
  final VoidCallback onRevisi;

  const _StockRowCard({
    required this.row,
    required this.showItemActions,
    required this.onBenar,
    required this.onRevisi,
  });

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
                  child: Text('${row.mid} â€” ${row.deskripsi}',
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
            if (showItemActions) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(onPressed: onBenar, child: const Text('Sesuai')),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(onPressed: onRevisi, child: const Text('Revisi')),
                  ),
                ],
              ),
            ],
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

