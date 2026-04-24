import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:runflow_flutter/services/notification_service.dart';

class FcmService {
  FcmService._();

  static StreamSubscription<RemoteMessage>? _foregroundSubscription;
  static bool _initialized = false;
  static String? _token;

  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();

      _token = await messaging.getToken();
      _initialized = true;
    } catch (_) {
      _initialized = false;
    }
  }

  static Future<String?> getToken() async {
    if (!_initialized) return null;
    try {
      _token = await FirebaseMessaging.instance.getToken();
      return _token;
    } catch (_) {
      return _token;
    }
  }

  static Future<void> setupForegroundHandler(
    NotificationServiceImpl notificationService,
  ) async {
    if (!_initialized) return;

    try {
      _foregroundSubscription =
          FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final notification = message.notification;
        if (notification != null) {
          notificationService.showNotification(
            id: message.hashCode,
            title: notification.title ?? 'RunFlow',
            body: notification.body ?? '',
          );
        }
      });
    } catch (_) {}
  }

  static Future<void> dispose() async {
    await _foregroundSubscription?.cancel();
    _foregroundSubscription = null;
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}
