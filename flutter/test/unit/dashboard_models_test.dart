import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

void main() {
  group('DashboardResponse', () {
    final testJson = {
      'stats': {
        'currentWeekMileage': 42.5,
        'effectiveVO2max': 52.3,
        'rawVO2max': 51.0,
        'vdotCorrectionFactor': 1.02,
        'marathonShape': 6.5,
        'currentVdot': 52.1,
        'ctl': 45.0,
        'atl': 30.0,
        'tsb': 15.0,
        'workloadRatio': 1.2,
        'easyTrimp': 100.0,
        'hrMax': 190,
      },
      'recentActivities': [
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
      ],
      'goals': [
        {
          'id': 'goal1',
          'userId': 'user1',
          'name': 'Berlin Marathon 2024',
          'raceType': 'MARATHON',
          'raceDate': '2024-09-29T00:00:00.000Z',
          'targetTime': 10800,
          'weeklyMileageGoal': 60.0,
          'planWeeks': 16,
          'runsPerWeek': 4,
          'longRunDay': 6,
          'workoutDay': 2,
          'currentVdot': 52.0,
          'predictedTime': 11200,
          'isActive': true,
          'createdAt': '2024-06-01T00:00:00.000Z',
          'updatedAt': '2024-06-15T00:00:00.000Z',
          'completedAt': null,
          'workouts': [],
        },
      ],
      'syncStatus': {
        'syncInProgress': false,
        'lastSyncAt': '2024-06-15T08:00:00.000Z',
        'totalActivities': 150,
      },
      'user': {
        'id': 'user1',
        'email': 'test@example.com',
        'name': 'Test User',
      },
    };

    test('deserializes from JSON', () {
      final response = DashboardResponse.fromJson(testJson);

      expect(response.stats.currentWeekMileage, 42.5);
      expect(response.stats.effectiveVO2max, 52.3);
      expect(response.stats.tsb, 15.0);
      expect(response.stats.marathonShape, 6.5);
      expect(response.recentActivities.length, 1);
      expect(response.recentActivities.first.name, 'Morning Run');
      expect(response.recentActivities.first.type, ActivityType.run);
      expect(response.goals.length, 1);
      expect(response.goals.first.raceType, RaceType.marathon);
      expect(response.goals.first.isActive, true);
      expect(response.syncStatus.totalActivities, 150);
      expect(response.syncStatus.syncInProgress, false);
      expect(response.user.id, 'user1');
    });

    test('round-trip serialization', () {
      final original = DashboardResponse.fromJson(testJson);
      final serialized = jsonEncode(original.toJson());
      final restored = DashboardResponse.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.stats.currentWeekMileage, original.stats.currentWeekMileage);
      expect(restored.stats.effectiveVO2max, original.stats.effectiveVO2max);
      expect(restored.recentActivities.length, original.recentActivities.length);
      expect(restored.recentActivities.first.id, original.recentActivities.first.id);
      expect(restored.goals.length, original.goals.length);
      expect(restored.syncStatus.totalActivities, original.syncStatus.totalActivities);
      expect(restored.user.id, original.user.id);
    });
  });

  group('AnalyticsStats', () {
    test('handles nullable currentVdot', () {
      final json = {
        'currentWeekMileage': 0.0,
        'effectiveVO2max': 0.0,
        'rawVO2max': 0.0,
        'vdotCorrectionFactor': 1.0,
        'marathonShape': 0.0,
        'currentVdot': null,
        'ctl': 0.0,
        'atl': 0.0,
        'tsb': 0.0,
        'workloadRatio': 0.0,
        'easyTrimp': 0.0,
        'hrMax': 190,
      };
      final stats = AnalyticsStats.fromJson(json);

      expect(stats.currentVdot, isNull);
    });
  });

  group('Activity', () {
    test('handles all activity types', () {
      final typeMap = <ActivityType, String>{
        ActivityType.run: 'RUN',
        ActivityType.ride: 'RIDE',
        ActivityType.virtualRide: 'VIRTUAL_RIDE',
        ActivityType.walk: 'WALK',
        ActivityType.hike: 'HIKE',
        ActivityType.swim: 'SWIM',
        ActivityType.workout: 'WORKOUT',
        ActivityType.other: 'OTHER',
      };

      for (final entry in typeMap.entries) {
        final json = {
          'id': 'a1',
          'stravaId': 's1',
          'type': entry.value,
          'name': 'Test',
          'startDate': '2024-01-01T00:00:00.000Z',
          'distance': 1000.0,
          'movingTime': 300,
          'averageSpeed': null,
          'averageHr': null,
          'maxHr': null,
          'averageCadence': null,
          'hasHeartrate': false,
          'totalElevation': 0.0,
          'trimp': null,
          'runningTss': null,
          'estimatedVdot': null,
          'trainingType': null,
        };

        final activity = Activity.fromJson(json);
        expect(activity.type, entry.key);
      }
    });

    test('handles all nullable fields as null', () {
      final json = {
        'id': 'a1',
        'stravaId': 's1',
        'type': 'RUN',
        'name': 'Test Run',
        'startDate': '2024-01-01T00:00:00.000Z',
        'distance': 5000.0,
        'movingTime': 1500,
        'averageSpeed': null,
        'averageHr': null,
        'maxHr': null,
        'averageCadence': null,
        'hasHeartrate': false,
        'totalElevation': 0.0,
        'trimp': null,
        'runningTss': null,
        'estimatedVdot': null,
        'trainingType': null,
      };
      final activity = Activity.fromJson(json);

      expect(activity.averageSpeed, isNull);
      expect(activity.averageHr, isNull);
      expect(activity.maxHr, isNull);
      expect(activity.averageCadence, isNull);
      expect(activity.trimp, isNull);
      expect(activity.runningTss, isNull);
      expect(activity.estimatedVdot, isNull);
      expect(activity.trainingType, isNull);
    });
  });

  group('SyncStatus', () {
    test('handles nullable lastSyncAt', () {
      final json = {
        'syncInProgress': false,
        'lastSyncAt': null,
        'totalActivities': 0,
      };
      final status = SyncStatus.fromJson(json);

      expect(status.syncInProgress, false);
      expect(status.lastSyncAt, isNull);
      expect(status.totalActivities, 0);
    });

    test('round-trip serialization', () {
      final json = {
        'syncInProgress': true,
        'lastSyncAt': '2024-06-15T08:00:00.000Z',
        'totalActivities': 42,
      };
      final original = SyncStatus.fromJson(json);
      final serialized = original.toJson();
      final restored = SyncStatus.fromJson(
        Map<String, dynamic>.from(serialized),
      );

      expect(restored.syncInProgress, original.syncInProgress);
      expect(restored.totalActivities, original.totalActivities);
    });
  });

  group('SyncResult', () {
    test('round-trip serialization', () {
      final json = {
        'success': true,
        'activitiesSynced': 5,
        'lastSyncAt': '2024-06-15T08:00:00.000Z',
      };
      final original = SyncResult.fromJson(json);
      final serialized = original.toJson();
      final restored = SyncResult.fromJson(
        Map<String, dynamic>.from(serialized),
      );

      expect(restored.success, true);
      expect(restored.activitiesSynced, 5);
    });

    test('handles nullable lastSyncAt', () {
      final json = {
        'success': true,
        'activitiesSynced': 0,
        'lastSyncAt': null,
      };
      final result = SyncResult.fromJson(json);

      expect(result.success, true);
      expect(result.lastSyncAt, isNull);
    });
  });

  group('Goal', () {
    test('round-trip serialization', () {
      final json = {
        'id': 'g1',
        'userId': 'u1',
        'name': 'Test Goal',
        'raceType': 'FIVE_K',
        'raceDate': '2024-09-01T00:00:00.000Z',
        'targetTime': null,
        'weeklyMileageGoal': 30.0,
        'planWeeks': 8,
        'runsPerWeek': 3,
        'longRunDay': 6,
        'workoutDay': 3,
        'currentVdot': null,
        'predictedTime': null,
        'isActive': true,
        'createdAt': '2024-06-01T00:00:00.000Z',
        'updatedAt': '2024-06-15T00:00:00.000Z',
        'completedAt': null,
        'workouts': [],
      };
      final original = Goal.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = Goal.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.id, original.id);
      expect(restored.name, original.name);
      expect(restored.raceType, RaceType.fiveK);
      expect(restored.isActive, true);
      expect(restored.workouts, isEmpty);
    });

    test('handles missing workouts field as empty list', () {
      final json = {
        'id': 'g1',
        'userId': 'u1',
        'name': 'Test Goal',
        'raceType': 'FIVE_K',
        'raceDate': '2024-09-01T00:00:00.000Z',
        'targetTime': null,
        'weeklyMileageGoal': 30.0,
        'planWeeks': 8,
        'runsPerWeek': 3,
        'longRunDay': 6,
        'workoutDay': 3,
        'currentVdot': null,
        'predictedTime': null,
        'isActive': true,
        'createdAt': '2024-06-01T00:00:00.000Z',
        'updatedAt': '2024-06-15T00:00:00.000Z',
        'completedAt': null,
      };
      final goal = Goal.fromJson(json);

      expect(goal.workouts, isEmpty);
      expect(goal.workouts, isA<List<Workout>>());
    });

    test('handles null workouts field as empty list', () {
      final json = {
        'id': 'g1',
        'userId': 'u1',
        'name': 'Test Goal',
        'raceType': 'FIVE_K',
        'raceDate': '2024-09-01T00:00:00.000Z',
        'targetTime': null,
        'weeklyMileageGoal': 30.0,
        'planWeeks': 8,
        'runsPerWeek': 3,
        'longRunDay': 6,
        'workoutDay': 3,
        'currentVdot': null,
        'predictedTime': null,
        'isActive': true,
        'createdAt': '2024-06-01T00:00:00.000Z',
        'updatedAt': '2024-06-15T00:00:00.000Z',
        'completedAt': null,
        'workouts': null,
      };
      final goal = Goal.fromJson(json);

      expect(goal.workouts, isEmpty);
    });
  });

  group('Workout', () {
    test('round-trip serialization', () {
      final json = {
        'id': 'w1',
        'goalId': 'g1',
        'scheduledDate': '2024-06-20T00:00:00.000Z',
        'workoutType': 'EASY',
        'description': 'Easy 5K',
        'targetDistance': 5000.0,
        'targetPace': 360.0,
        'targetDuration': 1800,
        'isCompleted': false,
        'completedAt': null,
        'activityId': null,
      };
      final original = Workout.fromJson(json);
      final serialized = original.toJson();
      final restored = Workout.fromJson(
        Map<String, dynamic>.from(serialized),
      );

      expect(restored.id, 'w1');
      expect(restored.workoutType, WorkoutType.easy);
      expect(restored.isCompleted, false);
    });
  });

  group('marathonShape', () {
    test('parses as double from server response', () {
      final json = {
        'currentWeekMileage': 42.5,
        'effectiveVO2max': 52.3,
        'rawVO2max': 51.0,
        'vdotCorrectionFactor': 1.02,
        'marathonShape': 7.5,
        'currentVdot': null,
        'ctl': 45.0,
        'atl': 30.0,
        'tsb': 15.0,
        'workloadRatio': 1.2,
        'easyTrimp': 100.0,
        'hrMax': 190,
      };
      final stats = AnalyticsStats.fromJson(json);

      expect(stats.marathonShape, 7.5);
      expect(stats.marathonShape, isA<double>());
    });
  });
}
