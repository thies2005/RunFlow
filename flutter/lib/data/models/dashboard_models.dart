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
    // Handle marathon shape object: { shape, mileageScore, ... }
    if (value.containsKey('shape')) {
      final shape = value['shape'];
      if (shape is num) return shape.toDouble();
      if (shape is String) return double.tryParse(shape) ?? 0.0;
    }
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

int _parseIntSafe(dynamic value) {
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
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
  @JsonValue('STRENGTH')
  strength,
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
  @JsonValue('FIFTY_K')
  fiftyK,
  @JsonValue('FIFTY_MILE')
  fiftyMile,
  @JsonValue('HUNDRED_K')
  hundredK,
  @JsonValue('HUNDRED_MILE')
  hundredMile,
  @JsonValue('TWELVE_HOUR')
  twelveHour,
  @JsonValue('TWENTY_FOUR_HOUR')
  twentyFourHour,
  @JsonValue('BACKYARD_ULTRA')
  backyardUltra,
  @JsonValue('CUSTOM_DISTANCE')
  customDistance,
  @JsonValue('SPRINT_TRI')
  sprintTri,
  @JsonValue('OLYMPIC_TRI')
  olympicTri,
  @JsonValue('HALF_IRONMAN')
  halfIronman,
  @JsonValue('FULL_IRONMAN')
  fullIronman,
  @JsonValue('CUSTOM_TRI')
  customTri,
}

enum WorkoutType {
  easy,
  longRun,
  tempo,
  intervals,
  fartlek,
  repetitions,
  recovery,
  race,
  rest,
  crossTrain,
  ride,
  swim,
  strength,
  other,
  brick,
  openWaterSwim,
  longRide,
  rideIntervals,
  swimDrill,
  transitionPractice,
  doubleDay,
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
    @JsonKey(fromJson: _parseDoubleNullable) @Default(null) double? avgWeeklyKmLast3Months,
    @JsonKey(fromJson: _parseIntSafe) @Default(0) int hrMax,
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
    @JsonKey(fromJson: _parseDouble) required double totalElevation,
    required double? trimp,
    required double? runningTss,
    required double? estimatedVdot,
    required String? trainingType,
    @JsonKey(name: 'hrZone1Time') @Default(0) int hrZone1Time,
    @JsonKey(name: 'hrZone2Time') @Default(0) int hrZone2Time,
    @JsonKey(name: 'hrZone3Time') @Default(0) int hrZone3Time,
    @JsonKey(name: 'hrZone4Time') @Default(0) int hrZone4Time,
    @JsonKey(name: 'hrZone5Time') @Default(0) int hrZone5Time,
    @JsonKey(name: 'hrZone6Time') @Default(0) int hrZone6Time,
    @JsonKey(name: 'hrZone7Time') @Default(0) int hrZone7Time,
    @JsonKey(name: 'streams') Map<String, dynamic>? streams,
    @JsonKey(name: 'calories') double? calories,
    @JsonKey(name: 'averageWatts') double? averageWatts,
    @JsonKey(name: 'weightedAverageWatts') double? weightedAverageWatts,
    @JsonKey(name: 'deviceWatts') @Default(false) bool deviceWatts,
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
    @Default('') String description,
    @Default(0.0) double targetDistance,
    @Default(0.0) double targetPace,
    @Default(0) int targetDuration,
    @Default(false) bool isCompleted,
    required DateTime? completedAt,
    required String? activityId,
    @Default('RUN') String sport,
    @JsonKey(name: 'displayDesc') String? displayDescription,
    @JsonKey(name: 'intensityZone') String? intensityZone,
    @JsonKey(name: 'phase') String? phase,
    @JsonKey(name: 'targetHrZone') int? targetHrZone,
    @JsonKey(name: 'targetHrZoneLabel') String? targetHrZoneLabel,
    @JsonKey(name: 'targetHrMinBpm') int? targetHrMinBpm,
    @JsonKey(name: 'targetHrMaxBpm') int? targetHrMaxBpm,
    @JsonKey(name: 'targetPaceZoneLabel') String? targetPaceZoneLabel,
    @JsonKey(name: 'targetPaceMinSecondsPerKm') double? targetPaceMinSecondsPerKm,
    @JsonKey(name: 'targetPaceMaxSecondsPerKm') double? targetPaceMaxSecondsPerKm,
    @JsonKey(name: 'structuredSteps') Map<String, dynamic>? structuredSteps,
  }) = _Workout;
  const Workout._();

  factory Workout.fromJson(Map<String, dynamic> json) =>
      _$WorkoutFromJson(json);
}

@Freezed(copyWith: true)
sealed class SubGoal with _$SubGoal {
  const factory SubGoal({
    required String id,
    @Default('') String userId,
    required String name,
    RaceType? raceType,
    DateTime? raceDate,
    int? targetTime,
    @Default('RUN') String sport,
    @Default('SECONDARY') String priority,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? completedAt,
    @Default(true) bool isActive,
  }) = _SubGoal;
  const SubGoal._();

