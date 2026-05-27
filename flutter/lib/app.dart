import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/connectivity_helper.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/main.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';
import 'package:runflow_flutter/presentation/router/app_router.dart';
import 'package:runflow_flutter/presentation/widgets/offline_banner.dart';
import 'package:runflow_flutter/presentation/widgets/consent_banner.dart';

class RunFlowApp extends ConsumerStatefulWidget {
  const RunFlowApp({super.key});

  @override
  ConsumerState<RunFlowApp> createState() => _RunFlowAppState();
}

class _RunFlowAppState extends ConsumerState<RunFlowApp> {
  StreamSubscription<Uri>? _deepLinkSubscription;
  ProviderSubscription<AsyncValue<User?>>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _deepLinkSubscription = initDeepLinks(ref.read(routerProvider));
    ref.read(connectivitySyncListenerProvider);
    _authSubscription = ref.listenManual(authStateProvider, (previous, next) {
      final user = next.asData?.value;
      if (user == null) return;
      unawaited(ref.read(readinessProvider.future).catchError((Object e) {
        debugPrint('RunFlowApp: readiness warmup failed: $e');
        return null;
      }));
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _deepLinkSubscription?.cancel();
    _authSubscription?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final settings = ref.watch(settingsProvider);

    return MaterialApp.router(
      title: 'RunFlow',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        S.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: S.supportedLocales,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: switch (settings.themeMode) {
        AppThemeMode.light => ThemeMode.light,
        AppThemeMode.dark => ThemeMode.dark,
        AppThemeMode.system => ThemeMode.system,
      },
      routerConfig: router,
      builder: (context, child) {
        return ConsentBanner(
          child: Column(
            children: [
              const OfflineBanner(),
              Expanded(child: child ?? const SizedBox.shrink()),
            ],
          ),
        );
      },
    );
  }
}
