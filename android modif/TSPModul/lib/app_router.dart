import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/providers.dart';
import 'core/session.dart';
import 'features/auth/login_screen.dart';
import 'features/scan/scan_home_screen.dart';
import 'features/scan/scan_extra_fields_screen.dart';
import 'features/scan/scanner_screen.dart';
import 'features/history/history_home_screen.dart';
import 'features/material/material_home_screen.dart';
import 'features/reprint/reprint_home_screen.dart';
import 'features/scan/scan_result_screen.dart';
import 'features/scan/scan_flow_state.dart';
import 'features/stock/stock_home_screen.dart';
import 'features/sync/sync_queue_screen.dart';
import 'features/validator/validator_home_screen.dart';

/// Route yang cuma boleh diakses role tsp/spv, mirror tab-btn-reprint/minmax/
/// validasi yang di-hide di Index.html untuk role lain. Server (Code.js/
/// ApiService.js) tetap jadi penjaga otorisasi sesungguhnya lewat
/// requireRole_() -- ini cuma defense-in-depth di client supaya operator
/// yang somehow ter-deep-link ke sini langsung diarahkan balik, bukan
/// melihat layar yang aksinya toh akan ditolak server.
const _kTspOnlyRoutes = ['/reprint', '/material', '/validator'];
const _kScanFlowRoutes = ['/scan/fields', '/scan/camera'];

final routerProvider = Provider<GoRouter>((ref) {
  final authListenable = ValueNotifier<SessionUser?>(ref.read(currentUserProvider));
  ref.listen<SessionUser?>(currentUserProvider, (previous, next) {
    authListenable.value = next;
  });
  ref.onDispose(authListenable.dispose);

  return GoRouter(
    initialLocation: '/scan',
    refreshListenable: authListenable,
    redirect: (context, state) {
      final user = authListenable.value;
      final loggedIn = user != null;
      final loggingIn = state.matchedLocation == '/login';
      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/scan';

      if (loggedIn && _kTspOnlyRoutes.contains(state.matchedLocation) && user.role != 'tsp' && user.role != 'spv') {
        return '/scan';
      }
      if (loggedIn && _kScanFlowRoutes.contains(state.matchedLocation) && ref.read(scanFlowProvider).event == null) {
        return '/scan';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/scan', builder: (context, state) => const ScanHomeScreen()),
      GoRoute(path: '/scan/fields', builder: (context, state) => const ScanExtraFieldsScreen()),
      GoRoute(path: '/scan/camera', builder: (context, state) => const ScannerScreen()),
      GoRoute(path: '/scan/result', builder: (context, state) => const ScanResultScreen()),
      GoRoute(path: '/stock', builder: (context, state) => const StockHomeScreen()),
      GoRoute(path: '/history', builder: (context, state) => const HistoryHomeScreen()),
      GoRoute(path: '/reprint', builder: (context, state) => const ReprintHomeScreen()),
      GoRoute(path: '/material', builder: (context, state) => const MaterialHomeScreen()),
      GoRoute(path: '/validator', builder: (context, state) => const ValidatorHomeScreen()),
      GoRoute(path: '/sync', builder: (context, state) => const SyncQueueScreen()),
    ],
  );
});
