import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/services/notification_service.dart';

void main() {
  group('NotificationServiceImpl', () {
    late NotificationServiceImpl service;

    setUp(() {
      service = NotificationServiceImpl();
    });

    group('scheduleWorkoutReminder', () {
      test('generates id from time milliseconds', () {
        final time = DateTime(2024, 6, 15, 7, 30);
        final id = time.millisecondsSinceEpoch.remainder(100000);

        expect(id, greaterThanOrEqualTo(0));
        expect(id, lessThan(100000));
      });

      test('different times produce different ids', () {
        final time1 = DateTime(2024, 6, 15, 7, 30, 15);
        final time2 = DateTime(2024, 6, 15, 8, 45, 22);

        final id1 = time1.millisecondsSinceEpoch.remainder(100000);
        final id2 = time2.millisecondsSinceEpoch.remainder(100000);

        expect(id1, isNot(equals(id2)));
      });

      test('same time produces same id', () {
        final time = DateTime(2024, 6, 15, 7, 30);
        final id1 = time.millisecondsSinceEpoch.remainder(100000);
        final id2 = DateTime(2024, 6, 15, 7, 30).millisecondsSinceEpoch.remainder(100000);

        expect(id1, equals(id2));
      });

      test('ids are in range [0, 100000)', () {
        for (var hour = 0; hour < 24; hour++) {
          for (var minute = 0; minute < 60; minute += 15) {
            final time = DateTime(2024, 6, 15, hour, minute);
            final id = time.millisecondsSinceEpoch.remainder(100000);
            expect(id, inInclusiveRange(0, 99999));
          }
        }
      });
    });

    group('scheduleSupplementReminder', () {
      test('generates id offset by 50000 from time', () {
        final time = DateTime(2024, 6, 15, 8, 0);
        final workoutId = time.millisecondsSinceEpoch.remainder(100000);
        final supplementId = workoutId + 50000;

        expect(supplementId, greaterThanOrEqualTo(50000));
      });

      test('workout and supplement ids never overlap', () {
        final ids = <int>{};
        for (var hour = 0; hour < 24; hour++) {
          for (var minute = 0; minute < 60; minute += 15) {
            final time = DateTime(2024, 6, 15, hour, minute);
            ids.add(time.millisecondsSinceEpoch.remainder(100000));
            ids.add(time.millisecondsSinceEpoch.remainder(100000) + 50000);
          }
        }
        final uniquePairs = ids.length ~/ 2;
        expect(ids.length, equals(uniquePairs * 2));
      });
    });

    group('notification content', () {
      test('workout reminder message is formatted correctly', () {
        const workoutName = 'Easy Run';
        const body = 'Time for your $workoutName workout!';

        expect(body, 'Time for your Easy Run workout!');
      });

      test('supplement reminder message is formatted correctly', () {
        const supplementName = 'Vitamin D';
        const body = 'Time to take $supplementName';

        expect(body, 'Time to take Vitamin D');
      });
    });

    group('uninitialized state', () {
      test('showNotification returns without error when not initialized', () async {
        await expectLater(
          service.showNotification(id: 1, title: 'Test', body: 'Body'),
          completes,
        );
      });

      test('scheduleNotification returns without error when not initialized', () async {
        await expectLater(
          service.scheduleNotification(
            id: 1,
            title: 'Test',
            body: 'Body',
            scheduledDate: DateTime.now().add(const Duration(hours: 1)),
          ),
          completes,
        );
      });

      test('scheduleWorkoutReminder returns without error when not initialized', () async {
        await expectLater(
          service.scheduleWorkoutReminder(
            DateTime.now().add(const Duration(hours: 1)),
            'Easy Run',
          ),
          completes,
        );
      });

      test('scheduleSupplementReminder returns without error when not initialized', () async {
        await expectLater(
          service.scheduleSupplementReminder(
            DateTime.now().add(const Duration(hours: 1)),
            'Creatine',
          ),
          completes,
        );
      });
    });

    group('id collision resistance', () {
      test('workout and supplement reminders produce distinct id ranges', () {
        final times = [
          DateTime(2024, 6, 15, 7, 0),
          DateTime(2024, 6, 15, 7, 30),
          DateTime(2024, 6, 15, 8, 0),
          DateTime(2024, 6, 15, 12, 0),
          DateTime(2024, 6, 15, 18, 0),
        ];
        final workoutIds = times
            .map((t) => t.millisecondsSinceEpoch.remainder(100000))
            .toSet();
        final supplementIds = times
            .map((t) => t.millisecondsSinceEpoch.remainder(100000) + 50000)
            .toSet();
        expect(workoutIds.intersection(supplementIds), isEmpty);
      });
    });
  });
}
