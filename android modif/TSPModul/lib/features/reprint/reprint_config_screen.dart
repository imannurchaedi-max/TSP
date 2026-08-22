import 'package:flutter/material.dart';

import '../../data/models/reprint_models.dart';
import 'reprint_print_screen.dart';

/// Step 2: konfigurasi jumlah label & qty per label, lalu generate array
/// ReprintLabel client-side. Mirror generateReprintLabels() + _parseNextSequence()
/// + _padSeq() di Index.html persis (termasuk mode "Retur" pakai suffix -R).
class ReprintConfigScreen extends StatefulWidget {
  final ReprintSearchResult result;
  final String query;
  final num remainingQty;

  const ReprintConfigScreen({super.key, required this.result, required this.query, required this.remainingQty});

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

  int _parseNextSequence(String lastAnak, String induk) {
    var suffix = lastAnak.replaceFirst(induk, '');
    suffix = suffix.replaceFirst(RegExp(r'^[-_]'), '');
    final parts = suffix.split(RegExp(r'[-_]'));
    var lastNum = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      final n = int.tryParse(parts[i]);
      if (n != null) {
        lastNum = n;
        break;
      }
    }
    return lastNum + 1;
  }

  String _padSeq(int n) => n < 10 ? '0$n' : '$n';

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
    final mid = first.mid;
    final deskripsi = first.deskripsi;

    final sorted = [...widget.result.history]..sort((a, b) => a.barcodeAnak.compareTo(b.barcodeAnak));
    final lastAnak = sorted.last.barcodeAnak;
    final nextSeq = _parseNextSequence(lastAnak, induk);

    final labels = <ReprintLabel>[];
    num currentRemaining = widget.remainingQty;
    for (var i = 0; i < jumlah; i++) {
      if (currentRemaining <= 0) break;
      final qtyToPrint = qtyPer > currentRemaining ? currentRemaining : qtyPer;

      final String suffix;
      if (_isRetur) {
        suffix = jumlah == 1 ? '-R' : '-R${i + 1}';
      } else {
        suffix = '-${_padSeq(nextSeq + i)}';
      }

      labels.add(ReprintLabel(
        barcodeInduk: induk,
        barcodeAnak: '$induk$suffix',
        mid: mid,
        deskripsi: deskripsi,
        jumlah: qtyToPrint,
        isRetur: _isRetur,
      ));
      currentRemaining -= qtyToPrint;
    }

    Navigator.of(context).push(MaterialPageRoute(builder: (context) => ReprintPrintScreen(labels: labels)));
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
