import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../shell/app_bottom_nav.dart';
import 'history_mesin_view.dart';
import 'history_portal_view.dart';
import 'history_tsp_view.dart';

String _todayIso() {
  final now = DateTime.now();
  return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
}

/// Layar Riwayat -- role tsp/spv lihat Riwayat Stock TSP, role operator lihat
/// Riwayat Stock Mesin + Riwayat Portal (per jam), mirror pemisahan endpoint
/// getHistoricalTspStock vs getHistoricalMesinStock/getPortalHistory di Code.js.
class HistoryHomeScreen extends ConsumerStatefulWidget {
  const HistoryHomeScreen({super.key});

  @override
  ConsumerState<HistoryHomeScreen> createState() => _HistoryHomeScreenState();
}

class _HistoryHomeScreenState extends ConsumerState<HistoryHomeScreen> {
  late String _dateStr = _todayIso();
  String _shiftNum = '1';
  late String _selectedMesin;

  @override
  void initState() {
    super.initState();
    _selectedMesin = ref.read(referenceRepositoryProvider).mesinList.first;
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_dateStr) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      setState(() {
        _dateStr =
            '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isOperator = user?.role == 'operator';
    final mesinList = ref.read(referenceRepositoryProvider).mesinList;

    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(_dateStr),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    initialValue: _shiftNum,
                    decoration: const InputDecoration(
                      labelText: 'Shift',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                    items: const [
                      DropdownMenuItem(value: '1', child: Text('Shift 1')),
                      DropdownMenuItem(value: '2', child: Text('Shift 2')),
                      DropdownMenuItem(value: '3', child: Text('Shift 3')),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _shiftNum = v);
                    },
                  ),
                ),
              ],
            ),
          ),
          if (isOperator)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: DropdownButtonFormField<String>(
                initialValue: _selectedMesin,
                decoration: const InputDecoration(labelText: 'Mesin', border: OutlineInputBorder()),
                items: mesinList.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _selectedMesin = v);
                },
              ),
            ),
          const SizedBox(height: 8),
          Expanded(
            child: isOperator
                ? DefaultTabController(
                    length: 2,
                    child: Column(
                      children: [
                        const TabBar(tabs: [Tab(text: 'Stock Mesin'), Tab(text: 'Portal per Jam')]),
                        Expanded(
                          child: TabBarView(
                            children: [
                              HistoryMesinView(
                                key: ValueKey('mesin-$_selectedMesin-$_dateStr-$_shiftNum'),
                                mesin: _selectedMesin,
                                dateStr: _dateStr,
                                shiftNum: _shiftNum,
                              ),
                              HistoryPortalView(
                                key: ValueKey('portal-$_selectedMesin-$_dateStr-$_shiftNum'),
                                mesin: _selectedMesin,
                                dateStr: _dateStr,
                                shiftNum: _shiftNum,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                : HistoryTspView(
                    key: ValueKey('tsp-$_dateStr-$_shiftNum'),
                    dateStr: _dateStr,
                    shiftNum: _shiftNum,
                  ),
          ),
        ],
      ),
      bottomNavigationBar: const AppBottomNav(currentIndex: 2, items: kMainNavItems),
    );
  }
}
