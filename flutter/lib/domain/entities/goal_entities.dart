import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

class GoalsResponse {
  const GoalsResponse({required this.goals});

  final List<Goal> goals;

  GoalsResponse copyWith({List<Goal>? goals}) {
    return GoalsResponse(goals: goals ?? this.goals);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GoalsResponse &&
          runtimeType == other.runtimeType &&
          listEquals(goals, other.goals);

  @override
  int get hashCode => Object.hashAll(goals);
}

class WorkoutsResponse {
  const WorkoutsResponse({required this.workouts});

  final List<Workout> workouts;

  WorkoutsResponse copyWith({List<Workout>? workouts}) {
    return WorkoutsResponse(workouts: workouts ?? this.workouts);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WorkoutsResponse &&
          runtimeType == other.runtimeType &&
          listEquals(workouts, other.workouts);

  @override
  int get hashCode => Object.hashAll(workouts);
}

class CreateGoalRequest {
  const CreateGoalRequest({
    required this.name,
    required this.raceType,
    required this.raceDate,
    this.planStartDate,
    this.targetTime,
    this.weeklyMileageGoal,
    this.planWeeks = 12,
    this.runsPerWeek = 4,
    this.ridesPerWeek = 0,
    this.swimsPerWeek = 0,
    this.strengthPerWeek = 0,
    this.taperWeeks = 2,
    this.peakWeeks = 4,
    this.buildWeeks = 4,
    this.maxLongRunKm,
    this.longRunDay = 0,
    this.workoutDay = 3,
    this.swimDay = 1,
    this.restDays,
    this.calibrationTime,
    this.calibrationDistance,
    this.calibrationFactor,
    this.backyardLoopDistM,
    this.targetLaps,
  });

  final String name;
  final RaceType raceType;
  final DateTime raceDate;
  final DateTime? planStartDate;
  final int? targetTime;
  final double? weeklyMileageGoal;
  final int planWeeks;
  final int runsPerWeek;
  final int ridesPerWeek;
  final int swimsPerWeek;
  final int strengthPerWeek;
  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;
  final double? maxLongRunKm;
  final int longRunDay;
  final int workoutDay;
  final int swimDay;
  final List<int>? restDays;
  final int? calibrationTime;
  final String? calibrationDistance;
  final double? calibrationFactor;
  final double? backyardLoopDistM;
  final int? targetLaps;

