import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/main.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/router/app_router.dart';
import 'package:runflow_flutter/presentation/widgets/offline_banner.dart';

class RunFlowApp extends ConsumerStatefulWidget {
  const RunFlowApp({super.key});

  @override
  ConsumerState<RunFlowApp> createState() => _RunFlowAppState();
}

class _RunFlowAppState extends ConsumerState<RunFlowApp> {
  @override
  void initState() {
    super.initState();
    initDeepLinks();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final settings = ref.watch(settingsProvider);
    globalRouter = router;

    return MaterialApp.router(
      title: 'RunFlow',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: switch (settings.themeMode) {
        AppThemeMode.light => ThemeMode.light,
        AppThemeMode.dark => ThemeMode.dark,
        AppThemeMode.system => ThemeMode.system,
      },
      routerConfig: router,
      builder: (context, child) {
        return Column(
          children: [
            const OfflineBanner(),
            Expanded(child: child!),
          ],
        );
      },
    );
  }
}
