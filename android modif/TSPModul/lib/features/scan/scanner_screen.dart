import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/providers.dart';
import 'scan_flow_state.dart';

/// Live camera scan pakai ML Kit (mobile_scanner) -- pengganti trik "jepret foto
/// lalu decode" di web app (html5-qrcode + <input capture>), yang jadi salah
/// satu alasan utama konversi ke app native.
class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.code128, BarcodeFormat.qrCode],
  );
  bool _isSubmitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isSubmitting) return;
    final barcode = capture.barcodes.firstOrNull;
    final rawValue = barcode?.rawValue;
    if (rawValue == null || rawValue.isEmpty) return;

    setState(() => _isSubmitting = true);
    await _controller.stop();

    final flow = ref.read(scanFlowProvider);
    final event = flow.event;
    final user = ref.read(currentUserProvider);
    if (event == null || user == null) {
      if (mounted) context.go('/scan');
      return;
    }

    try {
      final result = await ref.read(scanRepositoryProvider).submitScan(
            barcodeText: rawValue,
            eventCode: event.code,
            mesinCode: flow.mesin,
            jumlah: flow.jumlah,
            noReservasi: flow.noReservasi,
            nik: user.nik,
          );
      ref.read(scanFlowProvider.notifier).state = flow.copyWith(lastResult: result);
      if (mounted) context.push('/scan/result');
    } catch (e) {
      if (mounted) {
        ref.read(scanFlowProvider.notifier).state = flow.copyWith(lastResult: e);
        context.push('/scan/result');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final event = ref.watch(scanFlowProvider).event;
    return Scaffold(
      appBar: AppBar(title: Text(event?.label ?? 'Scan Barcode')),
      body: Stack(
        alignment: Alignment.center,
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          _ScanOverlay(borderColor: Theme.of(context).colorScheme.primary),
          Positioned(
            bottom: 32,
            child: Text(
              'Arahkan kamera ke barcode',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, shadows: [
                Shadow(blurRadius: 8, color: Colors.black),
              ]),
            ),
          ),
          if (_isSubmitting)
            Container(
              color: Colors.black54,
              child: const Center(child: CircularProgressIndicator(color: Colors.white)),
            ),
        ],
      ),
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  final Color borderColor;
  const _ScanOverlay({required this.borderColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      height: 180,
      decoration: BoxDecoration(
        border: Border.all(color: borderColor, width: 3),
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}

extension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
