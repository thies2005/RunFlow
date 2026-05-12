import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/services/readiness/workout_adaptation_engine.dart';

void main() {
  late WorkoutAdaptationEngine engine;

  setUp(() {
    engine = WorkoutAdaptationEngine();
  });

  Workout makeWorkout({
    WorkoutType type = WorkoutType.easy,
    double targetDistance = 10.0,
    int targetDuration = 60,
    double targetPace = 5.5,
    String id = 'w1',
  }) {
    return Workout(
      id: id,
      goalId: 'g1',
      scheduledDate: DateTime(2026, 5, 11),
      workoutType: type,
      description: 'Test',
      targetDistance: targetDistance,
      targetPace: targetPace,
      targetDuration: targetDuration,
      isCompleted: false,
      completedAt: null,
      activityId: null,
    );
  }

  ReadinessResult makeReadiness(
    ReadinessState state, {
    double score = 50.0,
  }) {
    return ReadinessResult(
      compositeScore: score,
      state: state,
      confidence: DataConfidence.full,
      componentScores: const [],
      reasons: const [],
      adaptationType: AdaptationType.none,
    );
  }

  group('race protection', () {
    test('returns null during race week (raceWeeksRemaining = 0)', () {
      final result = engine.adapt(
        workout: makeWorkout(),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 0,
        goalId: 'g1',
      );
      expect(result, isNull);
    });

    test('returns null on race day (raceWeeksRemaining = -1)', () {
      final result = engine.adapt(
        workout: makeWorkout(),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: -1,
        goalId: 'g1',
      );
      expect(result, isNull);
    });

    test('never adapts race type workout regardless of readiness', () {
      for (final state in [
        ReadinessState.moderate,
        ReadinessState.reduced,
        ReadinessState.rest,
      ]) {
        final result = engine.adapt(
          workout: makeWorkout(type: WorkoutType.race),
          readinessResult: makeReadiness(state),
          raceWeeksRemaining: 10,
          goalId: 'g1',
        );
        expect(result, isNull, reason: 'Race workout should not be adapted for $state');
      }
    });
  });

  group('excellent and good readiness', () {
    test('returns null for excellent readiness', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval),
        readinessResult: makeReadiness(ReadinessState.excellent, score: 90),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNull);
    });

    test('returns null for good readiness', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.tempo),
        readinessResult: makeReadiness(ReadinessState.good, score: 70),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNull);
    });
  });

  group('moderate readiness', () {
    test('reduces interval distance by 20%', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'interval');
      expect(result.originalType, 'interval');
      expect(result.adaptedTargetDistance, closeTo(8.0, 0.01));
      expect(result.adaptationType, AdaptationType.volumeReduction);
    });

    test('reduces tempo distance by 20%', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.tempo, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedTargetDistance, closeTo(8.0, 0.01));
      expect(result.adaptationType, AdaptationType.volumeReduction);
    });

    test('reduces long run distance by 15%', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.long, targetDistance: 20.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'long');
      expect(result.adaptedTargetDistance, closeTo(17.0, 0.01));
      expect(result.adaptationType, AdaptationType.volumeReduction);
    });

    test('does not change easy run', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.easy),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNull);
    });

    test('does not change recovery run', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.recovery),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNull);
    });

    test('reduces other type duration by 15%', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.other, targetDuration: 60),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedTargetDuration, 51);
      expect(result.adaptedTargetDistance, 10.0);
      expect(result.adaptationType, AdaptationType.intensityReduction);
    });

    test('keeps original duration unchanged for distance-based types', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.interval,
          targetDistance: 10.0,
          targetDuration: 60,
        ),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDuration, 60);
      expect(result.originalTargetDuration, 60);
    });
  });

  group('reduced readiness', () {
    test('swaps interval to easy', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.interval,
          targetDistance: 10.0,
          targetDuration: 60,
        ),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'easy');
      expect(result.originalType, 'interval');
      expect(result.adaptationType, AdaptationType.swapToEasy);
      expect(result.adaptedTargetDistance, 10.0);
      expect(result.adaptedTargetDuration, lessThanOrEqualTo(45));
    });

    test('swaps tempo to easy', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.tempo),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'easy');
      expect(result.originalType, 'tempo');
    });

    test('swaps long to easy', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.long),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'easy');
      expect(result.originalType, 'long');
    });

    test('caps duration at 45 minutes', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.interval,
          targetDuration: 90,
        ),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDuration, 45);
    });

    test('does not increase duration below 45 minute cap', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.interval,
          targetDuration: 30,
        ),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDuration, 30);
    });

    test('reduces easy run distance by 20%', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.easy,
          targetDistance: 10.0,
          targetDuration: 50,
        ),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'easy');
      expect(result.adaptedTargetDistance, closeTo(8.0, 0.01));
      expect(result.adaptationType, AdaptationType.swapToEasy);
    });

    test('reduces recovery run distance by 20%', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.recovery,
          targetDistance: 6.0,
          targetDuration: 40,
        ),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptedType, 'recovery');
      expect(result.adaptedTargetDistance, closeTo(4.8, 0.01));
      expect(result.adaptationType, AdaptationType.swapToEasy);
    });
  });

  group('rest readiness', () {
    test('produces restOrReschedule adaptation type', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.long,
          targetDistance: 20.0,
          targetDuration: 120,
        ),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNotNull);
      expect(result!.adaptationType, AdaptationType.restOrReschedule);
      expect(result.adaptedType, 'recovery');
    });

    test('caps distance at 50% of original when below 3km threshold', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.easy,
          targetDistance: 4.0,
          targetDuration: 40,
        ),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDistance, closeTo(2.0, 0.01));
    });

    test('caps distance at 3km when 50% exceeds 3km', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.long,
          targetDistance: 20.0,
          targetDuration: 120,
        ),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDistance, 3.0);
    });

    test('caps duration at 30 minutes', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.long,
          targetDistance: 20.0,
          targetDuration: 120,
        ),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDuration, 30);
    });

    test('does not increase duration below 30 minute cap', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.easy,
          targetDistance: 5.0,
          targetDuration: 20,
        ),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.adaptedTargetDuration, 20);
    });

    test('reason indicates rest/reschedule recommendation', () {
      final result = engine.adapt(
        workout: makeWorkout(),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.reason, contains('Rest'));
      expect(result.reason, contains('reschedule'));
    });

    test('preserves original type in AdaptedWorkout', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval),
        readinessResult: makeReadiness(ReadinessState.rest),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.originalType, 'interval');
      expect(result.adaptedType, 'recovery');
    });
  });

  group('AdaptedWorkout fields', () {
    test('stores original and adapted types separately', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.tempo, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.reduced),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.originalType, 'tempo');
      expect(result.adaptedType, 'easy');
      expect(result.originalType, isNot(equals(result.adaptedType)));
    });

    test('populates readiness score and state from result', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate, score: 55.0),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.readinessScore, 55.0);
      expect(result.readinessState, ReadinessState.moderate);
    });

    test('sets isAccepted to false by default', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.isAccepted, false);
    });

    test('sets syncedAt to null', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.syncedAt, isNull);
    });

    test('sets createdAt to current time', () {
      final before = DateTime.now();
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      final after = DateTime.now();
      expect(result!.createdAt.isAfter(before.subtract(const Duration(seconds: 1))), true);
      expect(result.createdAt.isBefore(after.add(const Duration(seconds: 1))), true);
    });

    test('generates deterministic id from workout id', () {
      final result = engine.adapt(
        workout: makeWorkout(id: 'workout_42', type: WorkoutType.interval, targetDistance: 10.0),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.id, 'adapt_workout_42');
    });

    test('preserves original workout data without mutation', () {
      final workout = makeWorkout(
        type: WorkoutType.interval,
        targetDistance: 10.0,
        targetDuration: 60,
        targetPace: 5.5,
      );
      final originalDistance = workout.targetDistance;
      final originalDuration = workout.targetDuration;
      final originalType = workout.workoutType;

      engine.adapt(
        workout: workout,
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );

      expect(workout.targetDistance, originalDistance);
      expect(workout.targetDuration, originalDuration);
      expect(workout.workoutType, originalType);
    });

    test('stores original distance and duration in adapted workout', () {
      final result = engine.adapt(
        workout: makeWorkout(
          type: WorkoutType.interval,
          targetDistance: 10.0,
          targetDuration: 60,
        ),
        readinessResult: makeReadiness(ReadinessState.moderate),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result!.originalTargetDistance, 10.0);
      expect(result.originalTargetDuration, 60);
      expect(result.originalTargetPace, 5.5);
      expect(result.originalWorkoutId, 'w1');
    });
  });

  group('unavailable readiness', () {
    test('returns null for unavailable readiness state', () {
      final result = engine.adapt(
        workout: makeWorkout(type: WorkoutType.interval),
        readinessResult: makeReadiness(ReadinessState.unavailable),
        raceWeeksRemaining: 10,
        goalId: 'g1',
      );
      expect(result, isNull);
    });
  });
}
