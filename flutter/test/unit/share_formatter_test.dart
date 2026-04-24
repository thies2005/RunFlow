import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/share_formatter.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

void main() {
  group('formatShareText', () {
    test('formats run activity correctly', () {
      final activity = Activity(
        id: '1',
        stravaId: '123',
        type: ActivityType.run,
        name: 'Morning Run',
        startDate: DateTime(2024, 6, 15, 7, 30),
        distance: 8500.0,
        movingTime: 2700,
        averageSpeed: 3.15,
        averageHr: 145.0,
        maxHr: 175,
        averageCadence: 180.0,
        hasHeartrate: true,
        totalElevation: 120.0,
        trimp: 85.0,
        runningTss: 75.0,
        estimatedVdot: 51.2,
        trainingType: 'EASY',
      );

      final result = formatShareText(activity);

      expect(result, 'Check out my Run - 8.50 km in 45m 0s via RunFlow');
    });

    test('formats ride activity correctly', () {
      final activity = Activity(
        id: '2',
        stravaId: '456',
        type: ActivityType.ride,
        name: 'Evening Ride',
        startDate: DateTime(2024, 6, 14, 18, 0),
        distance: 25000.0,
        movingTime: 3600,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: false,
        totalElevation: 200.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      final result = formatShareText(activity);

      expect(result, 'Check out my Ride - 25.00 km in 1h 0m 0s via RunFlow');
    });

    test('formats short distance with meters', () {
      final activity = Activity(
        id: '3',
        stravaId: '789',
        type: ActivityType.walk,
        name: 'Short Walk',
        startDate: DateTime(2024, 6, 15),
        distance: 500.0,
        movingTime: 300,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: false,
        totalElevation: 0.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      final result = formatShareText(activity);

      expect(result, 'Check out my Walk - 500 m in 5m 0s via RunFlow');
    });

    test('formats swim activity', () {
      final activity = Activity(
        id: '4',
        stravaId: '101',
        type: ActivityType.swim,
        name: 'Pool Swim',
        startDate: DateTime(2024, 6, 15),
        distance: 1500.0,
        movingTime: 1800,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: false,
        totalElevation: 0.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      final result = formatShareText(activity);

      expect(result, 'Check out my Swim - 1.50 km in 30m 0s via RunFlow');
    });

    test('formats hike activity', () {
      final activity = Activity(
        id: '5',
        stravaId: '202',
        type: ActivityType.hike,
        name: 'Mountain Hike',
        startDate: DateTime(2024, 6, 15),
        distance: 12000.0,
        movingTime: 7200,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: false,
        totalElevation: 500.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      final result = formatShareText(activity);

      expect(result, 'Check out my Hike - 12.00 km in 2h 0m 0s via RunFlow');
    });

    test('always ends with via RunFlow', () {
      final activity = Activity(
        id: '6',
        stravaId: '303',
        type: ActivityType.other,
        name: 'Some Workout',
        startDate: DateTime(2024, 6, 15),
        distance: 0.0,
        movingTime: 60,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: false,
        totalElevation: 0.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      final result = formatShareText(activity);

      expect(result.endsWith('via RunFlow'), true);
    });
  });
}
