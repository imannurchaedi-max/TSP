import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/providers.dart';
import 'core/session.dart';
import 'features/auth/login_screen.dart';
import 'features/scan/scan_home_screen.dart';
import 'features/scan/scan_extra_fields_screen.dart';
import 'features/scan/scanner_screen.dart';
import 'features/scan/scan_result_screen.dart';
import 'features/stock/stock_home_screen.dart';
import 'features/sync/sync_queue_screen.dart';

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
      final loggedIn = authListenable.value != null;
      final loggingIn = state.matchedLocation == '/login';
      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/scan';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/scan', builder: (context, state) => const ScanHomeScreen()),
      GoRoute(path: '/scan/fields', builder: (context, state) => const ScanExtraFieldsScreen()),
      GoRoute(path: '/scan/camera', builder: (context, state) => const ScannerScreen()),
      GoRoute(path: '/scan/result', builder: (context, state) => const ScanResultScreen()),
      GoRoute(path: '/stock', builder: (context, state) => const StockHomeScreen()),
      GoRoute(path: '/sync', builder: (context, state) => const SyncQueueScreen()),
    ],
  );
});
