import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

part 'goal_models.freezed.dart';
part 'goal_models.g.dart';

@Freezed(copyWith: true)
sealed class GoalsResponse with _$GoalsResponse {
  const factory GoalsResponse({
    @Default([]) List<Goal> goals,
  }) = _GoalsResponse;
  const GoalsResponse._();

  factory GoalsResponse.fromJson(Map<String, dynamic> json) =>
      _$GoalsResponseFromJson(json);
}

@Freezed(copyWith: true)
sealed class WorkoutsResponse with _$WorkoutsResponse {
  const factory WorkoutsResponse({
    @Default([]) List<Workout> workouts,
  }) = _WorkoutsResponse;
  const WorkoutsResponse._();

  factory WorkoutsResponse.fromJson(Map<String, dynamic> json) =>
      _$WorkoutsResponseFromJson(json);
}

@Freezed(copyWith: true)
sealed class CreateGoalRequest with _$CreateGoalRequest {
  const factory CreateGoalRequest({
    required String name,
    required RaceType raceType,
    required DateTime raceDate,
    DateTime? planStartDate,
    int? targetTime,
    double? weeklyMileageGoal,
    @Default(12) int planWeeks,
    @Default(4) int runsPerWeek,
    @Default(0) int ridesPerWeek,
    @Default(0) int swimsPerWeek,
    @Default(0) int strengthPerWeek,
    @Default(2) int taperWeeks,
    @Default(4) int peakWeeks,
    @Default(4) int buildWeeks,
    double? maxLongRunKm,
    @Default(0) int longRunDay,
    @Default(3) int workoutDay,
    @Default(1) int swimDay,
    List<int>? restDays,
    int? calibrationTime,
    String? calibrationDistance,
    double? calibrationFactor,
    double? backyardLoopDistM,
    int? targetLaps,
    String? sport,
    @JsonKey(name: 'athleteCssOverride') double? athleteCssOverride,
    @JsonKey(name: 'athleteBikeSpeedOverride') double? athleteBikeSpeedOverride,
    double? customSwimDistM,
    double? customBikeDistM,
    double? customRunDistM,
  }) = _CreateGoalRequest;
  const CreateGoalRequest._();

  factory CreateGoalRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateGoalRequestFromJson(json);
}

@Freezed(copyWith: true)
sealed class UpdateGoalRequest with _$UpdateGoalRequest {
  const factory UpdateGoalRequest({
    String? name,
    int? targetTime,
    bool? isActive,
    double? currentVdot,
  }) = _UpdateGoalRequest;
  const UpdateGoalRequest._();

  factory UpdateGoalRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateGoalRequestFromJson(json);
}

@Freezed(copyWith: true)
sealed class UpdateWorkoutRequest with _$UpdateWorkoutRequest {
  const factory UpdateWorkoutRequest({
    WorkoutType? workoutType,
    String? description,
    double? targetDistance,
    double? targetPace,
    int? targetDuration,
    bool? isCompleted,
  }) = _UpdateWorkoutRequest;
  const UpdateWorkoutRequest._();

  factory UpdateWorkoutRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateWorkoutRequestFromJson(json);
}
