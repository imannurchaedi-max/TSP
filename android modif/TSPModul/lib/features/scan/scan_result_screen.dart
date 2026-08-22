import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../data/repositories/scan_repository.dart';
import 'scan_flow_state.dart';

class ScanResultScreen extends ConsumerWidget {
  const ScanResultScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flow = ref.watch(scanFlowProvider);
    final result = flow.lastResult;

    late final bool isError;
    late final bool isWarning;
    late final String message;
    String? childBarcode;

    if (result is ScanSubmitResult) {
      isError = !result.success;
      isWarning = result.warning;
      message = result.message;
      childBarcode = result.childBarcode;
    } else if (result is ApiException) {
      isError = true;
      isWarning = false;
      message = result.message;
    } else {
      isError = true;
      isWarning = false;
      message = 'Tidak ada hasil.';
    }

    final Color color = isError ? Colors.red : (isWarning ? Colors.orange : Colors.green);

    return Scaffold(
      appBar: AppBar(title: const Text('Hasil Scan')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.08),
                border: Border.all(color: color.withValues(alpha: 0.4)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isError ? Icons.error_outline : (isWarning ? Icons.warning_amber : Icons.check_circle_outline),
                    color: color,
                    size: 36,
                  ),
                  const SizedBox(height: 12),
                  Text(message, style: TextStyle(color: color.withValues(alpha: 0.9), height: 1.4)),
                ],
              ),
            ),
            if (childBarcode != null) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    const Text('Kode Reprint', style: TextStyle(fontSize: 12, color: Colors.indigo)),
                    const SizedBox(height: 4),
                    Text(
                      childBarcode,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigo),
                    ),
                  ],
                ),
              ),
            ],
            const Spacer(),
            FilledButton(
              onPressed: () {
                ref.read(scanFlowProvider.notifier).state = flow.copyWith(lastResult: null);
                context.pushReplacement('/scan/camera');
              },
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Scan Lagi'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () {
                ref.read(scanFlowProvider.notifier).state = const ScanFlowState();
                context.go('/scan');
              },
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Kembali ke Menu'),
            ),
          ],
        ),
      ),
    );
  }
}
