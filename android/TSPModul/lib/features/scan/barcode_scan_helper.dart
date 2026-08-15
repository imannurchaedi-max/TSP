import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Dialog kamera sekali-pakai: buka kamera, kembalikan barcode pertama yang
/// terbaca (atau null kalau dibatalkan). Dipakai di tempat-tempat yang cuma
/// butuh 1 hasil scan cepat (mis. field pencarian Reprint) tanpa perlu alur
/// event-picker lengkap seperti fitur Scan utama.
Future<String?> scanBarcodeDialog(BuildContext context) {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(builder: (context) => const _QuickScanScreen()),
  );
}

class _QuickScanScreen extends StatefulWidget {
  const _QuickScanScreen();

  @override
  State<_QuickScanScreen> createState() => _QuickScanScreenState();
}

class _QuickScanScreenState extends State<_QuickScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.code128, BarcodeFormat.qrCode],
  );
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final value = barcodes.first.rawValue;
    if (value == null || value.isEmpty) return;
    _handled = true;
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Barcode')),
      body: MobileScanner(controller: _controller, onDetect: _onDetect),
    );
  }
}
