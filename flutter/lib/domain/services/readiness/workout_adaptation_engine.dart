import 'dart:math';

import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';

class WorkoutAdaptationEngine {
  AdaptedWorkout? adapt({
    required Workout workout,
    required ReadinessResult readinessResult,
    required int raceWeeksRemaining,
    required String goalId,
  }) {
    if (raceWeeksRemaining <= 0) return null;
    if (workout.workoutType == WorkoutType.race) return null;

    final state = readinessResult.state;

    if (state == ReadinessState.excellent ||
        state == ReadinessState.good ||
        state == ReadinessState.unavailable) {
      return null;
    }

    if (state == ReadinessState.moderate) {
      return _adaptModerate(workout, readinessResult);
    }

    if (state == ReadinessState.reduced) {
      return _adaptReduced(workout, readinessResult);
    }

    if (state == ReadinessState.rest) {
      return _adaptRest(workout, readinessResult);
    }

    return null;
  }

  AdaptedWorkout? _adaptModerate(
    Workout workout,
    ReadinessResult readinessResult,
  ) {
    final type = workout.workoutType;

    if (type == WorkoutType.easy || type == WorkoutType.recovery) {
      return null;
    }

    if (type == WorkoutType.intervals || type == WorkoutType.tempo) {
      return AdaptedWorkout(
        id: 'adapt_${workout.id}',
        originalWorkoutId: workout.id,
        date: workout.scheduledDate,
        originalType: type.name,
        adaptedType: type.name,
        adaptationType: AdaptationType.volumeReduction,
        originalTargetDistance: workout.targetDistance,
        adaptedTargetDistance: workout.targetDistance * 0.8,
        originalTargetDuration: workout.targetDuration,
        adaptedTargetDuration: workout.targetDuration,
        originalTargetPace: workout.targetPace,
        adaptedTargetPace: workout.targetPace,
        reason: 'Volume reduced by 20% due to moderate readiness',
        readinessScore: readinessResult.compositeScore,
        readinessState: readinessResult.state,
        isAccepted: false,
        createdAt: DateTime.now(),
        syncedAt: null,
      );
    }

    if (type == WorkoutType.longRun) {
      return AdaptedWorkout(
        id: 'adapt_${workout.id}',
        originalWorkoutId: workout.id,
        date: workout.scheduledDate,
        originalType: type.name,
        adaptedType: type.name,
        adaptationType: AdaptationType.volumeReduction,
        originalTargetDistance: workout.targetDistance,
        adaptedTargetDistance: workout.targetDistance * 0.85,
        originalTargetDuration: workout.targetDuration,
        adaptedTargetDuration: workout.targetDuration,
        originalTargetPace: workout.targetPace,
        adaptedTargetPace: workout.targetPace,
        reason: 'Volume reduced by 15% due to moderate readiness',
        readinessScore: readinessResult.compositeScore,
        readinessState: readinessResult.state,
        isAccepted: false,
        createdAt: DateTime.now(),
        syncedAt: null,
      );
    }

    return AdaptedWorkout(
      id: 'adapt_${workout.id}',
      originalWorkoutId: workout.id,
      date: workout.scheduledDate,
      originalType: type.name,
      adaptedType: type.name,
      adaptationType: AdaptationType.intensityReduction,
      originalTargetDistance: workout.targetDistance,
      adaptedTargetDistance: workout.targetDistance,
      originalTargetDuration: workout.targetDuration,
      adaptedTargetDuration: (workout.targetDuration * 0.85).round(),
      originalTargetPace: workout.targetPace,
      adaptedTargetPace: workout.targetPace,
      reason: 'Duration reduced by 15% due to moderate readiness',
      readinessScore: readinessResult.compositeScore,
      readinessState: readinessResult.state,
      isAccepted: false,
      createdAt: DateTime.now(),
      syncedAt: null,
    );
  }

  AdaptedWorkout _adaptReduced(
    Workout workout,
    ReadinessResult readinessResult,
  ) {
    final type = workout.workoutType;
    final isAlreadyEasy =
        type == WorkoutType.easy || type == WorkoutType.recovery;

    final adaptedTypeName =
        isAlreadyEasy ? type.name : WorkoutType.easy.name;
    final adaptedDistance =
        isAlreadyEasy ? workout.targetDistance * 0.8 : workout.targetDistance;
    final adaptedDuration = min(workout.targetDuration, 45);
    final reason = isAlreadyEasy
        ? 'Distance reduced by 20% due to reduced readiness'
        : 'Workout swapped to easy run due to reduced readiness';

    return AdaptedWorkout(
      id: 'adapt_${workout.id}',
      originalWorkoutId: workout.id,
      date: workout.scheduledDate,
      originalType: type.name,
      adaptedType: adaptedTypeName,
      adaptationType: AdaptationType.swapToEasy,
      originalTargetDistance: workout.targetDistance,
      adaptedTargetDistance: adaptedDistance,
      originalTargetDuration: workout.targetDuration,
      adaptedTargetDuration: adaptedDuration,
      originalTargetPace: workout.targetPace,
      adaptedTargetPace: workout.targetPace,
      reason: reason,
      readinessScore: readinessResult.compositeScore,
      readinessState: readinessResult.state,
      isAccepted: false,
      createdAt: DateTime.now(),
      syncedAt: null,
    );
  }

  AdaptedWorkout _adaptRest(
    Workout workout,
    ReadinessResult readinessResult,
  ) {
    final minimalDistance = min(workout.targetDistance * 0.5, 3.0);
    final adaptedDuration = min(workout.targetDuration, 30);

    return AdaptedWorkout(
      id: 'adapt_${workout.id}',
      originalWorkoutId: workout.id,
      date: workout.scheduledDate,
      originalType: workout.workoutType.name,
      adaptedType: 'recovery',
      adaptationType: AdaptationType.restOrReschedule,
      originalTargetDistance: workout.targetDistance,
      adaptedTargetDistance: minimalDistance,
      originalTargetDuration: workout.targetDuration,
      adaptedTargetDuration: adaptedDuration,
      originalTargetPace: workout.targetPace,
      adaptedTargetPace: workout.targetPace,
      reason: 'Rest or reschedule recommended due to low readiness',
      readinessScore: readinessResult.compositeScore,
      readinessState: readinessResult.state,
      isAccepted: false,
      createdAt: DateTime.now(),
      syncedAt: null,
    );
  }
}
