// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'goal_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_GoalsResponse _$GoalsResponseFromJson(Map<String, dynamic> json) =>
    _GoalsResponse(
      goals: (json['goals'] as List<dynamic>)
          .map((e) => Goal.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$GoalsResponseToJson(_GoalsResponse instance) =>
    <String, dynamic>{'goals': instance.goals};

_WorkoutsResponse _$WorkoutsResponseFromJson(Map<String, dynamic> json) =>
    _WorkoutsResponse(
      workouts: (json['workouts'] as List<dynamic>)
          .map((e) => Workout.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$WorkoutsResponseToJson(_WorkoutsResponse instance) =>
    <String, dynamic>{'workouts': instance.workouts};

_CreateGoalRequest _$CreateGoalRequestFromJson(Map<String, dynamic> json) =>
    _CreateGoalRequest(
      name: json['name'] as String,
      raceType: $enumDecode(_$RaceTypeEnumMap, json['raceType']),
      raceDate: DateTime.parse(json['raceDate'] as String),
      planStartDate: json['planStartDate'] == null
          ? null
          : DateTime.parse(json['planStartDate'] as String),
      targetTime: (json['targetTime'] as num?)?.toInt(),
      weeklyMileageGoal: (json['weeklyMileageGoal'] as num?)?.toDouble(),
      planWeeks: (json['planWeeks'] as num?)?.toInt() ?? 12,
      runsPerWeek: (json['runsPerWeek'] as num?)?.toInt() ?? 4,
      ridesPerWeek: (json['ridesPerWeek'] as num?)?.toInt() ?? 0,
      swimsPerWeek: (json['swimsPerWeek'] as num?)?.toInt() ?? 0,
      strengthPerWeek: (json['strengthPerWeek'] as num?)?.toInt() ?? 0,
      taperWeeks: (json['taperWeeks'] as num?)?.toInt() ?? 2,
      peakWeeks: (json['peakWeeks'] as num?)?.toInt() ?? 4,
      buildWeeks: (json['buildWeeks'] as num?)?.toInt() ?? 4,
      maxLongRunKm: (json['maxLongRunKm'] as num?)?.toDouble(),
      longRunDay: (json['longRunDay'] as num?)?.toInt() ?? 0,
      workoutDay: (json['workoutDay'] as num?)?.toInt() ?? 3,
      calibrationTime: (json['calibrationTime'] as num?)?.toInt(),
      calibrationDistance: json['calibrationDistance'] as String?,
      calibrationFactor: (json['calibrationFactor'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$CreateGoalRequestToJson(_CreateGoalRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'raceType': _$RaceTypeEnumMap[instance.raceType]!,
      'raceDate': instance.raceDate.toIso8601String(),
      'planStartDate': instance.planStartDate?.toIso8601String(),
      'targetTime': instance.targetTime,
      'weeklyMileageGoal': instance.weeklyMileageGoal,
      'planWeeks': instance.planWeeks,
      'runsPerWeek': instance.runsPerWeek,
      'ridesPerWeek': instance.ridesPerWeek,
      'swimsPerWeek': instance.swimsPerWeek,
      'strengthPerWeek': instance.strengthPerWeek,
      'taperWeeks': instance.taperWeeks,
      'peakWeeks': instance.peakWeeks,
      'buildWeeks': instance.buildWeeks,
      'maxLongRunKm': instance.maxLongRunKm,
      'longRunDay': instance.longRunDay,
      'workoutDay': instance.workoutDay,
      'calibrationTime': instance.calibrationTime,
      'calibrationDistance': instance.calibrationDistance,
      'calibrationFactor': instance.calibrationFactor,
    };

const _$RaceTypeEnumMap = {
  RaceType.fiveK: 'FIVE_K',
  RaceType.tenK: 'TEN_K',
  RaceType.halfMarathon: 'HALF_MARATHON',
  RaceType.marathon: 'MARATHON',
};

_UpdateGoalRequest _$UpdateGoalRequestFromJson(Map<String, dynamic> json) =>
    _UpdateGoalRequest(
      name: json['name'] as String?,
      targetTime: (json['targetTime'] as num?)?.toInt(),
      isActive: json['isActive'] as bool?,
      currentVdot: (json['currentVdot'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$UpdateGoalRequestToJson(_UpdateGoalRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'targetTime': instance.targetTime,
      'isActive': instance.isActive,
      'currentVdot': instance.currentVdot,
    };

_UpdateWorkoutRequest _$UpdateWorkoutRequestFromJson(
  Map<String, dynamic> json,
) => _UpdateWorkoutRequest(
  workoutType: $enumDecodeNullable(_$WorkoutTypeEnumMap, json['workoutType']),
  description: json['description'] as String?,
  targetDistance: (json['targetDistance'] as num?)?.toDouble(),
  targetPace: (json['targetPace'] as num?)?.toDouble(),
  targetDuration: (json['targetDuration'] as num?)?.toInt(),
  isCompleted: json['isCompleted'] as bool?,
);

Map<String, dynamic> _$UpdateWorkoutRequestToJson(
  _UpdateWorkoutRequest instance,
) => <String, dynamic>{
  'workoutType': _$WorkoutTypeEnumMap[instance.workoutType],
  'description': instance.description,
  'targetDistance': instance.targetDistance,
  'targetPace': instance.targetPace,
  'targetDuration': instance.targetDuration,
  'isCompleted': instance.isCompleted,
};

const _$WorkoutTypeEnumMap = {
  WorkoutType.easy: 'easy',
  WorkoutType.long: 'long',
  WorkoutType.tempo: 'tempo',
  WorkoutType.interval: 'interval',
  WorkoutType.recovery: 'recovery',
  WorkoutType.race: 'race',
  WorkoutType.other: 'other',
};