  factory SubGoal.fromJson(Map<String, dynamic> json) =>
      _$SubGoalFromJson(json);
}

@Freezed(copyWith: true)
sealed class Goal with _$Goal {
  const factory Goal({
    required String id,
    @Default('') String userId,
    required String name,
    RaceType? raceType,
    DateTime? raceDate,
    required int? targetTime,
    required double? weeklyMileageGoal,
    @Default(12) int planWeeks,
    @Default(4) int runsPerWeek,
    @Default(0) int longRunDay,
    @Default(3) int workoutDay,
    required double? currentVdot,
    required int? predictedTime,
    @Default(true) bool isActive,
    required DateTime createdAt,
    required DateTime updatedAt,
    required DateTime? completedAt,
    @Default([]) List<Workout> workouts,
    double? backyardLoopDistM,
    int? targetLaps,
    @Default('RUN') String sport,
    @Default('standard') String planSource,
    @Default(0) int ridesPerWeek,
    @Default(0) int swimsPerWeek,
    @Default(0) int strengthPerWeek,
    @Default(2) int taperWeeks,
    @Default(4) int peakWeeks,
    @Default(4) int buildWeeks,
    @Default([]) List<int> restDays,
    String? parentGoalId,
    @Default([]) List<SubGoal> subGoals,
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
    CompatibilityWorkoutType.longRun => WorkoutType.longRun,
    CompatibilityWorkoutType.tempo => WorkoutType.tempo,
    CompatibilityWorkoutType.intervals => WorkoutType.intervals,
    CompatibilityWorkoutType.fartlek => WorkoutType.fartlek,
    CompatibilityWorkoutType.repetitions => WorkoutType.repetitions,
    CompatibilityWorkoutType.recovery => WorkoutType.recovery,
    CompatibilityWorkoutType.race => WorkoutType.race,
    CompatibilityWorkoutType.rest => WorkoutType.rest,
    CompatibilityWorkoutType.crossTrain => WorkoutType.crossTrain,
    CompatibilityWorkoutType.ride => WorkoutType.ride,
    CompatibilityWorkoutType.swim => WorkoutType.swim,
    CompatibilityWorkoutType.strength => WorkoutType.strength,
    CompatibilityWorkoutType.other => WorkoutType.other,
    CompatibilityWorkoutType.brick => WorkoutType.brick,
    CompatibilityWorkoutType.openWaterSwim => WorkoutType.openWaterSwim,
    CompatibilityWorkoutType.longRide => WorkoutType.longRide,
    CompatibilityWorkoutType.rideIntervals => WorkoutType.rideIntervals,
    CompatibilityWorkoutType.swimDrill => WorkoutType.swimDrill,
    CompatibilityWorkoutType.transitionPractice => WorkoutType.transitionPractice,
    CompatibilityWorkoutType.doubleDay => WorkoutType.doubleDay,
  };
}

String workoutTypeToJson(WorkoutType value) {
  return compatibilityWorkoutTypeToJson(switch (value) {
    WorkoutType.easy => CompatibilityWorkoutType.easy,
    WorkoutType.longRun => CompatibilityWorkoutType.longRun,
    WorkoutType.tempo => CompatibilityWorkoutType.tempo,
    WorkoutType.intervals => CompatibilityWorkoutType.intervals,
    WorkoutType.fartlek => CompatibilityWorkoutType.fartlek,
    WorkoutType.repetitions => CompatibilityWorkoutType.repetitions,
    WorkoutType.recovery => CompatibilityWorkoutType.recovery,
    WorkoutType.race => CompatibilityWorkoutType.race,
    WorkoutType.rest => CompatibilityWorkoutType.rest,
    WorkoutType.crossTrain => CompatibilityWorkoutType.crossTrain,
    WorkoutType.ride => CompatibilityWorkoutType.ride,
    WorkoutType.swim => CompatibilityWorkoutType.swim,
    WorkoutType.strength => CompatibilityWorkoutType.strength,
    WorkoutType.other => CompatibilityWorkoutType.other,
    WorkoutType.brick => CompatibilityWorkoutType.brick,
    WorkoutType.openWaterSwim => CompatibilityWorkoutType.openWaterSwim,
    WorkoutType.longRide => CompatibilityWorkoutType.longRide,
    WorkoutType.rideIntervals => CompatibilityWorkoutType.rideIntervals,
    WorkoutType.swimDrill => CompatibilityWorkoutType.swimDrill,
    WorkoutType.transitionPractice => CompatibilityWorkoutType.transitionPractice,
    WorkoutType.doubleDay => CompatibilityWorkoutType.doubleDay,
  });
}
