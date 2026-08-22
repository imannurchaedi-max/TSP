import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_router.dart';
import 'core/background_sync.dart';
import 'core/connectivity_sync.dart';
import 'core/providers.dart';
import 'features/shell/connectivity_banner.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initBackgroundSync();
  runApp(const ProviderScope(child: TspModulApp()));
}

class TspModulApp extends ConsumerStatefulWidget {
  const TspModulApp({super.key});

  @override
  ConsumerState<TspModulApp> createState() => _TspModulAppState();
}

class _TspModulAppState extends ConsumerState<TspModulApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Restore sesi tersimpan (kalau ada) supaya user tidak perlu login ulang
      // tiap buka app.
      final user = await ref.read(authRepositoryProvider).restoreSession();
      if (user != null && mounted) {
        ref.read(currentUserProvider.notifier).state = user;
      }
      ref.read(connectivitySyncWatcherProvider).start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'TSP Modul',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF2563EB),
        useMaterial3: true,
      ),
      routerConfig: router,
      builder: (context, child) => ConnectivityBanner(child: child ?? const SizedBox.shrink()),
    );
  }
}
