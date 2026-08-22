import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:barcode/barcode.dart' as bc;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../data/models/reprint_models.dart';

/// Ukuran fisik roll label thermal produksi (Tally Dascom DL210) -- fixed,
/// tidak bisa diganti per print job. Mirror REPRINT_PAGE_SIZE_MM di Index.html.
const _kLabelWidthMm = 75.0;
const _kLabelHeightMm = 50.0;

/// Step 3: review label yang akan dicetak, simpan ke server (saveBatchReprint),
/// baru render PDF 75x50mm per label dan serahkan ke Android Print Framework
/// (bukan window.print() browser seperti web app -- ini upgrade native-nya:
/// bisa langsung ke print service/driver printer apa pun yang terpasang di
/// perangkat Android, termasuk Dascom DL210 kalau device sudah punya print
/// service-nya terpasang).
class ReprintPrintScreen extends ConsumerStatefulWidget {
  final List<ReprintLabel> labels;
  const ReprintPrintScreen({super.key, required this.labels});

  @override
  ConsumerState<ReprintPrintScreen> createState() => _ReprintPrintScreenState();
}

class _ReprintPrintScreenState extends ConsumerState<ReprintPrintScreen> {
  bool _saving = false;
  bool _saved = false;
  List<ReprintLabel>? _savedLabels;

  Future<void> _saveAndPrint() async {
    setState(() => _saving = true);
    try {
      if (!_saved) {
        _savedLabels = await ref.read(reprintRepositoryProvider).saveBatchReprint(widget.labels);
        _saved = true;
      }
      final doc = _buildPdf(_savedLabels ?? widget.labels);
      await Printing.layoutPdf(onLayout: (format) async => doc.save());
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  pw.Document _buildPdf(List<ReprintLabel> labels) {
    final doc = pw.Document();
    final pageFormat = PdfPageFormat(_kLabelWidthMm * PdfPageFormat.mm, _kLabelHeightMm * PdfPageFormat.mm,
        marginAll: 2 * PdfPageFormat.mm);

    for (final label in labels) {
      doc.addPage(
        pw.Page(
          pageFormat: pageFormat,
          build: (context) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.BarcodeWidget(
                barcode: bc.Barcode.code128(),
                data: label.barcodeAnak,
                width: double.infinity,
                height: 24 * PdfPageFormat.mm,
                drawText: true,
                textStyle: const pw.TextStyle(fontSize: 8),
              ),
              pw.SizedBox(height: 2),
              _labelRow('Kode Anak', label.barcodeAnak, bold: true),
              _labelRow('MID', label.mid),
              _labelRow('Material', label.deskripsi),
              _labelRow('Qty', '${label.jumlah}', bold: true, color: PdfColors.green800),
              _labelRow('Ref Induk', label.barcodeInduk, fontSize: 6, color: PdfColors.grey600),
            ],
          ),
        ),
      );
    }
    return doc;
  }

  pw.Widget _labelRow(String label, String value, {bool bold = false, double fontSize = 7, PdfColor? color}) {
    return pw.Row(
      children: [
        pw.SizedBox(
          width: 40,
          child: pw.Text(label, style: pw.TextStyle(fontSize: fontSize, color: PdfColors.grey600)),
        ),
        pw.Expanded(
          child: pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: fontSize + 1,
              fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cetak Label')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: (_savedLabels ?? widget.labels).length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final label = (_savedLabels ?? widget.labels)[index];
          return Card(
            child: ListTile(
              title: Text(label.barcodeAnak, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${label.mid} — ${label.deskripsi}'),
              trailing: Text('${label.jumlah}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _saving ? null : _saveAndPrint,
            icon: _saving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.print),
            label: Text(_saving ? 'Memproses...' : 'Simpan & Cetak Semua Label'),
          ),
        ),
      ),
    );
  }
}
