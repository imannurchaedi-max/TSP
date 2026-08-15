import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../data/repositories/reference_repository.dart';
import 'scan_flow_state.dart';

/// Mirror #extra-view di Scanner.html: form field pendukung (No. Reservasi /
/// Mesin tujuan / Jumlah) sebelum masuk ke kamera, tergantung requiresX event
/// terpilih.
class ScanExtraFieldsScreen extends ConsumerStatefulWidget {
  const ScanExtraFieldsScreen({super.key});

  @override
  ConsumerState<ScanExtraFieldsScreen> createState() => _ScanExtraFieldsScreenState();
}

class _ScanExtraFieldsScreenState extends ConsumerState<ScanExtraFieldsScreen> {
  List<Reservasi>? _reservasiList;
  bool _loadingReservasi = false;
  String? _reservasiError;
  Reservasi? _selectedReservasi;
  final _manualReservasiController = TextEditingController();
  bool _useManualReservasi = false;

  String? _selectedMesin;
  final _jumlahController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final event = ref.read(scanFlowProvider).event;
    if (event?.requiresReservasi == true) {
      _loadReservasi();
    }
  }

  @override
  void dispose() {
    _manualReservasiController.dispose();
    _jumlahController.dispose();
    super.dispose();
  }

  Future<void> _loadReservasi() async {
    setState(() {
      _loadingReservasi = true;
      _reservasiError = null;
    });
    try {
      final list = await ref.read(referenceRepositoryProvider).getReservasiOptions();
      setState(() {
        _reservasiList = list;
        _useManualReservasi = list.isEmpty;
      });
    } catch (e) {
      // Fallback ke input manual kalau daftar reservasi gagal dimuat (mis. offline) --
      // sama seperti perilaku Scanner.html saat getReservasiOptions gagal.
      setState(() {
        _reservasiError = 'Gagal memuat daftar reservasi ($e). Anda tetap bisa lanjut dengan input manual.';
        _useManualReservasi = true;
      });
    } finally {
      if (mounted) setState(() => _loadingReservasi = false);
    }
  }

  void _continue() {
    final flow = ref.read(scanFlowProvider);
    final event = flow.event!;

    String? noReservasi;
    if (event.requiresReservasi) {
      noReservasi = _useManualReservasi
          ? _manualReservasiController.text.trim()
          : _selectedReservasi?.noReservasi;
      if (noReservasi == null || noReservasi.isEmpty) {
        _showValidationDialog('Pilih atau isi Nomor Reservasi terlebih dahulu sebelum melanjutkan scan.');
        return;
      }
    }

    if (event.requiresMesin && (_selectedMesin == null || _selectedMesin!.isEmpty)) {
      _showValidationDialog('Pilih mesin tujuan terlebih dahulu.');
      return;
    }

    String? jumlah;
    if (event.requiresJumlah) {
      jumlah = _jumlahController.text.trim();
      final qty = num.tryParse(jumlah);
      if (jumlah.isEmpty || qty == null || qty <= 0) {
        _showValidationDialog('Isi jumlah (Qty) material yang sah dan lebih besar dari 0.');
        return;
      }
    }

    ref.read(scanFlowProvider.notifier).state = flow.copyWith(
      mesin: _selectedMesin,
      jumlah: jumlah,
      noReservasi: noReservasi,
    );
    context.push('/scan/camera');
  }

  void _showValidationDialog(String message) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Input Tidak Lengkap'),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Mengerti')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final event = ref.watch(scanFlowProvider).event;
    if (event == null) {
      return const Scaffold(body: Center(child: Text('Event tidak dipilih.')));
    }
    final mesinList = ref.read(referenceRepositoryProvider).mesinList;

    return Scaffold(
      appBar: AppBar(title: Text(event.label)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (event.requiresReservasi) ...[
              Text('Nomor Reservasi', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              if (_loadingReservasi) const LinearProgressIndicator(),
              if (_reservasiError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_reservasiError!, style: TextStyle(color: Colors.orange.shade800, fontSize: 12)),
                ),
              if (!_useManualReservasi && _reservasiList != null)
                DropdownButtonFormField<Reservasi>(
                  initialValue: _selectedReservasi,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  isExpanded: true,
                  hint: const Text('-- Pilih Nomor Reservasi --'),
                  items: _reservasiList!
                      .map((r) => DropdownMenuItem(
                            value: r,
                            child: Text(
                              r.itemCount > 1 ? '${r.noReservasi} (${r.itemCount} item)' : r.noReservasi,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedReservasi = v),
                ),
              TextButton(
                onPressed: () => setState(() => _useManualReservasi = !_useManualReservasi),
                child: Text(_useManualReservasi ? 'Pilih dari daftar' : 'Input manual Nomor Reservasi'),
              ),
              if (_useManualReservasi)
                TextField(
                  controller: _manualReservasiController,
                  decoration: const InputDecoration(
                    labelText: 'Nomor Reservasi',
                    hintText: 'Contoh: 20748003',
                    border: OutlineInputBorder(),
                  ),
                ),
              if (_selectedReservasi != null && !_useManualReservasi) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    border: Border.all(color: Colors.green.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Material yang diizinkan:', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      for (final item in _selectedReservasi!.items)
                        Text('• ${item.mid} — ${item.desc} (${item.qty} ${item.uom})'),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
            ],
            if (event.requiresMesin) ...[
              Text('Mesin Tujuan', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _selectedMesin,
                decoration: const InputDecoration(border: OutlineInputBorder()),
                hint: const Text('-- Pilih Mesin --'),
                items: mesinList.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (v) => setState(() => _selectedMesin = v),
              ),
              const SizedBox(height: 20),
            ],
            if (event.requiresJumlah) ...[
              Text('Jumlah', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _jumlahController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(hintText: 'Contoh: 200', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
            ],
            FilledButton(
              onPressed: _continue,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Lanjut Scan Barcode'),
            ),
          ],
        ),
      ),
    );
  }
}
