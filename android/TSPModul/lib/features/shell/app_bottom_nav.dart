import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigasi bawah persisten dipakai tiap layar utama (Scan/Stock/...). Item
/// yang ditambahkan di fase berikutnya (Riwayat, Reprint, Material Master,
/// Validator) tinggal ditambahkan di sini -- role-gating (mis. Reprint &
/// Material Master hanya utk tsp/spv) diterapkan lewat parameter `items`.
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<AppNavItem> items;

  const AppBottomNav({super.key, required this.currentIndex, required this.items});

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: (index) => context.go(items[index].route),
      destinations: items
          .map((item) => NavigationDestination(icon: Icon(item.icon), label: item.label))
          .toList(),
    );
  }
}

class AppNavItem {
  final String route;
  final IconData icon;
  final String label;
  const AppNavItem({required this.route, required this.icon, required this.label});
}

const kMainNavItems = [
  AppNavItem(route: '/scan', icon: Icons.qr_code_scanner, label: 'Scan'),
  AppNavItem(route: '/stock', icon: Icons.inventory_2, label: 'Stock'),
];
