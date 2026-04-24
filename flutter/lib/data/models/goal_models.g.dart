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
      targetTime: (json['targetTime'] as num?)?.toInt(),
      weeklyMileageGoal: (json['weeklyMileageGoal'] as num?)?.toDouble(),
      planWeeks: (json['planWeeks'] as num?)?.toInt() ?? 12,
      runsPerWeek: (json['runsPerWeek'] as num?)?.toInt() ?? 4,
    );

Map<String, dynamic> _$CreateGoalRequestToJson(_CreateGoalRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'raceType': _$RaceTypeEnumMap[instance.raceType]!,
      'raceDate': instance.raceDate.toIso8601String(),
      'targetTime': instance.targetTime,
      'weeklyMileageGoal': instance.weeklyMileageGoal,
      'planWeeks': instance.planWeeks,
      'runsPerWeek': instance.runsPerWeek,
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
