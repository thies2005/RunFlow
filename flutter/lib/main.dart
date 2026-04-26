import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/app.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/services/background_sync.dart';
import 'package:runflow_flutter/services/notification_service.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

GoRouter? globalRouter;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await _initializeServices();

  if (kReleaseMode && AppConstants.sentryDsn.isNotEmpty) {
    await SentryFlutter.init(
      (options) {
        options.dsn = AppConstants.sentryDsn;
        options.tracesSampleRate = 1.0;
      },
      appRunner: () => runApp(
        const ProviderScope(child: RunFlowApp()),
      ),
    );
  } else {
    runApp(const ProviderScope(child: RunFlowApp()));
  }
}

Future<void> _initializeServices() async {
  await _initDatabase();
  await _initNotifications();
  await _initBackgroundSync();
}

Future<void> _initDatabase() async {
  try {
    final db = AppDatabase.instance;
    await db.initialize();
  } catch (_) {}
}

Future<void> _initNotifications() async {
  try {
    final notificationService = NotificationServiceImpl();
    await notificationService.initialize();
  } catch (_) {}
}

Future<void> _initBackgroundSync() async {
  try {
    await BackgroundSyncService.initialize();
    await BackgroundSyncService.registerPeriodicSync();
  } catch (_) {}
}

void initDeepLinks() {
  try {
    final appLinks = AppLinks();
    appLinks.uriLinkStream.listen(_handleDeepLink);
  } catch (_) {}
}

void _handleDeepLink(Uri uri) {
  if (uri.scheme != 'runflow2') return;

  if (uri.host == 'auth' && uri.pathSegments.contains('callback')) {
    globalRouter?.go('/dashboard');
    return;
  }

  if (uri.host == 'activities' && uri.pathSegments.isNotEmpty) {
    final id = uri.pathSegments.first;
    globalRouter?.go('/activities/$id');
    return;
  }
}
