import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';

void main() {
  group('GoalsResponse', () {
    test('deserializes from JSON', () {
      final json = {
        'goals': [
          {
            'id': 'g1',
            'userId': 'u1',
            'name': 'Test Goal',
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
          {
            'id': 'g2',
            'userId': 'u1',
            'name': 'Spring 5K',
            'raceType': 'FIVE_K',
            'raceDate': '2024-04-01T00:00:00.000Z',
            'targetTime': null,
            'weeklyMileageGoal': 30.0,
            'planWeeks': 8,
            'runsPerWeek': 3,
            'longRunDay': 6,
            'workoutDay': 3,
            'currentVdot': null,
            'predictedTime': null,
            'isActive': false,
            'createdAt': '2024-01-01T00:00:00.000Z',
            'updatedAt': '2024-04-02T00:00:00.000Z',
            'completedAt': '2024-04-02T00:00:00.000Z',
            'workouts': [],
          },
        ],
      };

      final response = GoalsResponse.fromJson(json);

      expect(response.goals.length, 2);
      expect(response.goals.first.name, 'Test Goal');
      expect(response.goals.first.raceType, RaceType.marathon);
      expect(response.goals.first.isActive, true);
      expect(response.goals.last.name, 'Spring 5K');
      expect(response.goals.last.raceType, RaceType.fiveK);
      expect(response.goals.last.isActive, false);
      expect(response.goals.last.completedAt, isNotNull);
    });

    test('round-trip serialization', () {
      final json = {
        'goals': [
          {
            'id': 'g1',
            'userId': 'u1',
            'name': 'Test',
            'raceType': 'HALF_MARATHON',
            'raceDate': '2024-09-01T00:00:00.000Z',
            'targetTime': 5400,
            'weeklyMileageGoal': 45.0,
            'planWeeks': 12,
            'runsPerWeek': 4,
            'longRunDay': 6,
            'workoutDay': 2,
            'currentVdot': 50.0,
            'predictedTime': 5600,
            'isActive': true,
            'createdAt': '2024-06-01T00:00:00.000Z',
            'updatedAt': '2024-06-15T00:00:00.000Z',
            'completedAt': null,
            'workouts': [],
          },
        ],
      };

      final original = GoalsResponse.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = GoalsResponse.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.goals.length, original.goals.length);
      expect(restored.goals.first.id, original.goals.first.id);
      expect(restored.goals.first.name, original.goals.first.name);
      expect(restored.goals.first.raceType, RaceType.halfMarathon);
    });

    test('handles empty goals list', () {
      final json = {'goals': <Map<String, dynamic>>[]};
      final response = GoalsResponse.fromJson(json);

      expect(response.goals, isEmpty);
    });
  });

  group('WorkoutsResponse', () {
    test('deserializes from JSON', () {
      final json = {
        'workouts': [
          {
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
          },
          {
            'id': 'w2',
            'goalId': 'g1',
            'scheduledDate': '2024-06-21T00:00:00.000Z',
            'workoutType': 'TEMPO',
            'description': 'Tempo 8K',
            'targetDistance': 8000.0,
            'targetPace': 300.0,
            'targetDuration': 2400,
            'isCompleted': true,
            'completedAt': '2024-06-21T08:30:00.000Z',
            'activityId': 'act1',
          },
        ],
      };

      final response = WorkoutsResponse.fromJson(json);

      expect(response.workouts.length, 2);
      expect(response.workouts.first.workoutType, WorkoutType.easy);
      expect(response.workouts.first.isCompleted, false);
      expect(response.workouts.last.workoutType, WorkoutType.tempo);
      expect(response.workouts.last.isCompleted, true);
      expect(response.workouts.last.activityId, 'act1');
    });

    test('round-trip serialization', () {
      final json = {
        'workouts': [
          {
            'id': 'w1',
            'goalId': 'g1',
            'scheduledDate': '2024-06-20T00:00:00.000Z',
            'workoutType': 'LONG',
            'description': 'Long Run',
            'targetDistance': 18000.0,
            'targetPace': 360.0,
            'targetDuration': 6480,
            'isCompleted': false,
            'completedAt': null,
            'activityId': null,
          },
        ],
      };

      final original = WorkoutsResponse.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = WorkoutsResponse.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.workouts.length, original.workouts.length);
      expect(restored.workouts.first.id, 'w1');
      expect(restored.workouts.first.workoutType, WorkoutType.long);
    });

    test('maps newer backend workout types compatibly', () {
      final response = WorkoutsResponse.fromJson({
        'workouts': [
          {
            'id': 'w1',
            'goalId': 'g1',
            'scheduledDate': '2024-06-20T00:00:00.000Z',
            'workoutType': 'LONG_RUN',
            'description': 'Long Run',
            'targetDistance': 18000.0,
            'targetPace': 360.0,
            'targetDuration': 6480,
            'isCompleted': false,
            'completedAt': null,
            'activityId': null,
          },
          {
            'id': 'w2',
            'goalId': 'g1',
            'scheduledDate': '2024-06-21T00:00:00.000Z',
            'workoutType': 'INTERVALS',
            'description': 'Intervals',
            'targetDistance': 8000.0,
            'targetPace': 300.0,
            'targetDuration': 2400,
            'isCompleted': false,
            'completedAt': null,
            'activityId': null,
          },
          {
            'id': 'w3',
            'goalId': 'g1',
            'scheduledDate': '2024-06-22T00:00:00.000Z',
            'workoutType': 'STRENGTH',
            'description': 'Gym',
            'targetDistance': 0.0,
            'targetPace': 0.0,
            'targetDuration': 1800,
            'isCompleted': false,
            'completedAt': null,
            'activityId': null,
          },
        ],
      });

      expect(response.workouts[0].workoutType, WorkoutType.long);
      expect(response.workouts[1].workoutType, WorkoutType.interval);
      expect(response.workouts[2].workoutType, WorkoutType.other);
    });
  });

  group('CreateGoalRequest', () {
    test('serializes to JSON with all fields', () {
      final request = CreateGoalRequest(
        name: 'Berlin Marathon 2025',
        raceType: RaceType.marathon,
        raceDate: DateTime(2025, 9, 28),
        targetTime: 10800,
        weeklyMileageGoal: 60.0,
        planWeeks: 16,
        runsPerWeek: 5,
      );
      final json = request.toJson();

      expect(json['name'], 'Berlin Marathon 2025');
      expect(json['raceType'], 'MARATHON');
      expect(json['targetTime'], 10800);
      expect(json['weeklyMileageGoal'], 60.0);
      expect(json['planWeeks'], 16);
      expect(json['runsPerWeek'], 5);
    });

    test('serializes with default values', () {
      final request = CreateGoalRequest(
        name: '5K Goal',
        raceType: RaceType.fiveK,
        raceDate: DateTime(2024, 12, 1),
      );
      final json = request.toJson();

      expect(json['name'], '5K Goal');
      expect(json['raceType'], 'FIVE_K');
      expect(json['targetTime'], isNull);
      expect(json['weeklyMileageGoal'], isNull);
      expect(json['planWeeks'], 12);
      expect(json['runsPerWeek'], 4);
    });

    test('round-trip serialization', () {
      final original = CreateGoalRequest(
        name: 'Test Goal',
        raceType: RaceType.tenK,
        raceDate: DateTime(2024, 9, 1),
      );
      final json = original.toJson();
      final restored = CreateGoalRequest.fromJson(json);

      expect(restored.name, original.name);
      expect(restored.raceType, RaceType.tenK);
      expect(restored.planWeeks, 12);
      expect(restored.runsPerWeek, 4);
    });

    test('serializes all race types correctly', () {
      final types = <RaceType, String>{
        RaceType.fiveK: 'FIVE_K',
        RaceType.tenK: 'TEN_K',
        RaceType.halfMarathon: 'HALF_MARATHON',
        RaceType.marathon: 'MARATHON',
      };

      for (final entry in types.entries) {
        final request = CreateGoalRequest(
          name: 'Test',
          raceType: entry.key,
          raceDate: DateTime(2024, 9, 1),
        );
        expect(request.toJson()['raceType'], entry.value);
      }
    });
  });

  group('UpdateGoalRequest', () {
    test('serializes to JSON with all fields', () {
      const request = UpdateGoalRequest(
        name: 'Updated Goal',
        targetTime: 7200,
        isActive: false,
        currentVdot: 55.0,
      );
      final json = request.toJson();

      expect(json['name'], 'Updated Goal');
      expect(json['targetTime'], 7200);
      expect(json['isActive'], false);
      expect(json['currentVdot'], 55.0);
    });

    test('serializes with null fields', () {
      const request = UpdateGoalRequest();
      final json = request.toJson();

      expect(json['name'], isNull);
      expect(json['targetTime'], isNull);
      expect(json['isActive'], isNull);
      expect(json['currentVdot'], isNull);
    });

    test('round-trip serialization', () {
      const original = UpdateGoalRequest(
        name: 'Test Update',
        targetTime: 5400,
      );
      final json = original.toJson();
      final restored = UpdateGoalRequest.fromJson(json);

      expect(restored.name, 'Test Update');
      expect(restored.targetTime, 5400);
      expect(restored.isActive, isNull);
      expect(restored.currentVdot, isNull);
    });

    test('can toggle isActive', () {
      const request = UpdateGoalRequest(isActive: false);
      expect(request.isActive, false);

      const toggled = UpdateGoalRequest(isActive: true);
      expect(toggled.isActive, true);
    });
  });
}
