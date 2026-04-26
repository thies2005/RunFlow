// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'race_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RaceCountdownData _$RaceCountdownDataFromJson(Map<String, dynamic> json) =>
    _RaceCountdownData(
      goalId: json['goalId'] as String,
      goalName: json['goalName'] as String,
      raceType: json['raceType'] as String,
      raceDate: DateTime.parse(json['raceDate'] as String),
      daysToRace: (json['daysToRace'] as num).toInt(),
      weeksToRace: (json['weeksToRace'] as num).toInt(),
      planWeeks: (json['planWeeks'] as num).toInt(),
      weeksCompleted: (json['weeksCompleted'] as num).toInt(),
      progressPercent: (json['progressPercent'] as num).toDouble(),
      targetTimeSeconds: (json['targetTimeSeconds'] as num?)?.toInt(),
      projectedTimeSeconds: (json['projectedTimeSeconds'] as num?)?.toInt(),
      projectedVdot: (json['projectedVdot'] as num?)?.toDouble(),
      currentWeekMileage: (json['currentWeekMileage'] as num).toDouble(),
      plannedWeekMileage: (json['plannedWeekMileage'] as num).toDouble(),
      isRaceDay: json['isRaceDay'] as bool,
      isPostRace: json['isPostRace'] as bool,
      isOverdue: json['isOverdue'] as bool,
      hasRaceResult: json['hasRaceResult'] as bool,
      totalWorkouts: (json['totalWorkouts'] as num).toInt(),
      completedWorkouts: (json['completedWorkouts'] as num).toInt(),
    );

Map<String, dynamic> _$RaceCountdownDataToJson(_RaceCountdownData instance) =>
    <String, dynamic>{
      'goalId': instance.goalId,
      'goalName': instance.goalName,
      'raceType': instance.raceType,
      'raceDate': instance.raceDate.toIso8601String(),
      'daysToRace': instance.daysToRace,
      'weeksToRace': instance.weeksToRace,
      'planWeeks': instance.planWeeks,
      'weeksCompleted': instance.weeksCompleted,
      'progressPercent': instance.progressPercent,
      'targetTimeSeconds': instance.targetTimeSeconds,
      'projectedTimeSeconds': instance.projectedTimeSeconds,
      'projectedVdot': instance.projectedVdot,
      'currentWeekMileage': instance.currentWeekMileage,
      'plannedWeekMileage': instance.plannedWeekMileage,
      'isRaceDay': instance.isRaceDay,
      'isPostRace': instance.isPostRace,
      'isOverdue': instance.isOverdue,
      'hasRaceResult': instance.hasRaceResult,
      'totalWorkouts': instance.totalWorkouts,
      'completedWorkouts': instance.completedWorkouts,
    };

_TrainingStatusData _$TrainingStatusDataFromJson(Map<String, dynamic> json) =>
    _TrainingStatusData(
      shapePercent: _parseDouble(json['shapePercent']),
      effectiveVO2max: _parseDouble(json['effectiveVO2max']),
      correctionFactor: _parseDouble(json['correctionFactor']),
      ctl: _parseDouble(json['ctl']),
      atl: _parseDouble(json['atl']),
      tsb: _parseDouble(json['tsb']),
      workloadRatio: _parseDouble(json['workloadRatio']),
      easyTrimp: _parseDouble(json['easyTrimp']),
      maxCtl: _parseDouble(json['maxCtl']),
      maxAtl: _parseDouble(json['maxAtl']),
      ctlPercent: _parseDouble(json['ctlPercent']),
      atlPercent: _parseDouble(json['atlPercent']),
    );

Map<String, dynamic> _$TrainingStatusDataToJson(_TrainingStatusData instance) =>
    <String, dynamic>{
      'shapePercent': instance.shapePercent,
      'effectiveVO2max': instance.effectiveVO2max,
      'correctionFactor': instance.correctionFactor,
      'ctl': instance.ctl,
      'atl': instance.atl,
      'tsb': instance.tsb,
      'workloadRatio': instance.workloadRatio,
      'easyTrimp': instance.easyTrimp,
      'maxCtl': instance.maxCtl,
      'maxAtl': instance.maxAtl,
      'ctlPercent': instance.ctlPercent,
      'atlPercent': instance.atlPercent,
    };

_SuggestedRaceActivity _$SuggestedRaceActivityFromJson(
  Map<String, dynamic> json,
) => _SuggestedRaceActivity(
  id: json['id'] as String,
  name: json['name'] as String,
  startDate: DateTime.parse(json['startDate'] as String),
  distance: (json['distance'] as num).toDouble(),
  movingTime: (json['movingTime'] as num).toInt(),
  averageSpeed: (json['averageSpeed'] as num?)?.toDouble(),
);

