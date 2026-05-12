import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/services/notification_service.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationServiceImpl();
});

final readinessNotificationProvider =
    NotifierProvider<ReadinessNotificationNotifier, bool>(
  ReadinessNotificationNotifier.new,
);

class ReadinessNotificationNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  Future<void> scheduleMorningNotification({
    required NotificationService notificationService,
    int? readinessScore,
    String? readinessState,
  }) async {
    final tomorrow7am = _nextMorningTime();
    await notificationService.scheduleReadinessMorningNotification(
      scheduledTime: tomorrow7am,
      readinessScore: readinessScore,
      readinessState: readinessState,
    );
    state = true;
  }

  Future<void> cancelMorningNotification({
    required NotificationService notificationService,
  }) async {
    await notificationService.cancelAllNotifications();
    state = false;
  }

  DateTime _nextMorningTime() {
    final now = DateTime.now();
    var scheduled = DateTime(now.year, now.month, now.day, 7, 0);
    if (scheduled.isBefore(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }
}
