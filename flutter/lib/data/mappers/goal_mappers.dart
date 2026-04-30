import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/data/mappers/dashboard_mappers.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart' as domain;

extension GoalsResponseMapper on GoalsResponse {
  domain.GoalsResponse toDomain() => domain.GoalsResponse(
        goals: goals.map((g) => g.toDomain()).toList(),
      );
}

extension DomainGoalsResponseMapper on domain.GoalsResponse {
  GoalsResponse toData() => GoalsResponse(
        goals: goals.map((g) => g.toData()).toList(),
      );
}

extension WorkoutsResponseMapper on WorkoutsResponse {
  domain.WorkoutsResponse toDomain() => domain.WorkoutsResponse(
        workouts: workouts.map((w) => w.toDomain()).toList(),
      );
}

extension DomainWorkoutsResponseMapper on domain.WorkoutsResponse {
  WorkoutsResponse toData() => WorkoutsResponse(
        workouts: workouts.map((w) => w.toData()).toList(),
      );
}

extension CreateGoalRequestMapper on CreateGoalRequest {
  domain.CreateGoalRequest toDomain() => domain.CreateGoalRequest(
        name: name,
        raceType: raceType.toDomain(),
        raceDate: raceDate,
        planStartDate: planStartDate,
        targetTime: targetTime,
        weeklyMileageGoal: weeklyMileageGoal,
        planWeeks: planWeeks,
        runsPerWeek: runsPerWeek,
        ridesPerWeek: ridesPerWeek,
        swimsPerWeek: swimsPerWeek,
        strengthPerWeek: strengthPerWeek,
        taperWeeks: taperWeeks,
        peakWeeks: peakWeeks,
        buildWeeks: buildWeeks,
        maxLongRunKm: maxLongRunKm,
        longRunDay: longRunDay,
        workoutDay: workoutDay,
        calibrationTime: calibrationTime,
        calibrationDistance: calibrationDistance,
        calibrationFactor: calibrationFactor,
      );
}

extension DomainCreateGoalRequestMapper on domain.CreateGoalRequest {
  CreateGoalRequest toData() => CreateGoalRequest(
        name: name,
        raceType: raceType.toData(),
        raceDate: raceDate,
        planStartDate: planStartDate,
        targetTime: targetTime,
        weeklyMileageGoal: weeklyMileageGoal,
        planWeeks: planWeeks,
        runsPerWeek: runsPerWeek,
        ridesPerWeek: ridesPerWeek,
        swimsPerWeek: swimsPerWeek,
        strengthPerWeek: strengthPerWeek,
        taperWeeks: taperWeeks,
        peakWeeks: peakWeeks,
        buildWeeks: buildWeeks,
        maxLongRunKm: maxLongRunKm,
        longRunDay: longRunDay,
        workoutDay: workoutDay,
        calibrationTime: calibrationTime,
        calibrationDistance: calibrationDistance,
        calibrationFactor: calibrationFactor,
      );
}

extension UpdateGoalRequestMapper on UpdateGoalRequest {
  domain.UpdateGoalRequest toDomain() => domain.UpdateGoalRequest(
        name: name,
        targetTime: targetTime,
        isActive: isActive,
        currentVdot: currentVdot,
      );
}

extension DomainUpdateGoalRequestMapper on domain.UpdateGoalRequest {
  UpdateGoalRequest toData() => UpdateGoalRequest(
        name: name,
        targetTime: targetTime,
        isActive: isActive,
        currentVdot: currentVdot,
      );
}

extension UpdateWorkoutRequestMapper on UpdateWorkoutRequest {
  domain.UpdateWorkoutRequest toDomain() => domain.UpdateWorkoutRequest(
        workoutType: workoutType?.toDomain(),
        description: description,
        targetDistance: targetDistance,
        targetPace: targetPace,
        targetDuration: targetDuration,
        isCompleted: isCompleted,
      );
}

extension DomainUpdateWorkoutRequestMapper on domain.UpdateWorkoutRequest {
  UpdateWorkoutRequest toData() => UpdateWorkoutRequest(
        workoutType: workoutType?.toData(),
        description: description,
        targetDistance: targetDistance,
        targetPace: targetPace,
        targetDuration: targetDuration,
        isCompleted: isCompleted,
      );
}
