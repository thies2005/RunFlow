import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

abstract class NotificationService {
  Future<void> initialize({void Function(String? payload)? onNotificationTap});
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  });
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledDate,
  });
  Future<void> cancelAllNotifications();
  Future<void> cancelNotification(int id);
  Future<void> scheduleReadinessMorningNotification({
    required DateTime scheduledTime,
    int? readinessScore,
    String? readinessState,
  });
}

class NotificationServiceImpl implements NotificationService {
  NotificationServiceImpl({
    FlutterLocalNotificationsPlugin? plugin,
  }) : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;

  static const String _channelId = 'runflow_notifications';
  static const String _channelName = 'RunFlow Notifications';
  static const String _channelDescription = 'Notifications for RunFlow app';

  bool _initialized = false;
  void Function(String? payload)? _onNotificationTap;

  @override
  Future<void> initialize({
    void Function(String? payload)? onNotificationTap,
  }) async {
    if (_initialized) return;

    _onNotificationTap = onNotificationTap;

    try {
      tz_data.initializeTimeZones();
      final offset = DateTime.now().timeZoneOffset;
      final totalMinutes = offset.inMinutes;
      final absMinutes = totalMinutes.abs();
      final h = (absMinutes ~/ 60).toString().padLeft(2, '0');
      final m = (absMinutes % 60).toString().padLeft(2, '0');
      final sign = totalMinutes >= 0 ? '-' : '+';
      final tzName = 'Etc/GMT$sign$h${m != '00' ? ':$m' : ''}';
      try {
        tz.setLocalLocation(tz.getLocation(tzName));
      } catch (e) {
        debugPrint('NotificationService: Failed to set local timezone: $e');
        tz.setLocalLocation(tz.getLocation('UTC'));
      }

      const androidSettings = AndroidInitializationSettings(
        '@mipmap/ic_launcher',
      );
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      const settings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _plugin.initialize(
        settings: settings,
        onDidReceiveNotificationResponse: _onNotificationResponse,
      );
      _initialized = true;
    } catch (e) {
      debugPrint('NotificationService: Failed to initialize: $e');
      _initialized = false;
    }
  }

  void _onNotificationResponse(NotificationResponse response) {
    _onNotificationTap?.call(response.payload);
  }

  @override
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) return;

    try {
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
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

      await _plugin.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: details,
        payload: payload,
      );
    } catch (e) {
      logger.error('[NotificationServiceImpl] Show notification failed: $e');
    }
  }

  @override
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledDate,
  }) async {
    if (!_initialized) return;

    try {
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
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

      final tzDateTime = tz.TZDateTime.from(scheduledDate, tz.local);

      await _plugin.zonedSchedule(
        id: id,
        title: title,
        body: body,
        scheduledDate: tzDateTime,
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      );
    } catch (e) {
      logger.error('[NotificationServiceImpl] Schedule notification failed: $e');
    }
  }

  @override
  Future<void> cancelAllNotifications() async {
    if (!_initialized) return;
    try {
      await _plugin.cancelAll();
    } catch (e) {
      logger.error('[NotificationServiceImpl] Cancel all notifications failed: $e');
    }
  }

  @override
  Future<void> cancelNotification(int id) async {
    if (!_initialized) return;
    try {
      await _plugin.cancel(id: id);
    } catch (e) {
      logger.error('[NotificationServiceImpl] Cancel notification failed: $e');
    }
  }

  @override
  Future<void> scheduleReadinessMorningNotification({
    required DateTime scheduledTime,
    int? readinessScore,
    String? readinessState,
  }) async {
    if (!_initialized) return;

    try {
      final body = readinessScore != null
          ? 'Your readiness score is $readinessScore ($readinessState). Tap for details.'
          : 'Tap to check your morning readiness.';
      final id =
          DateTime.now().millisecondsSinceEpoch.remainder(100000) + 100000;

      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
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

      final tzDateTime = tz.TZDateTime.from(scheduledTime, tz.local);

      await _plugin.zonedSchedule(
        id: id,
        title: 'Morning Readiness',
        body: body,
        scheduledDate: tzDateTime,
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        payload: '{"type": "readiness_morning_check"}',
      );
    } catch (e) {
      logger.error(
        '[NotificationServiceImpl] Schedule readiness notification failed: $e',
      );
    }
  }

  Future<void> scheduleWorkoutReminder(
    DateTime time,
    String workoutName,
  ) async {
    final id = time.millisecondsSinceEpoch.remainder(100000);
    await scheduleNotification(
      id: id,
      title: 'Workout Reminder',
      body: 'Time for your $workoutName workout!',
      scheduledDate: time,
    );
  }

  Future<void> scheduleSupplementReminder(
    DateTime time,
    String supplementName,
  ) async {
    final id = time.millisecondsSinceEpoch.remainder(100000) + 50000;
    await scheduleNotification(
      id: id,
      title: 'Supplement Reminder',
      body: 'Time to take $supplementName',
      scheduledDate: time,
    );
  }
}
