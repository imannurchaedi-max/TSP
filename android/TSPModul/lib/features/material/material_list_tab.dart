import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../data/models/material_models.dart';
import 'csv_import_helper.dart';

class MaterialListTab extends ConsumerStatefulWidget {
  const MaterialListTab({super.key});

  @override
  ConsumerState<MaterialListTab> createState() => _MaterialListTabState();
}

class _MaterialListTabState extends ConsumerState<MaterialListTab> with AutomaticKeepAliveClientMixin {
  late Future<List<MaterialItem>> _future;
  final _searchController = TextEditingController();
  String _search = '';

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _future = ref.read(materialRepositoryProvider).getMaterialList();
    _searchController.addListener(() => setState(() => _search = _searchController.text.trim().toLowerCase()));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final next = ref.read(materialRepositoryProvider).getMaterialList();
    setState(() => _future = next);
    await next;
  }

  Future<void> _openForm({MaterialItem? existing}) async {
    final repo = ref.read(materialRepositoryProvider);
    final midController = TextEditingController(text: existing?.mid ?? '');
    final deskripsiController = TextEditingController(text: existing?.deskripsi ?? '');
    final uomController = TextEditingController(text: existing?.uom ?? 'KG');
    final supplierController = TextEditingController(text: existing?.supplier ?? '');
    var status = existing?.status.isNotEmpty == true ? existing!.status : 'Aktif';

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'Tambah Material' : 'Edit Material'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: midController,
                  enabled: existing == null,
                  decoration: const InputDecoration(labelText: 'MID', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: deskripsiController,
                  decoration: const InputDecoration(labelText: 'Deskripsi', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: uomController,
                  decoration: const InputDecoration(labelText: 'UOM', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: supplierController,
                  decoration: const InputDecoration(labelText: 'Supplier', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: status,
                  decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'Aktif', child: Text('Aktif')),
                    DropdownMenuItem(value: 'Nonaktif', child: Text('Nonaktif')),
                  ],
                  onChanged: (v) => setDialogState(() => status = v ?? 'Aktif'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
            FilledButton(
              onPressed: () async {
                if (midController.text.trim().isEmpty) return;
                try {
                  await repo.saveMaterial(
                    mid: midController.text.trim(),
                    deskripsi: deskripsiController.text.trim(),
                    uom: uomController.text.trim(),
                    supplier: supplierController.text.trim(),
                    status: status,
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
      ),
    );
    if (saved == true) await _reload();
  }

  Future<void> _delete(MaterialItem item) async {
    final repo = ref.read(materialRepositoryProvider);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Material'),
        content: Text('Hapus ${item.mid} — ${item.deskripsi}? Ditolak kalau MID pernah dipakai di transaksi.'),
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
      await repo.deleteMaterial(item.mid);
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
      final descIdx = findHeaderIndex(headers, (h) => h.contains('DES') || h.contains('MATERIAL'));
      final uomIdx = findHeaderIndex(headers, (h) => h.contains('UOM') || h.contains('SATUAN'));
      final suppIdx = findHeaderIndex(headers, (h) => h.contains('SUPPLIER'));

      if (midIdx == -1) {
        _showMessage('Kolom "MID" wajib ada di baris pertama CSV.', isError: true);
        return;
      }

      final items = <Map<String, dynamic>>[];
      for (var i = 1; i < rows.length; i++) {
        final row = rows[i];
        final mid = cellAt(row, midIdx);
        if (mid.isEmpty) continue;
        items.add({
          'mid': mid,
          'deskripsi': cellAt(row, descIdx),
          'uom': cellAt(row, uomIdx),
          'supplier': cellAt(row, suppIdx),
        });
      }

      if (items.isEmpty) {
        _showMessage('Tidak ditemukan baris data MID yang valid pada file CSV.', isError: true);
        return;
      }

      final message = await ref.read(materialRepositoryProvider).saveMaterialBatch(items);
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
    return Scaffold(
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'Cari MID / deskripsi...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  onPressed: _importCsv,
                  icon: const Icon(Icons.upload_file),
                  tooltip: 'Import CSV',
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<MaterialItem>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Gagal memuat: ${snapshot.error}'));
                }
                final all = snapshot.data ?? [];
                final filtered = _search.isEmpty
                    ? all
                    : all
                        .where((m) => m.mid.toLowerCase().contains(_search) || m.deskripsi.toLowerCase().contains(_search))
                        .toList();
                if (filtered.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: _reload,
                    child: ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('Tidak ada material.')))]),
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
                          subtitle: Text('${item.uom} · ${item.supplier}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: item.status == 'Aktif' ? Colors.green.shade50 : Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(item.status,
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: item.status == 'Aktif' ? Colors.green.shade800 : Colors.grey.shade700)),
                              ),
                              IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: () => _delete(item)),
                            ],
                          ),
                          onTap: () => _openForm(existing: item),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () => _openForm(), child: const Icon(Icons.add)),
    );
  }
}
