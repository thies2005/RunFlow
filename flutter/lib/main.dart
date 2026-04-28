import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/app.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/presentation/providers/notification_providers.dart';
import 'package:runflow_flutter/services/background_sync.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

final container = ProviderContainer();
final databaseInitFailed = ValueNotifier<bool>(false);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await _initializeServices();

  if (kReleaseMode && AppConstants.sentryDsn.isNotEmpty) {
    await SentryFlutter.init(
      (options) {
        options.dsn = AppConstants.sentryDsn;
        options.tracesSampleRate = 1.0;
        options.enableAutoSessionTracking = true;
        options.attachStacktrace = true;
      },
      appRunner: () => runApp(
        UncontrolledProviderScope(container: container, child: const RunFlowApp()),
      ),
    );
  } else {
    runApp(UncontrolledProviderScope(container: container, child: const RunFlowApp()));
  }
}

Future<void> _initializeServices() async {
  await Future.wait([
    _initDatabase(),
    _initNotifications(),
    _initBackgroundSync(),
  ]);
}

Future<void> _initDatabase() async {
  try {
    final db = AppDatabase.instance;
    await db.initialize();
  } catch (e, stackTrace) {
    databaseInitFailed.value = true;
    logger.error('Database init failed: $e\n$stackTrace');
  }
}

Future<void> _initNotifications() async {
  try {
    final notificationService = container.read(notificationServiceProvider);
    await notificationService.initialize();
  } catch (e, stackTrace) {
    logger.warning('Notification init failed: $e\n$stackTrace');
  }
}

Future<void> _initBackgroundSync() async {
  try {
    await BackgroundSyncService.initialize();
    await BackgroundSyncService.registerPeriodicSync();
  } catch (e, stackTrace) {
    logger.warning('Background sync init failed: $e\n$stackTrace');
  }
}

StreamSubscription<Uri>? initDeepLinks(GoRouter router) {
  try {
    final appLinks = AppLinks();
    return appLinks.uriLinkStream.listen((uri) => _handleDeepLink(uri, router));
  } catch (e, stackTrace) {
    logger.warning('Deep link init failed: $e\n$stackTrace');
  }
  return null;
}

void _handleDeepLink(Uri uri, GoRouter router) {
  if (uri.scheme != 'runflow2') return;

  if (uri.host == 'auth' && uri.pathSegments.contains('callback')) {
    router.go('/dashboard');
    return;
  }

  if (uri.host == 'activities' && uri.pathSegments.isNotEmpty) {
    final id = uri.pathSegments.first;
    router.go('/activities/$id');
    return;
  }
}
