import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/json_compat.dart';

part 'dashboard_models.freezed.dart';
part 'dashboard_models.g.dart';

enum ActivityType {
  @JsonValue('RUN')
  run,
  @JsonValue('RIDE')
  ride,
  @JsonValue('VIRTUAL_RIDE')
  virtualRide,
  @JsonValue('WALK')
  walk,
  @JsonValue('HIKE')
  hike,
  @JsonValue('SWIM')
  swim,
  @JsonValue('WORKOUT')
  workout,
  @JsonValue('OTHER')
  other,
}

enum RaceType {
  @JsonValue('FIVE_K')
  fiveK,
  @JsonValue('TEN_K')
  tenK,
  @JsonValue('HALF_MARATHON')
  halfMarathon,
  @JsonValue('MARATHON')
  marathon,
}

enum WorkoutType {
  easy,
  long,
  tempo,
  interval,
  recovery,
  race,
  other,
}

@Freezed(copyWith: true)
sealed class AnalyticsStats with _$AnalyticsStats {
  const factory AnalyticsStats({
    required double currentWeekMileage,
    required double effectiveVO2max,
    required double rawVO2max,
    required double vdotCorrectionFactor,
    required double marathonShape,
    required double? currentVdot,
    required double ctl,
    required double atl,
    required double tsb,
    required double workloadRatio,
    required double easyTrimp,
    required int hrMax,
  }) = _AnalyticsStats;
  const AnalyticsStats._();

  factory AnalyticsStats.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsStatsFromJson(json);
}

@Freezed(copyWith: true)
sealed class SyncStatus with _$SyncStatus {
  const factory SyncStatus({
    required bool syncInProgress,
    required DateTime? lastSyncAt,
    required int totalActivities,
  }) = _SyncStatus;
  const SyncStatus._();

  factory SyncStatus.fromJson(Map<String, dynamic> json) =>
      _$SyncStatusFromJson(json);
}

@Freezed(copyWith: true)
sealed class SyncResult with _$SyncResult {
  const factory SyncResult({
    required bool success,
    required int activitiesSynced,
    required DateTime? lastSyncAt,
  }) = _SyncResult;
  const SyncResult._();

  factory SyncResult.fromJson(Map<String, dynamic> json) =>
      _$SyncResultFromJson(json);
}

@Freezed(copyWith: true)
sealed class Activity with _$Activity {
  const factory Activity({
    required String id,
    required String stravaId,
    required ActivityType type,
    required String name,
    required DateTime startDate,
    required double distance,
    required int movingTime,
    required double? averageSpeed,
    required double? averageHr,
    required int? maxHr,
    required double? averageCadence,
    required bool hasHeartrate,
    required double totalElevation,
    required double? trimp,
    required double? runningTss,
    required double? estimatedVdot,
    required String? trainingType,
  }) = _Activity;
  const Activity._();

  factory Activity.fromJson(Map<String, dynamic> json) =>
      _$ActivityFromJson(json);
}

@Freezed(copyWith: true)
sealed class Workout with _$Workout {
  const factory Workout({
    required String id,
    required String goalId,
    required DateTime scheduledDate,
    @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)
    required WorkoutType workoutType,
    required String description,
    required double targetDistance,
    required double targetPace,
    required int targetDuration,
    required bool isCompleted,
    required DateTime? completedAt,
    required String? activityId,
  }) = _Workout;
  const Workout._();

  factory Workout.fromJson(Map<String, dynamic> json) =>
      _$WorkoutFromJson(json);
}

@Freezed(copyWith: true)
sealed class Goal with _$Goal {
  const factory Goal({
    required String id,
    required String userId,
    required String name,
    required RaceType raceType,
    required DateTime raceDate,
    required int? targetTime,
    required double? weeklyMileageGoal,
    required int planWeeks,
    required int runsPerWeek,
    required int longRunDay,
    required int workoutDay,
    required double? currentVdot,
    required int? predictedTime,
    required bool isActive,
    required DateTime createdAt,
    required DateTime updatedAt,
    required DateTime? completedAt,
    required List<Workout> workouts,
  }) = _Goal;
  const Goal._();

  factory Goal.fromJson(Map<String, dynamic> json) => _$GoalFromJson(json);
}

@Freezed(copyWith: true)
sealed class DashboardResponse with _$DashboardResponse {
  const factory DashboardResponse({
    required AnalyticsStats stats,
    required List<Activity> recentActivities,
    required List<Goal> goals,
    required SyncStatus syncStatus,
    required User user,
  }) = _DashboardResponse;
  const DashboardResponse._();

  factory DashboardResponse.fromJson(Map<String, dynamic> json) =>
      _$DashboardResponseFromJson(json);
}

WorkoutType workoutTypeFromJson(Object? value) {
  return switch (compatibilityWorkoutTypeFromJson(value)) {
    CompatibilityWorkoutType.easy => WorkoutType.easy,
    CompatibilityWorkoutType.long => WorkoutType.long,
    CompatibilityWorkoutType.tempo => WorkoutType.tempo,
    CompatibilityWorkoutType.interval => WorkoutType.interval,
    CompatibilityWorkoutType.recovery => WorkoutType.recovery,
    CompatibilityWorkoutType.race => WorkoutType.race,
    CompatibilityWorkoutType.other => WorkoutType.other,
  };
}

String workoutTypeToJson(WorkoutType value) {
  return switch (value) {
    WorkoutType.easy => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.easy),
    WorkoutType.long => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.long),
    WorkoutType.tempo => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.tempo),
    WorkoutType.interval => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.interval),
    WorkoutType.recovery => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.recovery),
    WorkoutType.race => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.race),
    WorkoutType.other => compatibilityWorkoutTypeToJson(CompatibilityWorkoutType.other),
  };
}
