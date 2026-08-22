import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../shell/app_bottom_nav.dart';
import 'material_list_tab.dart';
import 'minmax_tab.dart';

/// Konsolidasi Material List + Min/Max Stock jadi 1 menu "Material Master",
/// mirip web app -- 2 sesi terpisah (Material List murni identitas material,
/// Min/Max Stock murni threshold per lokasi, tidak saling mendaftarkan MID
/// baru secara implisit).
class MaterialHomeScreen extends ConsumerWidget {
  const MaterialHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Material Master'),
          bottom: const TabBar(tabs: [Tab(text: 'Material List'), Tab(text: 'Min/Max Stock')]),
        ),
        body: const TabBarView(children: [MaterialListTab(), MinMaxTab()]),
        bottomNavigationBar: AppBottomNav(currentRoute: '/material', items: navItemsForRole(user?.role)),
      ),
    );
  }
}
