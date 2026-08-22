import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

/// Bar tipis persisten di atas SETIAP layar saat perangkat offline -- penting
/// utk app shop-floor: operator harus selalu tahu statusnya sebelum menganggap
/// scan "hilang" (sebenarnya sudah aman masuk antrian offline, lihat
/// ScanRepository/SyncService), bukan sekadar indikator di 1 layar saja.
class ConnectivityBanner extends StatefulWidget {
  final Widget child;
  const ConnectivityBanner({super.key, required this.child});

  @override
  State<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends State<ConnectivityBanner> {
  bool _offline = false;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  @override
  void initState() {
    super.initState();
    Connectivity().checkConnectivity().then(_update);
    _subscription = Connectivity().onConnectivityChanged.listen(_update);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _update(List<ConnectivityResult> results) {
    final isOnline = results.any((r) => r != ConnectivityResult.none);
    if (mounted) setState(() => _offline = !isOnline);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_offline)
          Container(
            width: double.infinity,
            color: Colors.orange.shade700,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: const SafeArea(
              bottom: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_off, size: 14, color: Colors.white),
                  SizedBox(width: 6),
                  Text(
                    'Tidak ada koneksi -- scan tersimpan di antrian lokal',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
