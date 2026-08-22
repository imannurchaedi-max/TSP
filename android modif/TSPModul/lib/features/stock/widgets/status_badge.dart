import 'package:flutter/material.dart';

/// Badge status stok (NORMAL/LOW/CRITICAL) mirror warna & label di dashboard
/// Monitoring Mesin web app.
class StatusBadge extends StatelessWidget {
  final String status;
  final String label;

  const StatusBadge({super.key, required this.status, required this.label});

  Color get _color {
    switch (status) {
      case 'CRITICAL':
        return Colors.red;
      case 'LOW':
        return Colors.orange;
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(color: _color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}
