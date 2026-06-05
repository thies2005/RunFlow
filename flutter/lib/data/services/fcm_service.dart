import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/services/notification_service.dart';

Future<bool> registerPushToken({
  required Dio dio,
  required String token,
}) async {
  try {
    await dio.post(
      '${ApiConstants.fullApiUrl}/device/token',
      data: {
        'token': token,
        'platform': Platform.isAndroid ? 'android' : 'ios',
      },
    );
    return true;
  } on DioException catch (e) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 404) return true;
    if (statusCode != null && statusCode >= 500) return false;
    return false;
  } catch (e) {
    logger.debug('FcmService: Failed to register push token: $e');
    return false;
  }
}

class FcmService {
  FcmService({Dio? dio}) : _dio = dio;

  final Dio? _dio;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<String>? _tokenRefreshSubscription;
  bool _initialized = false;
  String? _token;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();

      _token = await messaging.getToken();
      _initialized = true;

      if (_token != null && _dio != null) {
        await _sendTokenToServer(_token!);
      }

      _tokenRefreshSubscription = messaging.onTokenRefresh.listen(
        (token) => _sendTokenToServer(token),
      );
    } catch (e) {
      logger.debug('FcmService: Failed to initialize: $e');
      _initialized = false;
    }
  }

  Future<void> _sendTokenToServer(String token) async {
    if (_dio == null) return;
    try {
      await registerPushToken(dio: _dio, token: token);
    } catch (e) {
      logger.error('[FcmService] Send token to server failed: $e');
    }
  }

  Future<String?> getToken() async {
    if (!_initialized) return null;
    try {
      _token = await FirebaseMessaging.instance.getToken();
      return _token;
    } catch (e) {
      logger.debug('FcmService: Failed to get FCM token: $e');
      return _token;
    }
  }

  Future<void> setupForegroundHandler(
    NotificationService notificationService,
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
    } catch (e) {
      logger.error('[FcmService] Setup foreground handler failed: $e');
    }
  }

  Future<void> dispose() async {
    await _foregroundSubscription?.cancel();
    _foregroundSubscription = null;
    await _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = null;
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();

  final notification = message.notification;
  if (notification == null) return;

  final plugin = FlutterLocalNotificationsPlugin();
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const iosSettings = DarwinInitializationSettings();
  const settings = InitializationSettings(
    android: androidSettings,
    iOS: iosSettings,
  );
  await plugin.initialize(settings: settings);

  const androidDetails = AndroidNotificationDetails(
    'runflow_background',
    'RunFlow Background',
    channelDescription: 'Background notifications for RunFlow',
    importance: Importance.high,
    priority: Priority.high,
  );
  const iosDetails = DarwinNotificationDetails(
    presentAlert: true,
    presentBadge: true,
    presentSound: true,
  );
  const details = NotificationDetails(
    android: androidDetails,
    iOS: iosDetails,
  );

  await plugin.show(
    id: message.hashCode,
    title: notification.title ?? 'RunFlow',
    body: notification.body ?? '',
    notificationDetails: details,
  );
}
