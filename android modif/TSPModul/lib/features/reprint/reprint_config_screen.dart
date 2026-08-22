import 'package:flutter/material.dart';

import '../../data/models/reprint_models.dart';
import 'reprint_print_screen.dart';

/// Step 2: konfigurasi jumlah label dan qty per label. Layar ini hanya membuat
/// permintaan alokasi; barcode anak baru dibuat server di dalam lock saat user
/// memilih simpan/cetak pada langkah berikutnya.
class ReprintConfigScreen extends StatefulWidget {
  final ReprintSearchResult result;
  final String query;

  const ReprintConfigScreen({super.key, required this.result, required this.query});

  @override
  State<ReprintConfigScreen> createState() => _ReprintConfigScreenState();
}

class _ReprintConfigScreenState extends State<ReprintConfigScreen> {
  final _jumlahLabelController = TextEditingController(text: '1');
  late final TextEditingController _qtyPerLabelController;
  bool _isRetur = false;

  @override
  void initState() {
    super.initState();
    final sorted = [...widget.result.history]..sort((a, b) => a.barcodeAnak.compareTo(b.barcodeAnak));
    final lastAnak = sorted.last;
    _qtyPerLabelController = TextEditingController(text: lastAnak.jumlah.toString());
  }

  @override
  void dispose() {
    _jumlahLabelController.dispose();
    _qtyPerLabelController.dispose();
    super.dispose();
  }

  void _generate() {
    final jumlah = int.tryParse(_jumlahLabelController.text.trim()) ?? 1;
    final qtyPer = int.tryParse(_qtyPerLabelController.text.trim());

    if (qtyPer == null || qtyPer <= 0) {
      _showValidation('Isi Qty per Label terlebih dahulu.');
      return;
    }
    if (jumlah < 1 || jumlah > 20) {
      _showValidation('Jumlah label harus antara 1 sampai 20.');
      return;
    }

    final first = widget.result.history.first;
    final induk = first.barcodeInduk;
    final requests = <ReprintRequest>[];
    for (var i = 0; i < jumlah; i++) {
      requests.add(ReprintRequest(
        barcodeInduk: induk,
        jumlah: qtyPer,
        isRetur: _isRetur,
      ));
    }

    Navigator.of(context).push(MaterialPageRoute(builder: (context) => ReprintPrintScreen(requests: requests)));
  }

  void _showValidation(String message) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Input Tidak Valid'),
        content: Text(message),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Mengerti'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Konfigurasi Label')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SwitchListTile(
              title: const Text('Label Retur (suffix -R)'),
              subtitle: const Text('Aktifkan kalau label ini untuk retur, bukan reprint sekuensial biasa.'),
              value: _isRetur,
              onChanged: (v) => setState(() => _isRetur = v),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _jumlahLabelController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Jumlah Label (1-20)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _qtyPerLabelController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Qty per Label', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _generate,
              icon: const Icon(Icons.qr_code_2),
              label: const Text('Generate & Lanjut Cetak'),
            ),
          ],
        ),
      ),
    );
  }
}
