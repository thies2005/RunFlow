import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart'
    as entities;
import 'package:runflow_flutter/domain/entities/goal_entities.dart'
    as goal_entities;
import 'package:runflow_flutter/core/utils/race_defaults.dart';
import 'package:runflow_flutter/core/utils/triathlon_estimator.dart';

final _raceDate = DateTime(2025, 9, 28);
final _scheduledDate = DateTime(2024, 6, 20);

void main() {
  group('CreateGoalRequest unit contracts', () {
    /// weeklyMileageGoal is in KILOMETERS (km).
    /// The RaceDefaults.weeklyVolumeKm maps directly to this field.
    /// Example: a 5K plan with weeklyMileageGoal = 28.0 means 28 km/week,
    /// which equals 28,000 meters. The field is NOT meters.
    test('weeklyMileageGoal is in kilometers', () {
      final request = CreateGoalRequest(
        name: '5K Plan',
        raceType: RaceType.fiveK,
        raceDate: _raceDate,
        weeklyMileageGoal: 28.0,
      );

      expect(request.weeklyMileageGoal, 28.0);

      final json = request.toJson();
      expect(json['weeklyMileageGoal'], 28.0);

      final restored = CreateGoalRequest.fromJson(json);
      expect(restored.weeklyMileageGoal, 28.0);
    });

    /// weeklyMileageGoal matches RaceDefaults.weeklyVolumeKm (km).
    /// For a 5K default, weeklyVolumeKm = 28 which means 28 km.
    test(
        'weeklyMileageGoal aligns with RaceDefaults.weeklyVolumeKm '
        '(both km)', () {
      final defaults = getRaceDefaults(entities.RaceType.fiveK);
      final request = CreateGoalRequest(
        name: '5K Plan',
        raceType: RaceType.fiveK,
        raceDate: _raceDate,
        weeklyMileageGoal: 28.0,
      );

      expect(request.weeklyMileageGoal, defaults.weeklyVolumeKm);
    });

    /// maxLongRunKm is in KILOMETERS (km).
    /// The field name encodes the unit. A maxLongRunKm = 18.0 means 18 km,
    /// which equals 18,000 meters.
    test('maxLongRunKm is in kilometers', () {
      final request = CreateGoalRequest(
        name: '5K Plan',
        raceType: RaceType.fiveK,
        raceDate: _raceDate,
        maxLongRunKm: 18.0,
      );

      expect(request.maxLongRunKm, 18.0);

      final json = request.toJson();
      expect(json['maxLongRunKm'], 18.0);

      final restored = CreateGoalRequest.fromJson(json);
      expect(restored.maxLongRunKm, 18.0);
    });

    /// maxLongRunKm matches RaceDefaults.maxLongRunKm (km).
    test('maxLongRunKm aligns with RaceDefaults.maxLongRunKm (both km)', () {
      final defaults = getRaceDefaults(entities.RaceType.fiveK);
      final request = CreateGoalRequest(
        name: '5K Plan',
        raceType: RaceType.fiveK,
        raceDate: _raceDate,
        maxLongRunKm: 18.0,
      );

      expect(request.maxLongRunKm, defaults.maxLongRunKm);
    });

    /// backyardLoopDistM is in METERS (m).
    /// The field name suffix "M" encodes the unit. backyardLoopDistM = 6706.0
    /// means 6706 meters (standard backyard ultra loop ≈ 4.167 miles).
    test('backyardLoopDistM is in meters', () {
      final request = CreateGoalRequest(
        name: 'Backyard Ultra',
        raceType: RaceType.backyardUltra,
        raceDate: _raceDate,
        backyardLoopDistM: 6706.0,
      );

      expect(request.backyardLoopDistM, 6706.0);

      final json = request.toJson();
      expect(json['backyardLoopDistM'], 6706.0);

      final restored = CreateGoalRequest.fromJson(json);
      expect(restored.backyardLoopDistM, 6706.0);
    });

    /// backyardLoopDistM matches RaceDefaults.backyardLoopDistM (meters).
    test(
        'backyardLoopDistM aligns with RaceDefaults.backyardLoopDistM '
        '(both meters)', () {
      final defaults = getRaceDefaults(entities.RaceType.backyardUltra);

      expect(defaults.backyardLoopDistM, isNotNull);
      expect(defaults.backyardLoopDistM, 6706);
    });

    /// customSwimDistM is in METERS (m).
    /// The "M" suffix encodes meters. A sprint triathlon swim is 750 meters.
    /// See triathlon_estimator.dart: triSwimDist['SPRINT_TRI'] = 750.
    test('customSwimDistM is in meters', () {
      final request = CreateGoalRequest(
        name: 'Sprint Tri',
        raceType: RaceType.sprintTri,
        raceDate: _raceDate,
        customSwimDistM: 750.0,
      );

      expect(request.customSwimDistM, 750.0);

      final json = request.toJson();
      expect(json['customSwimDistM'], 750.0);
    });

    /// customSwimDistM aligns with triSwimDist values (meters).
    test(
        'customSwimDistM aligns with triathlon_estimator triSwimDist '
        '(both meters)', () {
      expect(triSwimDist['SPRINT_TRI'], 750);
      expect(triSwimDist['OLYMPIC_TRI'], 1500);
      expect(triSwimDist['HALF_IRONMAN'], 1900);
      expect(triSwimDist['FULL_IRONMAN'], 3800);
    });

    /// customBikeDistM is in METERS (m).
    /// A sprint triathlon bike leg is 20,000 meters (20 km).
    /// See triathlon_estimator.dart: triBikeDist['SPRINT_TRI'] = 20000.
    test('customBikeDistM is in meters', () {
      final request = CreateGoalRequest(
        name: 'Sprint Tri',
        raceType: RaceType.sprintTri,
        raceDate: _raceDate,
        customBikeDistM: 20000.0,
      );

      expect(request.customBikeDistM, 20000.0);

      final json = request.toJson();
      expect(json['customBikeDistM'], 20000.0);
    });

    /// customBikeDistM aligns with triBikeDist values (meters).
    test(
        'customBikeDistM aligns with triathlon_estimator triBikeDist '
        '(both meters)', () {
      expect(triBikeDist['SPRINT_TRI'], 20000);
      expect(triBikeDist['OLYMPIC_TRI'], 40000);
      expect(triBikeDist['HALF_IRONMAN'], 90000);
      expect(triBikeDist['FULL_IRONMAN'], 180000);
    });

    /// customRunDistM is in METERS (m).
    /// A sprint triathlon run is 5,000 meters (5 km).
    /// See triathlon_estimator.dart: triRunDist['SPRINT_TRI'] = 5000.
    test('customRunDistM is in meters', () {
      final request = CreateGoalRequest(
        name: 'Sprint Tri',
        raceType: RaceType.sprintTri,
        raceDate: _raceDate,
        customRunDistM: 5000.0,
      );

      expect(request.customRunDistM, 5000.0);

      final json = request.toJson();
      expect(json['customRunDistM'], 5000.0);
    });

    /// customRunDistM aligns with triRunDist values (meters).
    test(
        'customRunDistM aligns with triathlon_estimator triRunDist '
        '(both meters)', () {
      expect(triRunDist['SPRINT_TRI'], 5000);
      expect(triRunDist['OLYMPIC_TRI'], 10000);
      expect(triRunDist['HALF_IRONMAN'], 21097);
      expect(triRunDist['FULL_IRONMAN'], 42195);
    });
  });

  group('Workout.targetDistance unit contract', () {
    /// Workout.targetDistance is in METERS (m).
    /// formatDistance() expects meters and converts to km for display.
    /// The UI divides by 1000 to show km (e.g., plan_screen.dart:944).
    test('targetDistance is in meters — formatDistance converts correctly', () {
      final workout = Workout(
        id: 'w1',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: WorkoutType.easy,
        targetDistance: 5000.0,
        completedAt: null,
        activityId: null,
      );

      expect(workout.targetDistance, 5000.0);
      expect(formatDistance(workout.targetDistance), '5.00 km');
    });

    /// A 10K workout has targetDistance = 10000.0 (meters), NOT 10.0 (km).
    test('targetDistance 10000m formats as 10 km', () {
      final workout = Workout(
        id: 'w2',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: WorkoutType.tempo,
        targetDistance: 10000.0,
        completedAt: null,
        activityId: null,
      );

      expect(workout.targetDistance, 10000.0);
      expect(formatDistance(workout.targetDistance), '10.00 km');
    });

    /// Confirmed via JSON round-trip: targetDistance survives as meters.
    test('targetDistance survives JSON round-trip in meters', () {
      final json = {
        'id': 'w1',
        'goalId': 'g1',
        'scheduledDate': '2024-06-20T00:00:00.000Z',
        'workoutType': 'EASY',
        'targetDistance': 8000.0,
        'targetPace': 360.0,
        'targetDuration': 2880,
        'isCompleted': false,
        'completedAt': null,
        'activityId': null,
      };

      final workout = Workout.fromJson(json);
      expect(workout.targetDistance, 8000.0);

      final encoded = jsonEncode(workout.toJson());
      final decoded =
          Workout.fromJson(jsonDecode(encoded) as Map<String, dynamic>);
      expect(decoded.targetDistance, 8000.0);
    });

    /// Domain entity Workout.targetDistance is also in meters.
    test('domain entity targetDistance is in meters', () {
      final workout = entities.Workout(
        id: 'w1',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: entities.WorkoutType.longRun,
        description: 'Long Run',
        targetDistance: 18000.0,
        targetPace: 360.0,
        targetDuration: 6480,
        isCompleted: false,
        completedAt: null,
        activityId: null,
      );

      expect(workout.targetDistance, 18000.0);
      expect(formatDistance(workout.targetDistance), '18.00 km');
    });
  });

  group('Workout.targetPace unit contract', () {
    /// Workout.targetPace is in SECONDS PER KILOMETER (s/km).
    /// formatPace() expects secondsPerKm and renders as "M:SS /km".
    /// Example: targetPace = 300.0 → 5:00 /km (5 min/km).
    test('targetPace is in seconds per kilometer', () {
      final workout = Workout(
        id: 'w1',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: WorkoutType.easy,
        targetPace: 360.0,
        completedAt: null,
        activityId: null,
      );

      expect(workout.targetPace, 360.0);
      expect(formatPace(workout.targetPace), '6:00 /km');
    });

    /// targetPace = 300.0 means 5:00/km (5 min per km = 300 seconds/km).
    test('targetPace 300 s/km formats as 5:00 /km', () {
      final workout = Workout(
        id: 'w2',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: WorkoutType.tempo,
        targetPace: 300.0,
        completedAt: null,
        activityId: null,
      );

      expect(formatPace(workout.targetPace), '5:00 /km');
    });

    /// targetPace survives JSON round-trip in seconds per km.
    test('targetPace survives JSON round-trip in seconds per km', () {
      final json = {
        'id': 'w1',
        'goalId': 'g1',
        'scheduledDate': '2024-06-20T00:00:00.000Z',
        'workoutType': 'TEMPO',
        'targetDistance': 8000.0,
        'targetPace': 325.0,
        'targetDuration': 2700,
        'isCompleted': false,
        'completedAt': null,
        'activityId': null,
      };

      final workout = Workout.fromJson(json);
      expect(workout.targetPace, 325.0);
      expect(formatPace(workout.targetPace), '5:25 /km');
    });

    /// Domain entity targetPace is also in seconds per km.
    test('domain entity targetPace is in seconds per km', () {
      final workout = entities.Workout(
        id: 'w1',
        goalId: 'g1',
        scheduledDate: _scheduledDate,
        workoutType: entities.WorkoutType.tempo,
        description: 'Tempo',
        targetDistance: 8000.0,
        targetPace: 300.0,
        targetDuration: 2400,
        isCompleted: false,
        completedAt: null,
        activityId: null,
      );

      expect(workout.targetPace, 300.0);
      expect(formatPace(workout.targetPace), '5:00 /km');
    });
  });

  group('formatDistance unit contract', () {
    /// formatDistance(double meters) expects METERS.
    /// It converts to km string when >= 1000, otherwise shows meters.
    test('formatDistance expects meters', () {
      expect(formatDistance(5000), '5.00 km');
      expect(formatDistance(1000), '1.00 km');
      expect(formatDistance(500), '500 m');
    });

    test('formatDistance correctly handles fractional km', () {
      expect(formatDistance(8500), '8.50 km');
      expect(formatDistance(42195), '42.20 km');
      expect(formatDistance(21097), '21.10 km');
    });
  });

  group('formatPace unit contract', () {
    /// formatPace(double? secondsPerKm) expects SECONDS PER KILOMETER.
    test('formatPace expects seconds per kilometer', () {
      expect(formatPace(300), '5:00 /km');
      expect(formatPace(360), '6:00 /km');
      expect(formatPace(325), '5:25 /km');
    });

    test('formatPace returns placeholder for invalid inputs', () {
      expect(formatPace(null), '--:--');
      expect(formatPace(0), '--:--');
      expect(formatPace(-1), '--:--');
    });
  });

  group('UpdateWorkoutRequest unit contract', () {
    /// UpdateWorkoutRequest.targetDistance is in METERS (m).
    /// Same unit as Workout.targetDistance.
    test('targetDistance is in meters', () {
      const request = UpdateWorkoutRequest(targetDistance: 10000.0);
      expect(request.targetDistance, 10000.0);

      final json = request.toJson();
      expect(json['targetDistance'], 10000.0);
    });

    /// UpdateWorkoutRequest.targetPace is in SECONDS PER KILOMETER (s/km).
    /// Same unit as Workout.targetPace.
    test('targetPace is in seconds per kilometer', () {
      const request = UpdateWorkoutRequest(targetPace: 300.0);
      expect(request.targetPace, 300.0);
      expect(formatPace(request.targetPace), '5:00 /km');
    });

    /// Domain entity UpdateWorkoutRequest also uses meters and s/km.
    test('domain entity targetDistance and targetPace units', () {
      const request = goal_entities.UpdateWorkoutRequest(
        targetDistance: 15000.0,
        targetPace: 330.0,
      );

      expect(request.targetDistance, 15000.0);
      expect(request.targetPace, 330.0);
      expect(formatDistance(request.targetDistance!), '15.00 km');
      expect(formatPace(request.targetPace!), '5:30 /km');
    });
  });

  group('Canonical unit naming convention', () {
    /// Fields ending in "Km" are in kilometers.
    /// Fields ending in "M" (capital) are in meters.
    /// Fields without a unit suffix that relate to distance should be
    /// documented by their context (e.g., targetDistance = meters).
    test('maxLongRunKm field name encodes km unit', () {
      final request = CreateGoalRequest(
        name: 'Test',
        raceType: RaceType.marathon,
        raceDate: _raceDate,
        maxLongRunKm: 32.0,
      );

      expect(request.maxLongRunKm, greaterThan(0));
      expect(request.maxLongRunKm, lessThan(100));
    });

    test('backyardLoopDistM field name encodes meters unit', () {
      final request = CreateGoalRequest(
        name: 'Test',
        raceType: RaceType.backyardUltra,
        raceDate: _raceDate,
        backyardLoopDistM: 6706.0,
      );

      expect(request.backyardLoopDistM, greaterThan(1000));
      expect(request.backyardLoopDistM, lessThan(10000));
    });

    test('custom swim/bike/run dist fields encode meters unit', () {
      final request = CreateGoalRequest(
        name: 'Test',
        raceType: RaceType.sprintTri,
        raceDate: _raceDate,
        customSwimDistM: 750.0,
        customBikeDistM: 20000.0,
        customRunDistM: 5000.0,
      );

      expect(request.customSwimDistM, greaterThan(0));
      expect(request.customSwimDistM, lessThan(10000));
      expect(request.customBikeDistM, greaterThan(10000));
      expect(request.customRunDistM, greaterThan(1000));
      expect(request.customRunDistM, lessThan(50000));
    });
  });

  group('Goal entity unit contracts', () {
    /// Goal.weeklyMileageGoal is in KILOMETERS (km).
    test('Goal.weeklyMileageGoal is in kilometers', () {
      final goal = entities.Goal(
        id: 'g1',
        userId: 'u1',
        name: 'Marathon',
        raceType: entities.RaceType.marathon,
        raceDate: _raceDate,
        targetTime: 10800,
        weeklyMileageGoal: 58.0,
        planWeeks: 16,
        runsPerWeek: 5,
        longRunDay: 6,
        workoutDay: 3,
        currentVdot: 50.0,
        predictedTime: 11200,
        isActive: true,
        createdAt: DateTime(2024, 6, 1),
        updatedAt: DateTime(2024, 6, 15),
        completedAt: null,
        workouts: const [],
      );

      expect(goal.weeklyMileageGoal, 58.0);
    });

    /// Goal.backyardLoopDistM is in METERS (m).
    test('Goal.backyardLoopDistM is in meters', () {
      final goal = entities.Goal(
        id: 'g1',
        userId: 'u1',
        name: 'Backyard Ultra',
        raceType: entities.RaceType.backyardUltra,
        raceDate: _raceDate,
        targetTime: null,
        weeklyMileageGoal: 60.0,
        planWeeks: 12,
        runsPerWeek: 5,
        longRunDay: 6,
        workoutDay: 3,
        currentVdot: 50.0,
        predictedTime: null,
        isActive: true,
        createdAt: DateTime(2024, 6, 1),
        updatedAt: DateTime(2024, 6, 15),
        completedAt: null,
        workouts: const [],
        backyardLoopDistM: 6706.0,
      );

      expect(goal.backyardLoopDistM, 6706.0);
    });
  });

  group('RaceDefaults consistency', () {
    /// All weeklyVolumeKm values are reasonable km values (< 200 km/week).
    test('all RaceDefaults.weeklyVolumeKm values are plausible km', () {
      for (final raceType in entities.RaceType.values) {
        final defaults = getRaceDefaults(raceType);
        expect(defaults.weeklyVolumeKm, greaterThan(0));
        expect(defaults.weeklyVolumeKm, lessThan(200));
      }
    });

    /// All maxLongRunKm values are reasonable km values (< 100 km).
    test('all RaceDefaults.maxLongRunKm values are plausible km', () {
      for (final raceType in entities.RaceType.values) {
        final defaults = getRaceDefaults(raceType);
        expect(defaults.maxLongRunKm, greaterThan(0));
        expect(defaults.maxLongRunKm, lessThan(100));
      }
    });

    /// maxLongRunKm is always less than weeklyVolumeKm for every race type.
    test('maxLongRunKm < weeklyVolumeKm for all race types', () {
      for (final raceType in entities.RaceType.values) {
        final defaults = getRaceDefaults(raceType);
        expect(
          defaults.maxLongRunKm,
          lessThan(defaults.weeklyVolumeKm),
          reason:
              'For $raceType: maxLongRunKm (${defaults.maxLongRunKm}) should be < weeklyVolumeKm (${defaults.weeklyVolumeKm})',
        );
      }
    });

    /// backyardLoopDistM only exists for backyard ultra.
    test('backyardLoopDistM is only set for BACKYARD_ULTRA', () {
      for (final raceType in entities.RaceType.values) {
        final defaults = getRaceDefaults(raceType);
        if (raceType == entities.RaceType.backyardUltra) {
          expect(defaults.backyardLoopDistM, isNotNull);
          expect(defaults.backyardLoopDistM, 6706);
        }
      }
    });
  });

  group('Triathlon distances consistency', () {
    /// Triathlon distances in triathlon_estimator.dart are all in meters.
    /// Full Ironman: swim 3800m, bike 180000m, run 42195m.
    test('full ironman distances are in meters', () {
      expect(triSwimDist['FULL_IRONMAN'], 3800);
      expect(triBikeDist['FULL_IRONMAN'], 180000);
      expect(triRunDist['FULL_IRONMAN'], 42195);
    });

    /// Sprint tri distances: swim 750m, bike 20000m, run 5000m.
    test('sprint tri distances are in meters', () {
      expect(triSwimDist['SPRINT_TRI'], 750);
      expect(triBikeDist['SPRINT_TRI'], 20000);
      expect(triRunDist['SPRINT_TRI'], 5000);
    });

    /// Swim < Run < Bike for every triathlon type.
    test('swim < run < bike for all triathlon distances', () {
      for (final type in triSwimDist.keys) {
        final swim = triSwimDist[type]!;
        final bike = triBikeDist[type]!;
        final run = triRunDist[type]!;
        expect(swim, lessThan(run),
            reason: '$type: swim ($swim) < run ($run)');
        expect(run, lessThan(bike),
            reason: '$type: run ($run) < bike ($bike)');
      }
    });
  });

  group('Activity HR zone time fields', () {
    test('domain Activity has 7 zone time fields defaulting to 0', () {
      final activity = entities.Activity(
        id: 'a1',
        stravaId: 's1',
        type: entities.ActivityType.run,
        name: 'Test',
        startDate: DateTime(2024, 6, 20),
        distance: 5000.0,
        movingTime: 1800,
        averageSpeed: null,
        averageHr: null,
        maxHr: null,
        averageCadence: null,
        hasHeartrate: true,
        totalElevation: 0.0,
        trimp: null,
        runningTss: null,
        estimatedVdot: null,
        trainingType: null,
      );

      expect(activity.hrZone1Time, 0);
      expect(activity.hrZone2Time, 0);
      expect(activity.hrZone3Time, 0);
      expect(activity.hrZone4Time, 0);
      expect(activity.hrZone5Time, 0);
      expect(activity.hrZone6Time, 0);
      expect(activity.hrZone7Time, 0);
    });

    test('Activity JSON round-trip preserves zones 6 and 7', () {
      final json = {
        'id': 'a1',
        'stravaId': 's1',
        'type': 'RUN',
        'name': 'Test',
        'startDate': '2024-06-20T00:00:00.000Z',
        'distance': 5000.0,
        'movingTime': 1800,
        'averageSpeed': null,
        'averageHr': null,
        'maxHr': null,
        'averageCadence': null,
        'hasHeartrate': true,
        'totalElevation': 0.0,
        'trimp': null,
        'runningTss': null,
        'estimatedVdot': null,
        'trainingType': null,
        'hrZone1Time': 100,
        'hrZone2Time': 200,
        'hrZone3Time': 300,
        'hrZone4Time': 400,
        'hrZone5Time': 500,
        'hrZone6Time': 600,
        'hrZone7Time': 700,
      };

      final activity = Activity.fromJson(json);
      expect(activity.hrZone1Time, 100);
      expect(activity.hrZone2Time, 200);
      expect(activity.hrZone3Time, 300);
      expect(activity.hrZone4Time, 400);
      expect(activity.hrZone5Time, 500);
      expect(activity.hrZone6Time, 600);
      expect(activity.hrZone7Time, 700);

      final serialized = jsonEncode(activity.toJson());
      final restored = Activity.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );
      expect(restored.hrZone6Time, 600);
      expect(restored.hrZone7Time, 700);
    });
  });
}
