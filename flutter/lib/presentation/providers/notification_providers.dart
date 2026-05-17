import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/services/notification_service.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

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

final workoutReminderProvider =
    NotifierProvider<WorkoutReminderNotifier, bool>(
  WorkoutReminderNotifier.new,
);

class WorkoutReminderNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  Future<void> scheduleWorkoutReminders({
    required NotificationService notificationService,
    required List<Workout> upcomingWorkouts,
    int minutesBefore = 30,
  }) async {
    for (final workout in upcomingWorkouts.take(7)) {
      final scheduledTime = workout.scheduledDate.subtract(
        Duration(minutes: minutesBefore),
      );
      if (scheduledTime.isAfter(DateTime.now())) {
        final name = workout.displayDescription ?? workout.description;
        try {
          await notificationService.scheduleNotification(
            id: scheduledTime.millisecondsSinceEpoch.remainder(100000),
            title: 'Workout Reminder',
            body: 'Time for your $name workout!',
            scheduledDate: scheduledTime,
          );
        } catch (e) {
          debugPrint('WorkoutReminder: Failed to schedule notification: $e');
        }
      }
    }
    state = true;
  }
}
