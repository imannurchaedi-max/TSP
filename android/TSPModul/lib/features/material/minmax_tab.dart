import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../data/models/material_models.dart';
import 'csv_import_helper.dart';

class MinMaxTab extends ConsumerStatefulWidget {
  const MinMaxTab({super.key});

  @override
  ConsumerState<MinMaxTab> createState() => _MinMaxTabState();
}

class _MinMaxTabState extends ConsumerState<MinMaxTab> with AutomaticKeepAliveClientMixin {
  late Future<List<MinMaxItem>> _future;
  String _lokasi = 'TSP';
  final _searchController = TextEditingController();
  String _search = '';

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _future = ref.read(materialRepositoryProvider).getMinMaxSettings();
    _searchController.addListener(() => setState(() => _search = _searchController.text.trim().toLowerCase()));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final next = ref.read(materialRepositoryProvider).getMinMaxSettings();
    setState(() => _future = next);
    await next;
  }

  Future<void> _openForm(MinMaxItem item) async {
    final repo = ref.read(materialRepositoryProvider);
    final minController = TextEditingController(text: item.minStock.toString());
    final maxController = TextEditingController(text: item.maxStock.toString());

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${item.mid} — ${item.lokasi}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(item.deskripsi, style: const TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: minController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Min Stock', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: maxController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Max Stock', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
          FilledButton(
            onPressed: () async {
              try {
                await repo.saveMinMaxSetting(
                  mid: item.mid,
                  lokasi: item.lokasi,
                  minStock: num.tryParse(minController.text.trim()) ?? 0,
                  maxStock: num.tryParse(maxController.text.trim()) ?? 0,
                );
                if (context.mounted) Navigator.of(context).pop(true);
              } on ApiException catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
                }
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    if (saved == true) await _reload();
  }

  Future<void> _delete(MinMaxItem item) async {
    final repo = ref.read(materialRepositoryProvider);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Pengaturan Min/Max'),
        content: Text('Hapus threshold Min/Max ${item.mid} di lokasi ${item.lokasi}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await repo.deleteMinMaxSetting(mid: item.mid, lokasi: item.lokasi);
      await _reload();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _importCsv() async {
    try {
      final rows = await pickAndParseCsv();
      if (rows == null || rows.isEmpty) return;
      final headers = rows.first.map((h) => h.toString().trim().toUpperCase()).toList();
      final midIdx = findHeaderIndex(headers, (h) => h.contains('MID'));
      final locIdx = findHeaderIndex(headers, (h) => h.contains('LOKASI') || h.contains('LOCATION'));
      final minIdx = findHeaderIndex(headers, (h) => h == 'MIN' || h.contains('MIN_') || h.contains('MINIMUM'));
      final maxIdx = findHeaderIndex(headers, (h) => h == 'MAX' || h.contains('MAX_') || h.contains('MAXIMUM'));

      if (midIdx == -1) {
        _showMessage('Kolom "MID" wajib ada di baris pertama CSV.', isError: true);
        return;
      }

      final items = <Map<String, dynamic>>[];
      for (var i = 1; i < rows.length; i++) {
        final row = rows[i];
        final mid = cellAt(row, midIdx);
        if (mid.isEmpty) continue;
        final loc = locIdx == -1 ? 'TSP' : cellAt(row, locIdx).ifEmpty('TSP');
        final minVal = minIdx == -1 ? '0' : cellAt(row, minIdx).ifEmpty('0');
        final maxVal = maxIdx == -1 ? '0' : cellAt(row, maxIdx).ifEmpty('0');
        items.add({'mid': mid, 'lokasi': loc, 'minStock': minVal, 'maxStock': maxVal});
      }

      if (items.isEmpty) {
        _showMessage('Tidak ditemukan baris data MID yang valid pada file CSV.', isError: true);
        return;
      }

      final message = await ref.read(materialRepositoryProvider).saveMinMaxBatch(items);
      _showMessage(message);
      await _reload();
    } on ApiException catch (e) {
      _showMessage(e.message, isError: true);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message), backgroundColor: isError ? Colors.red : null));
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  initialValue: _lokasi,
                  decoration: const InputDecoration(labelText: 'Lokasi', border: OutlineInputBorder(), isDense: true),
                  items: kAllLocations.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _lokasi = v);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'Cari MID / deskripsi...',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              IconButton.filledTonal(onPressed: _importCsv, icon: const Icon(Icons.upload_file), tooltip: 'Import CSV'),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<MinMaxItem>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text('Gagal memuat: ${snapshot.error}'));
              }
              final all = snapshot.data ?? [];
              final filtered = all.where((m) {
                if (m.lokasi != _lokasi) return false;
                if (_search.isEmpty) return true;
                return m.mid.toLowerCase().contains(_search) || m.deskripsi.toLowerCase().contains(_search);
              }).toList();
              if (filtered.isEmpty) {
                return RefreshIndicator(
                  onRefresh: _reload,
                  child: ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Tidak ada data untuk lokasi ini.')))]),
                );
              }
              return RefreshIndicator(
                onRefresh: _reload,
                child: ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: filtered.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 6),
                  itemBuilder: (context, index) {
                    final item = filtered[index];
                    return Card(
                      child: ListTile(
                        title: Text('${item.mid} — ${item.deskripsi}'),
                        subtitle: Text('Min: ${item.minStock} · Max: ${item.maxStock} ${item.uom}'
                            '${item.isConfigured ? ' · oleh ${item.updatedBy}' : ' · belum diatur'}'),
                        trailing: item.isConfigured
                            ? IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: () => _delete(item))
                            : null,
                        onTap: () => _openForm(item),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

extension _StringDefault on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