Map<String, dynamic> _$SuggestedRaceActivityToJson(
  _SuggestedRaceActivity instance,
) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'startDate': instance.startDate.toIso8601String(),
  'distance': instance.distance,
  'movingTime': instance.movingTime,
  'averageSpeed': instance.averageSpeed,
};

_RaceResult _$RaceResultFromJson(Map<String, dynamic> json) => _RaceResult(
  id: json['id'] as String,
  goalId: json['goalId'] as String,
  activityId: json['activityId'] as String?,
  actualTime: (json['actualTime'] as num?)?.toInt(),
  chipTime: (json['chipTime'] as num?)?.toInt(),
  placementOverall: (json['placementOverall'] as num?)?.toInt(),
  placementGender: (json['placementGender'] as num?)?.toInt(),
  placementAgeGroup: (json['placementAgeGroup'] as num?)?.toInt(),
  ageGroup: json['ageGroup'] as String?,
  totalFinishers: (json['totalFinishers'] as num?)?.toInt(),
  weatherConditions: json['weatherConditions'] as String?,
  feltLike: (json['feltLike'] as num?)?.toInt(),
  notes: json['notes'] as String?,
);

Map<String, dynamic> _$RaceResultToJson(_RaceResult instance) =>
    <String, dynamic>{
      'id': instance.id,
      'goalId': instance.goalId,
      'activityId': instance.activityId,
      'actualTime': instance.actualTime,
      'chipTime': instance.chipTime,
      'placementOverall': instance.placementOverall,
      'placementGender': instance.placementGender,
      'placementAgeGroup': instance.placementAgeGroup,
      'ageGroup': instance.ageGroup,
      'totalFinishers': instance.totalFinishers,
      'weatherConditions': instance.weatherConditions,
      'feltLike': instance.feltLike,
      'notes': instance.notes,
    };

_CompleteRaceRequest _$CompleteRaceRequestFromJson(Map<String, dynamic> json) =>
    _CompleteRaceRequest(
      raceActivityId: json['raceActivityId'] as String?,
      actualTime: (json['actualTime'] as num?)?.toInt(),
      chipTime: (json['chipTime'] as num?)?.toInt(),
      placementOverall: (json['placementOverall'] as num?)?.toInt(),
      placementGender: (json['placementGender'] as num?)?.toInt(),
      placementAgeGroup: (json['placementAgeGroup'] as num?)?.toInt(),
      ageGroup: json['ageGroup'] as String?,
      totalFinishers: (json['totalFinishers'] as num?)?.toInt(),
      weatherConditions: json['weatherConditions'] as String?,
      feltLike: (json['feltLike'] as num?)?.toInt(),
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$CompleteRaceRequestToJson(
  _CompleteRaceRequest instance,
) => <String, dynamic>{
  'raceActivityId': instance.raceActivityId,
  'actualTime': instance.actualTime,
  'chipTime': instance.chipTime,
  'placementOverall': instance.placementOverall,
  'placementGender': instance.placementGender,
  'placementAgeGroup': instance.placementAgeGroup,
  'ageGroup': instance.ageGroup,
  'totalFinishers': instance.totalFinishers,
  'weatherConditions': instance.weatherConditions,
  'feltLike': instance.feltLike,
  'notes': instance.notes,
};

_RaceSuggestionResponse _$RaceSuggestionResponseFromJson(
  Map<String, dynamic> json,
) => _RaceSuggestionResponse(
  suggestions: (json['suggestions'] as List<dynamic>)
      .map((e) => SuggestedRaceActivity.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$RaceSuggestionResponseToJson(
  _RaceSuggestionResponse instance,
) => <String, dynamic>{'suggestions': instance.suggestions};

_TrainingCompletionSummary _$TrainingCompletionSummaryFromJson(
  Map<String, dynamic> json,
) => _TrainingCompletionSummary(
  totalWorkouts: (json['totalWorkouts'] as num).toInt(),
  completedWorkouts: (json['completedWorkouts'] as num).toInt(),
  completionRate: (json['completionRate'] as num).toInt(),
);

Map<String, dynamic> _$TrainingCompletionSummaryToJson(
  _TrainingCompletionSummary instance,
) => <String, dynamic>{
  'totalWorkouts': instance.totalWorkouts,
  'completedWorkouts': instance.completedWorkouts,
  'completionRate': instance.completionRate,
};
