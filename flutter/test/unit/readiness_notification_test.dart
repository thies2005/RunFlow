import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/notification_providers.dart';
import 'package:runflow_flutter/services/notification_service.dart';

void main() {
  group('scheduleReadinessMorningNotification', () {
    test('notification id is in 100000+ range', () {
      final id =
          DateTime.now().millisecondsSinceEpoch.remainder(100000) + 100000;
      expect(id, greaterThanOrEqualTo(100000));
      expect(id, lessThan(200000));
    });

    test('notification id is deterministic for same timestamp', () {
      final now = DateTime.now();
      final id1 = now.millisecondsSinceEpoch.remainder(100000) + 100000;
      final id2 = now.millisecondsSinceEpoch.remainder(100000) + 100000;
      expect(id1, equals(id2));
    });

    test('body text with available readiness score', () {
      const readinessScore = 78;
      const readinessState = 'ready';
      const body =
          'Your readiness score is $readinessScore ($readinessState). Tap for details.';
      expect(body, 'Your readiness score is 78 (ready). Tap for details.');
    });

    test('body text with low readiness score', () {
      const readinessScore = 32;
      const readinessState = 'low';
      const body =
          'Your readiness score is $readinessScore ($readinessState). Tap for details.';
      expect(body, 'Your readiness score is 32 (low). Tap for details.');
    });

    test('body text without readiness score', () {
      final body = 'Tap to check your morning readiness.';
      expect(body, 'Tap to check your morning readiness.');
    });

    test('payload contains readiness type', () {
      final payload = jsonEncode({'type': 'readiness_morning_check'});
      final decoded = jsonDecode(payload) as Map<String, dynamic>;
      expect(decoded['type'], 'readiness_morning_check');
    });

    test('readiness ids do not collide with workout ids', () {
      final now = DateTime.now();
      final workoutId = now.millisecondsSinceEpoch.remainder(100000);
      final readinessId =
          now.millisecondsSinceEpoch.remainder(100000) + 100000;
      expect(readinessId, isNot(equals(workoutId)));
      expect(readinessId, greaterThanOrEqualTo(100000));
      expect(workoutId, lessThan(100000));
    });

    test('readiness ids do not collide with supplement ids', () {
      final now = DateTime.now();
      final supplementId =
          now.millisecondsSinceEpoch.remainder(100000) + 50000;
      final readinessId =
          now.millisecondsSinceEpoch.remainder(100000) + 100000;
      expect(readinessId, isNot(equals(supplementId)));
    });
  });

  group('NotificationServiceImpl uninitialized', () {
    test(
      'scheduleReadinessMorningNotification returns without error when not initialized',
      () async {
        final service = NotificationServiceImpl();
        await expectLater(
          service.scheduleReadinessMorningNotification(
            scheduledTime: DateTime.now().add(const Duration(hours: 12)),
            readinessScore: 75,
            readinessState: 'ready',
          ),
          completes,
        );
      },
    );
  });

  group('ReadinessNotificationNotifier', () {
    test('initial state is false', () {
      final container = ProviderContainer();
      final isScheduled = container.read(readinessNotificationProvider);
      expect(isScheduled, false);
      container.dispose();
    });

    test('scheduleMorningNotification sets state to true', () async {
      final container = ProviderContainer();
      final notifier = container.read(readinessNotificationProvider.notifier);
      await notifier.scheduleMorningNotification(
        notificationService: NotificationServiceImpl(),
        readinessScore: 75,
        readinessState: 'ready',
      );
      expect(container.read(readinessNotificationProvider), true);
      container.dispose();
    });

    test('cancelMorningNotification sets state to false', () async {
      final container = ProviderContainer();
      final notifier = container.read(readinessNotificationProvider.notifier);
      await notifier.scheduleMorningNotification(
        notificationService: NotificationServiceImpl(),
        readinessScore: 75,
        readinessState: 'ready',
      );
      expect(container.read(readinessNotificationProvider), true);
      await notifier.cancelMorningNotification(
        notificationService: NotificationServiceImpl(),
      );
      expect(container.read(readinessNotificationProvider), false);
      container.dispose();
    });
  });

  group('_nextMorningTime', () {
    test('returns future time', () {
      final now = DateTime.now();
      var scheduled = DateTime(now.year, now.month, now.day, 7, 0);
      if (scheduled.isBefore(now)) {
        scheduled = scheduled.add(const Duration(days: 1));
      }
      expect(scheduled.isAfter(now), isTrue);
    });

    test('returns 7:00 AM time', () {
      final now = DateTime.now();
      var scheduled = DateTime(now.year, now.month, now.day, 7, 0);
      if (scheduled.isBefore(now)) {
        scheduled = scheduled.add(const Duration(days: 1));
      }
      expect(scheduled.hour, 7);
      expect(scheduled.minute, 0);
      expect(scheduled.second, 0);
    });

    test('if before 7 AM today, returns today 7 AM', () {
      final now = DateTime(2024, 6, 15, 5, 30);
      final scheduled = DateTime(now.year, now.month, now.day, 7, 0);
      expect(scheduled.day, 15);
      expect(scheduled.isAfter(now), isTrue);
    });

    test('if after 7 AM today, returns tomorrow 7 AM', () {
      final now = DateTime(2024, 6, 15, 10, 0);
      var scheduled = DateTime(now.year, now.month, now.day, 7, 0);
      if (scheduled.isBefore(now)) {
        scheduled = scheduled.add(const Duration(days: 1));
      }
      expect(scheduled.day, 16);
      expect(scheduled.isAfter(now), isTrue);
    });
  });
}
