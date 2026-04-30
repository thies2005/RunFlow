import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/json_compat.dart';

part 'dashboard_models.freezed.dart';
part 'dashboard_models.g.dart';

double _parseDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value) ?? 0.0;
  }
  if (value is Map) {
    // Handle case where server returns a map with a value property
    final val = value['value'] ?? value['\$numberDouble'] ?? value.values.first;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0.0;
  }
  return 0.0;
}

double? _parseDoubleNullable(dynamic value) {
  if (value == null) return null;
  return _parseDouble(value);
}

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
    @JsonKey(fromJson: _parseDouble) required double currentWeekMileage,
    @JsonKey(fromJson: _parseDouble) required double effectiveVO2max,
    @JsonKey(fromJson: _parseDouble) required double rawVO2max,
    @JsonKey(fromJson: _parseDouble) required double vdotCorrectionFactor,
    @JsonKey(fromJson: _parseDouble) required double marathonShape,
    @JsonKey(fromJson: _parseDoubleNullable) required double? currentVdot,
    @JsonKey(fromJson: _parseDouble) required double ctl,
    @JsonKey(fromJson: _parseDouble) required double atl,
    @JsonKey(fromJson: _parseDouble) required double tsb,
    @JsonKey(fromJson: _parseDouble) required double workloadRatio,
    @JsonKey(fromJson: _parseDouble) required double easyTrimp,
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
    @JsonKey(name: 'hrZone1Time') @Default(0) int hrZone1Time,
    @JsonKey(name: 'hrZone2Time') @Default(0) int hrZone2Time,
    @JsonKey(name: 'hrZone3Time') @Default(0) int hrZone3Time,
    @JsonKey(name: 'hrZone4Time') @Default(0) int hrZone4Time,
    @JsonKey(name: 'hrZone5Time') @Default(0) int hrZone5Time,
    @JsonKey(name: 'streams') Map<String, dynamic>? streams,
    @JsonKey(name: 'calories') double? calories,
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
    @Default([]) List<Workout> workouts,
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
    @JsonKey(name: 'todayWorkout') @Default(null) Workout? todayWorkout,
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
