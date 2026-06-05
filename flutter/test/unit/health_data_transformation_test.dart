import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/services/health_connect_service.dart';

void main() {
  group('Health data transformation', () {
    group('convertHealthDataPointToActivity', () {
      test('converts running workout to Activity', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.RUNNING,
            totalDistance: 5000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 1500)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.id, 'test-uuid');
        expect(activity.type, ActivityType.run);
        expect(activity.name, 'Running');
        expect(activity.distance, 5000.0);
        expect(activity.movingTime, 1500);
        expect(activity.startDate, now);
        expect(activity.stravaId, '');
        expect(activity.hasHeartrate, false);
        expect(activity.totalElevation, 0.0);
      });

      test('calculates average speed from distance and duration', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.RUNNING,
            totalDistance: 10000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 3000)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.distance, 10000.0);
        expect(activity.movingTime, 3000);
        expect(activity.averageSpeed, closeTo(3.333, 0.01));
      });

      test('handles zero duration gracefully', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.WALKING,
            totalDistance: 1000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now,
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.averageSpeed, null);
        expect(activity.distance, 1000.0);
        expect(activity.movingTime, 0);
      });

      test('maps biking to ride type', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.BIKING,
            totalDistance: 25000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 3600)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.type, ActivityType.ride);
        expect(activity.name, 'Cycling');
      });

      test('maps swimming to swim type', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.SWIMMING,
            totalDistance: 1500,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 1800)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.type, ActivityType.swim);
      });

      test('maps unknown workout types to other', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.ROWING,
            totalDistance: null,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 2000)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.type, ActivityType.other);
        expect(activity.distance, 0.0);
      });

      test('handles null total distance', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.YOGA,
            totalDistance: null,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 3600)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.distance, 0.0);
        expect(activity.averageSpeed, closeTo(0.0, 0.001));
      });

      test('maps hiking correctly', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.HIKING,
            totalDistance: 12000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 5400)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.type, ActivityType.hike);
        expect(activity.name, 'Hiking');
      });

      test('maps treadmill run to run type', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.RUNNING_TREADMILL,
            totalDistance: 5000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 1500)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.type, ActivityType.run);
        expect(activity.name, 'Treadmill Run');
      });

      test('null fields default correctly', () {
        final now = DateTime.now();
        final point = HealthDataPoint(
          uuid: 'test-uuid',
          value: WorkoutHealthValue(
            workoutActivityType: HealthWorkoutActivityType.RUNNING,
            totalDistance: 5000,
          ),
          type: HealthDataType.WORKOUT,
          unit: HealthDataUnit.METER,
          dateFrom: now,
          dateTo: now.add(const Duration(seconds: 1500)),
          sourcePlatform: HealthPlatformType.googleHealthConnect,
          sourceDeviceId: 'test',
          sourceId: 'test',
          sourceName: 'test',
        );

        final activity = HealthConnectServiceImpl.convertHealthDataPointToActivity(point);

        expect(activity.averageHr, null);
        expect(activity.maxHr, null);
        expect(activity.averageCadence, null);
        expect(activity.trimp, null);
        expect(activity.runningTss, null);
        expect(activity.estimatedVdot, null);
        expect(activity.trainingType, null);
      });
    });
  });
}
