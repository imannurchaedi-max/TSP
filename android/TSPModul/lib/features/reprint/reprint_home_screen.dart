import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../data/models/reprint_models.dart';
import '../../data/repositories/reprint_repository.dart';
import '../scan/barcode_scan_helper.dart';
import '../shell/app_bottom_nav.dart';
import 'reprint_config_screen.dart';

/// Step 1 modul Reprint: cari Kode Induk (scan atau ketik manual), tampilkan
/// info material + sisa stock + riwayat Kode Anak yang sudah pernah dicetak.
/// Mirror #reprint-step-search & showReprintConfig() di Index.html.
class ReprintHomeScreen extends ConsumerStatefulWidget {
  const ReprintHomeScreen({super.key});

  @override
  ConsumerState<ReprintHomeScreen> createState() => _ReprintHomeScreenState();
}

class _ReprintHomeScreenState extends ConsumerState<ReprintHomeScreen> {
  final _searchController = TextEditingController();
  ReprintSearchResult? _result;
  String? _query;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  num get _remainingQty {
    if (_result == null) return 0;
    num printed = 0;
    for (final r in _result!.history) {
      if (!r.barcodeAnak.endsWith('-00')) printed += r.jumlah;
    }
    return (_result!.parentQty - printed).clamp(0, double.infinity);
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref.read(reprintRepositoryProvider).getReprintData(query);
      setState(() {
        _result = result;
        _query = query;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _result = null;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _scanThenSearch() async {
    final value = await scanBarcodeDialog(context);
    if (value == null || !mounted) return;
    _searchController.text = value;
    await _search();
  }

  Future<void> _delete(ReprintHistoryRow row) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Konfirmasi Hapus'),
        content: Text('Hapus barcode ${row.barcodeAnak} dari riwayat? Stock akan kembali seperti semula.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Ya, Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _runDelete(row, force: false);
  }

  /// Server menolak barcode anak yang sudah punya checkpoint operator. Khusus role spv
  /// penolakan itu bisa di-override (force), jadi tawarkan konfirmasi kedua yang eksplisit.
  Future<void> _runDelete(ReprintHistoryRow row, {required bool force}) async {
    try {
      await ref.read(reprintRepositoryProvider).deleteReprintBarcode(row.barcodeAnak, force: force);
      await _search();
    } on ReprintDeleteBlockedException catch (e) {
      if (!mounted) return;
      if (!e.requiresForce || force) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
        return;
      }
      final forceConfirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Barcode Sudah Dipakai'),
          content: Text(
            '${e.message}\n\nHapus paksa? Riwayat transaksi barcode ini ikut hilang dan neraca stok bisa berubah. '
            'Aksi ini tercatat di Log Aktivitas Barcode.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Ya, Hapus Paksa'),
            ),
          ],
        ),
      );
      if (forceConfirmed == true) await _runDelete(row, force: true);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
      }
    }
  }

  void _resetSearch() {
    setState(() {
      _result = null;
      _query = null;
      _error = null;
      _searchController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Reprint Barcode')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Kode Induk',
                      hintText: 'Scan atau ketik Kode Induk...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(onPressed: _scanThenSearch, icon: const Icon(Icons.camera_alt)),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _loading ? null : _search,
              icon: _loading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.search),
              label: const Text('Cari'),
            ),
            const SizedBox(height: 16),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_result != null) Expanded(child: _ResultView(
              result: _result!,
              query: _query!,
              remainingQty: _remainingQty,
              onDelete: _delete,
              onReset: _resetSearch,
            )),
          ],
        ),
      ),
      bottomNavigationBar: AppBottomNav(currentRoute: '/reprint', items: navItemsForRole(user?.role)),
    );
  }
}

class _ResultView extends StatelessWidget {
  final ReprintSearchResult result;
  final String query;
  final num remainingQty;
  final void Function(ReprintHistoryRow) onDelete;
  final VoidCallback onReset;

  const _ResultView({
    required this.result,
    required this.query,
    required this.remainingQty,
    required this.onDelete,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    if (result.history.isEmpty) {
      return const Center(child: Text('Tidak ada data reprint untuk kode tersebut.'));
    }
    final first = result.history.first;
    final sorted = [...result.history]..sort((a, b) => a.barcodeAnak.compareTo(b.barcodeAnak));

    return ListView(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(first.barcodeInduk, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('${first.mid} — ${first.deskripsi}'),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(6)),
                  child: Text('Sisa Stock: $remainingQty',
                      style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text('Riwayat Reprint', style: TextStyle(fontWeight: FontWeight.bold)),
        for (final row in sorted)
          Card(
            margin: const EdgeInsets.only(top: 6),
            child: ListTile(
              dense: true,
              title: Text(row.barcodeAnak, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Qty: ${row.jumlah} · ${row.tanggal} · Shift ${row.shift}'),
              trailing: row.barcodeAnak.endsWith('-00')
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => onDelete(row),
                    ),
            ),
          ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(onPressed: onReset, child: const Text('Ganti Kode Induk')),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                onPressed: remainingQty > 0
                    ? () => Navigator.of(context).push(MaterialPageRoute(
                          builder: (context) => ReprintConfigScreen(result: result, query: query, remainingQty: remainingQty),
                        ))
                    : null,
                icon: const Icon(Icons.print),
                label: const Text('Generate Label'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
