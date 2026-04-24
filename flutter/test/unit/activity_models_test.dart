import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

void main() {
  group('ActivitiesResponse', () {
    test('deserializes from JSON', () {
      final json = {
        'activities': [
          {
            'id': 'act1',
            'stravaId': '12345',
            'type': 'RUN',
            'name': 'Morning Run',
            'startDate': '2024-06-15T07:30:00.000Z',
            'distance': 8500.0,
            'movingTime': 2700,
            'averageSpeed': 3.15,
            'averageHr': 145.0,
            'maxHr': 175,
            'averageCadence': 180.0,
            'hasHeartrate': true,
            'totalElevation': 120.0,
            'trimp': 85.0,
            'runningTss': 75.0,
            'estimatedVdot': 51.2,
            'trainingType': 'EASY',
          },
          {
            'id': 'act2',
            'stravaId': '12346',
            'type': 'RIDE',
            'name': 'Evening Ride',
            'startDate': '2024-06-14T18:00:00.000Z',
            'distance': 25000.0,
            'movingTime': 3600,
            'averageSpeed': null,
            'averageHr': null,
            'maxHr': null,
            'averageCadence': null,
            'hasHeartrate': false,
            'totalElevation': 200.0,
            'trimp': null,
            'runningTss': null,
            'estimatedVdot': null,
            'trainingType': null,
          },
        ],
        'total': 42,
        'limit': 50,
        'offset': 0,
        'hasMore': false,
      };

      final response = ActivitiesResponse.fromJson(json);

      expect(response.activities.length, 2);
      expect(response.activities.first.id, 'act1');
      expect(response.activities.first.type, ActivityType.run);
      expect(response.activities.first.name, 'Morning Run');
      expect(response.activities[1].type, ActivityType.ride);
      expect(response.total, 42);
      expect(response.limit, 50);
      expect(response.offset, 0);
      expect(response.hasMore, false);
    });

    test('round-trip serialization', () {
      final json = {
        'activities': [
          {
            'id': 'a1',
            'stravaId': 's1',
            'type': 'RUN',
            'name': 'Test',
            'startDate': '2024-01-01T00:00:00.000Z',
            'distance': 5000.0,
            'movingTime': 1500,
            'averageSpeed': 3.33,
            'averageHr': 150.0,
            'maxHr': 180,
            'averageCadence': 175.0,
            'hasHeartrate': true,
            'totalElevation': 50.0,
            'trimp': 70.0,
            'runningTss': 60.0,
            'estimatedVdot': 48.0,
            'trainingType': 'TEMPO',
          },
        ],
        'total': 1,
        'limit': 50,
        'offset': 0,
        'hasMore': true,
      };

      final original = ActivitiesResponse.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = ActivitiesResponse.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.activities.length, original.activities.length);
      expect(restored.activities.first.id, original.activities.first.id);
      expect(restored.total, original.total);
      expect(restored.hasMore, original.hasMore);
      expect(restored.limit, original.limit);
      expect(restored.offset, original.offset);
    });

    test('handles empty activities list', () {
      final json = {
        'activities': <Map<String, dynamic>>[],
        'total': 0,
        'limit': 50,
        'offset': 0,
        'hasMore': false,
      };

      final response = ActivitiesResponse.fromJson(json);

      expect(response.activities, isEmpty);
      expect(response.total, 0);
      expect(response.hasMore, false);
    });

    test('handles pagination fields', () {
      final json = {
        'activities': <Map<String, dynamic>>[],
        'total': 100,
        'limit': 50,
        'offset': 50,
        'hasMore': true,
      };

      final response = ActivitiesResponse.fromJson(json);

      expect(response.total, 100);
      expect(response.limit, 50);
      expect(response.offset, 50);
      expect(response.hasMore, true);
    });
  });
}
