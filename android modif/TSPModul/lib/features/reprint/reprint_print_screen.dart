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
  final List<ReprintRequest> requests;
  const ReprintPrintScreen({super.key, required this.requests});

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
        _savedLabels = await ref.read(reprintRepositoryProvider).saveBatchReprint(widget.requests);
        _saved = true;
      }
      final labels = _savedLabels;
      if (labels == null) throw StateError('Server belum mengalokasikan label.');
      final doc = _buildPdf(labels);
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
          // QR, bukan Code128. Kode anak (mis. 1800120600-20000364-P12-0001-73,
          // 31 karakter) butuh >300 modul kalau dicetak Code128. Di lebar cetak
          // efektif ~68mm pada printer thermal 203dpi itu cuma ~1,6 dot per modul,
          // di bawah minimum 2 dot -- penyebab label sering gagal dibaca.
          //
          // QR memuat 31 karakter alfanumerik itu dalam 25x25 modul (versi 2, koreksi
          // galat M). Dengan sisi 26mm hasilnya ~5 dot per modul, tiga kali lipat lebih
          // longgar, plus koreksi galat Reed-Solomon yang memulihkan ~15% modul rusak --
          // Code128 tidak punya itu sama sekali, sobek sedikit langsung gagal.
          //
          // Scanner sudah menerima kedua format, jadi label Code128 lama tetap terbaca.
          build: (context) => pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.BarcodeWidget(
                barcode: bc.Barcode.qrCode(
                  errorCorrectLevel: bc.BarcodeQRCorrectionLevel.medium,
                ),
                data: label.barcodeAnak,
                width: 26 * PdfPageFormat.mm,
                height: 26 * PdfPageFormat.mm,
                drawText: false,
              ),
              pw.SizedBox(width: 2 * PdfPageFormat.mm),
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    _labelRow('MID', label.mid),
                    _labelRow('Material', label.deskripsi),
                    _labelRow('Qty', '${label.jumlah}', bold: true, color: PdfColors.green800),
                    _labelRow('Ref Induk', label.barcodeInduk, fontSize: 6, color: PdfColors.grey600),
                    pw.SizedBox(height: 1 * PdfPageFormat.mm),
                    // Kode anak tetap dicetak sebagai teks supaya masih bisa diketik
                    // manual kalau QR-nya rusak parah atau kamera sedang bermasalah.
                    pw.Text(
                      label.barcodeAnak,
                      style: pw.TextStyle(fontSize: 6.5, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ),
              ),
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
        itemCount: _savedLabels?.length ?? widget.requests.length,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final savedLabel = _savedLabels?[index];
          final request = widget.requests[index];
          final label = savedLabel ??
              ReprintLabel(
                barcodeInduk: request.barcodeInduk,
                barcodeAnak: '',
                mid: 'Draf',
                deskripsi: request.isRetur ? 'Mode retur' : 'Mode reprint',
                jumlah: request.jumlah,
                isRetur: request.isRetur,
              );
          return Card(
            child: ListTile(
              title: Text(
                savedLabel?.barcodeAnak ?? 'Barcode akan dialokasikan server',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text('${label.mid} — ${label.deskripsi}'),
              trailing: Text(
                '${savedLabel?.jumlah ?? request.jumlah}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
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
