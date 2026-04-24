import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

part 'goal_models.freezed.dart';
part 'goal_models.g.dart';

@Freezed(copyWith: true)
sealed class GoalsResponse with _$GoalsResponse {
  const factory GoalsResponse({
    required List<Goal> goals,
  }) = _GoalsResponse;
  const GoalsResponse._();

  factory GoalsResponse.fromJson(Map<String, dynamic> json) =>
      _$GoalsResponseFromJson(json);
}

@Freezed(copyWith: true)
sealed class WorkoutsResponse with _$WorkoutsResponse {
  const factory WorkoutsResponse({
    required List<Workout> workouts,
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
    int? targetTime,
    double? weeklyMileageGoal,
    @Default(12) int planWeeks,
    @Default(4) int runsPerWeek,
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
