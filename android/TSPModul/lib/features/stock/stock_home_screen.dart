import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../shell/app_bottom_nav.dart';
import 'mesin_stock_tab.dart';
import 'monitoring_tab.dart';
import 'transactions_tab.dart';
import 'tsp_stock_tab.dart';

/// Layar Stock -- kontennya beda per role, mirror pemisahan dashboard TSP vs
/// Operator di Index.html (getTspStock/getTspMesinMonitoring utk tsp/spv,
/// getMesinStock+dropdown mesin utk operator).
class StockHomeScreen extends ConsumerWidget {
  const StockHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isOperator = user?.role == 'operator';

    return Scaffold(
      appBar: AppBar(title: const Text('Stock')),
      body: isOperator ? const _OperatorStockView() : const _TspStockView(),
      bottomNavigationBar: AppBottomNav(currentRoute: '/stock', items: navItemsForRole(user?.role)),
    );
  }
}

class _TspStockView extends StatelessWidget {
  const _TspStockView();

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Stock TSP'),
              Tab(text: 'Monitoring Mesin'),
              Tab(text: 'Penerimaan Shift'),
              Tab(text: 'Pengiriman Shift'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                const TspStockTab(),
                const MonitoringTab(),
                Consumer(
                  builder: (context, ref, _) => TransactionsTab(
                    loader: ref.read(stockRepositoryProvider).getShiftReceipts,
                    emptyLabel: 'Belum ada penerimaan dari WRM di shift ini.',
                  ),
                ),
                Consumer(
                  builder: (context, ref, _) => TransactionsTab(
                    loader: ref.read(stockRepositoryProvider).getShiftDispatches,
                    emptyLabel: 'Belum ada pengiriman ke mesin di shift ini.',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OperatorStockView extends ConsumerStatefulWidget {
  const _OperatorStockView();

  @override
  ConsumerState<_OperatorStockView> createState() => _OperatorStockViewState();
}

class _OperatorStockViewState extends ConsumerState<_OperatorStockView> {
  late String _selectedMesin;

  @override
  void initState() {
    super.initState();
    _selectedMesin = ref.read(referenceRepositoryProvider).mesinList.first;
  }

  @override
  Widget build(BuildContext context) {
    final mesinList = ref.read(referenceRepositoryProvider).mesinList;
    final repo = ref.read(stockRepositoryProvider);

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: DropdownButtonFormField<String>(
              initialValue: _selectedMesin,
              decoration: const InputDecoration(labelText: 'Mesin', border: OutlineInputBorder()),
              items: mesinList.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) {
                if (v != null) setState(() => _selectedMesin = v);
              },
            ),
          ),
          const TabBar(
            tabs: [
              Tab(text: 'Stock'),
              Tab(text: 'Terima'),
              Tab(text: 'Consume'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                MesinStockTab(key: ValueKey('stock-$_selectedMesin'), mesin: _selectedMesin),
                TransactionsTab(
                  key: ValueKey('terima-$_selectedMesin'),
                  loader: () => repo.getOperatorReceipts(_selectedMesin),
                  emptyLabel: 'Belum ada material diterima dari TSP di shift ini.',
                ),
                TransactionsTab(
                  key: ValueKey('consume-$_selectedMesin'),
                  loader: () => repo.getOperatorConsumption(_selectedMesin),
                  emptyLabel: 'Belum ada konsumsi material di shift ini.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
