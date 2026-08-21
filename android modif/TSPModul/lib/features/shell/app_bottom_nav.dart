import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppNavItem {
  final String route;
  final IconData icon;
  final String label;
  const AppNavItem({required this.route, required this.icon, required this.label});
}

const _kBaseNavItems = [
  AppNavItem(route: '/scan', icon: Icons.qr_code_scanner, label: 'Scan'),
  AppNavItem(route: '/stock', icon: Icons.inventory_2, label: 'Stock'),
  AppNavItem(route: '/history', icon: Icons.history, label: 'Riwayat'),
];

/// Item tambahan khusus role tsp/spv, mirror tab-btn-reprint & tab-btn-minmax
/// yang cuma `display:flex` untuk role itu di Index.html.
const _kTspOnlyNavItems = [
  AppNavItem(route: '/reprint', icon: Icons.print, label: 'Reprint'),
  AppNavItem(route: '/material', icon: Icons.category, label: 'Material'),
  AppNavItem(route: '/validator', icon: Icons.fact_check, label: 'Validasi'),
];

List<AppNavItem> navItemsForRole(String? role) {
  if (role == 'tsp' || role == 'spv') {
    return [..._kBaseNavItems, ..._kTspOnlyNavItems];
  }
  return _kBaseNavItems;
}

/// Navigasi bawah persisten. Pakai currentRoute (bukan index tetap) supaya
/// tahan terhadap daftar item yang berubah-ubah per role.
class AppBottomNav extends StatelessWidget {
  final String currentRoute;
  final List<AppNavItem> items;

  const AppBottomNav({super.key, required this.currentRoute, required this.items});

  @override
  Widget build(BuildContext context) {
    var selectedIndex = items.indexWhere((item) => item.route == currentRoute);
    if (selectedIndex == -1) selectedIndex = 0;

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) => context.go(items[index].route),
      // Role tsp/spv punya lebih banyak menu (6) -- cuma tampilkan label item
      // yang aktif supaya tidak sesak di layar sempit, mirip pola bottom nav
      // padat pada umumnya. Role lain (3 item) tetap tampilkan semua label.
      labelBehavior: items.length > 4
          ? NavigationDestinationLabelBehavior.onlyShowSelected
          : NavigationDestinationLabelBehavior.alwaysShow,
      destinations: items
          .map((item) => NavigationDestination(icon: Icon(item.icon), label: item.label))
          .toList(),
    );
  }
}
