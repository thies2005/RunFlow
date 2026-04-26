import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';

void main() {
  group('HealthConnectServiceImpl.deduplicateActivities', () {
    Activity createActivity({
      required DateTime startDate,
      required double distance,
      String id = 'test',
    }) {
      return Activity(
        id: id,
        stravaId: '',
        type: ActivityType.run,
        name: 'Test',
        startDate: startDate,
        distance: distance,
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
    }

    test('returns all activities when server list is empty', () {
      final healthActivities = [
        createActivity(
          startDate: DateTime(2024, 6, 15, 7, 30),
          distance: 5000.0,
        ),
        createActivity(
          startDate: DateTime(2024, 6, 14, 8, 0),
          distance: 3000.0,
        ),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: [],
      );

      expect(result.length, 2);
    });

    test('filters out activities that match startDate and distance', () {
      final date = DateTime(2024, 6, 15, 7, 30);
      final healthActivities = [
        createActivity(startDate: date, distance: 5000.0, id: 'health1'),
        createActivity(
          startDate: DateTime(2024, 6, 14, 8, 0),
          distance: 3000.0,
          id: 'health2',
        ),
      ];
      final serverActivities = [
        createActivity(startDate: date, distance: 5000.0, id: 'server1'),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result.length, 1);
      expect(result.first.id, 'health2');
    });

    test('returns empty list when all activities are duplicates', () {
      final date = DateTime(2024, 6, 15, 7, 30);
      final healthActivities = [
        createActivity(startDate: date, distance: 5000.0),
      ];
      final serverActivities = [
        createActivity(startDate: date, distance: 5000.0),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result, isEmpty);
    });

    test('does not match when distance differs', () {
      final date = DateTime(2024, 6, 15, 7, 30);
      final healthActivities = [
        createActivity(startDate: date, distance: 5000.0),
      ];
      final serverActivities = [
        createActivity(startDate: date, distance: 4999.0),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result.length, 1);
    });

    test('does not match when start date differs', () {
      final healthActivities = [
        createActivity(
          startDate: DateTime(2024, 6, 15, 7, 30),
          distance: 5000.0,
        ),
      ];
      final serverActivities = [
        createActivity(
          startDate: DateTime(2024, 6, 15, 7, 31),
          distance: 5000.0,
        ),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result.length, 1);
    });

    test('handles empty health activities list', () {
      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: [],
        serverActivities: [
          createActivity(
            startDate: DateTime(2024, 6, 15),
            distance: 5000.0,
          ),
        ],
      );

      expect(result, isEmpty);
    });

    test('handles both empty lists', () {
      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: [],
        serverActivities: [],
      );

      expect(result, isEmpty);
    });

    test('deduplicates against multiple server activities', () {
      final healthActivities = [
        createActivity(
          startDate: DateTime(2024, 6, 15, 7, 0),
          distance: 5000.0,
          id: 'h1',
        ),
        createActivity(
          startDate: DateTime(2024, 6, 15, 8, 0),
          distance: 3000.0,
          id: 'h2',
        ),
        createActivity(
          startDate: DateTime(2024, 6, 15, 9, 0),
          distance: 7000.0,
          id: 'h3',
        ),
      ];
      final serverActivities = [
        createActivity(
          startDate: DateTime(2024, 6, 15, 7, 0),
          distance: 5000.0,
          id: 's1',
        ),
        createActivity(
          startDate: DateTime(2024, 6, 15, 9, 0),
          distance: 7000.0,
          id: 's2',
        ),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result.length, 1);
      expect(result.first.id, 'h2');
    });

    test('handles fractional distance differences by rounding', () {
      final date = DateTime(2024, 6, 15, 7, 30);
      final healthActivities = [
        createActivity(startDate: date, distance: 5000.4),
      ];
      final serverActivities = [
        createActivity(startDate: date, distance: 5000.6),
      ];

      final result = HealthConnectServiceImpl.deduplicateActivities(
        healthActivities: healthActivities,
        serverActivities: serverActivities,
      );

      expect(result.length, 1);
    });
  });
}