  CreateGoalRequest copyWith({
    String? name,
    RaceType? raceType,
    DateTime? raceDate,
    DateTime? planStartDate,
    int? targetTime,
    double? weeklyMileageGoal,
    int? planWeeks,
    int? runsPerWeek,
    int? ridesPerWeek,
    int? swimsPerWeek,
    int? strengthPerWeek,
    int? taperWeeks,
    int? peakWeeks,
    int? buildWeeks,
    double? maxLongRunKm,
    int? longRunDay,
    int? workoutDay,
    int? swimDay,
    List<int>? restDays,
    int? calibrationTime,
    String? calibrationDistance,
    double? calibrationFactor,
    double? backyardLoopDistM,
    int? targetLaps,
  }) {
    return CreateGoalRequest(
      name: name ?? this.name,
      raceType: raceType ?? this.raceType,
      raceDate: raceDate ?? this.raceDate,
      planStartDate: planStartDate ?? this.planStartDate,
      targetTime: targetTime ?? this.targetTime,
      weeklyMileageGoal: weeklyMileageGoal ?? this.weeklyMileageGoal,
      planWeeks: planWeeks ?? this.planWeeks,
      runsPerWeek: runsPerWeek ?? this.runsPerWeek,
      ridesPerWeek: ridesPerWeek ?? this.ridesPerWeek,
      swimsPerWeek: swimsPerWeek ?? this.swimsPerWeek,
      strengthPerWeek: strengthPerWeek ?? this.strengthPerWeek,
      taperWeeks: taperWeeks ?? this.taperWeeks,
      peakWeeks: peakWeeks ?? this.peakWeeks,
      buildWeeks: buildWeeks ?? this.buildWeeks,
      maxLongRunKm: maxLongRunKm ?? this.maxLongRunKm,
      longRunDay: longRunDay ?? this.longRunDay,
      workoutDay: workoutDay ?? this.workoutDay,
      swimDay: swimDay ?? this.swimDay,
      restDays: restDays ?? this.restDays,
      calibrationTime: calibrationTime ?? this.calibrationTime,
      calibrationDistance: calibrationDistance ?? this.calibrationDistance,
      calibrationFactor: calibrationFactor ?? this.calibrationFactor,
      backyardLoopDistM: backyardLoopDistM ?? this.backyardLoopDistM,
      targetLaps: targetLaps ?? this.targetLaps,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CreateGoalRequest &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          raceType == other.raceType &&
          raceDate == other.raceDate &&
          planStartDate == other.planStartDate &&
          targetTime == other.targetTime &&
          weeklyMileageGoal == other.weeklyMileageGoal &&
          planWeeks == other.planWeeks &&
          runsPerWeek == other.runsPerWeek &&
          ridesPerWeek == other.ridesPerWeek &&
          swimsPerWeek == other.swimsPerWeek &&
          strengthPerWeek == other.strengthPerWeek &&
          taperWeeks == other.taperWeeks &&
          peakWeeks == other.peakWeeks &&
          buildWeeks == other.buildWeeks &&
          maxLongRunKm == other.maxLongRunKm &&
          longRunDay == other.longRunDay &&
          workoutDay == other.workoutDay &&
          swimDay == other.swimDay &&
          listEquals(restDays, other.restDays) &&
          calibrationTime == other.calibrationTime &&
          calibrationDistance == other.calibrationDistance &&
          calibrationFactor == other.calibrationFactor &&
          backyardLoopDistM == other.backyardLoopDistM &&
          targetLaps == other.targetLaps;

  @override
  int get hashCode => Object.hashAll([
    name,
    raceType,
    raceDate,
    planStartDate,
    targetTime,
    weeklyMileageGoal,
    planWeeks,
    runsPerWeek,
    ridesPerWeek,
    swimsPerWeek,
    strengthPerWeek,
    taperWeeks,
    peakWeeks,
    buildWeeks,
    maxLongRunKm,
    longRunDay,
    workoutDay,
    swimDay,
    Object.hashAll(restDays ?? const []),
    calibrationTime,
    calibrationDistance,
    calibrationFactor,
    backyardLoopDistM,
    targetLaps,
  ]);
}

class UpdateGoalRequest {
  const UpdateGoalRequest({
    this.name,
    this.targetTime,
    this.isActive,
    this.currentVdot,
  });

  final String? name;
  final int? targetTime;
  final bool? isActive;
  final double? currentVdot;

  UpdateGoalRequest copyWith({
    String? name,
    int? targetTime,
    bool? isActive,
    double? currentVdot,
  }) {
    return UpdateGoalRequest(
      name: name ?? this.name,
      targetTime: targetTime ?? this.targetTime,
      isActive: isActive ?? this.isActive,
      currentVdot: currentVdot ?? this.currentVdot,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateGoalRequest &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          targetTime == other.targetTime &&
          isActive == other.isActive &&
          currentVdot == other.currentVdot;

  @override
  int get hashCode => Object.hash(name, targetTime, isActive, currentVdot);
}

class UpdateWorkoutRequest {
  const UpdateWorkoutRequest({
    this.workoutType,
    this.description,
    this.targetDistance,
    this.targetPace,
    this.targetDuration,
    this.isCompleted,
  });

  final WorkoutType? workoutType;
  final String? description;
  final double? targetDistance;
  final double? targetPace;
  final int? targetDuration;
  final bool? isCompleted;

  UpdateWorkoutRequest copyWith({
    WorkoutType? workoutType,
    String? description,
    double? targetDistance,
    double? targetPace,
    int? targetDuration,
    bool? isCompleted,
  }) {
    return UpdateWorkoutRequest(
      workoutType: workoutType ?? this.workoutType,
      description: description ?? this.description,
      targetDistance: targetDistance ?? this.targetDistance,
      targetPace: targetPace ?? this.targetPace,
      targetDuration: targetDuration ?? this.targetDuration,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateWorkoutRequest &&
          runtimeType == other.runtimeType &&
          workoutType == other.workoutType &&
          description == other.description &&
          targetDistance == other.targetDistance &&
          targetPace == other.targetPace &&
          targetDuration == other.targetDuration &&
          isCompleted == other.isCompleted;

  @override
  int get hashCode => Object.hash(
    workoutType,
    description,
    targetDistance,
    targetPace,
    targetDuration,
    isCompleted,
  );
}
