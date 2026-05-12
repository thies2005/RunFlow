// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'readiness_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RhrMetricsModel _$RhrMetricsModelFromJson(Map<String, dynamic> json) =>
    _RhrMetricsModel(
      todayRhr: (json['todayRhr'] as num?)?.toDouble(),
      baselineRhr: (json['baselineRhr'] as num?)?.toDouble(),
      rhrDelta: (json['rhrDelta'] as num?)?.toDouble(),
      trendDirection: (json['trendDirection'] as num?)?.toInt(),
    );

Map<String, dynamic> _$RhrMetricsModelToJson(_RhrMetricsModel instance) =>
    <String, dynamic>{
      'todayRhr': instance.todayRhr,
      'baselineRhr': instance.baselineRhr,
      'rhrDelta': instance.rhrDelta,
      'trendDirection': instance.trendDirection,
    };

_SleepMetricsModel _$SleepMetricsModelFromJson(Map<String, dynamic> json) =>
    _SleepMetricsModel(
      totalDurationMinutes: (json['totalDurationMinutes'] as num?)?.toDouble(),
      deepMinutes: (json['deepMinutes'] as num?)?.toDouble(),
      remMinutes: (json['remMinutes'] as num?)?.toDouble(),
      lightMinutes: (json['lightMinutes'] as num?)?.toDouble(),
      deepPercent: (json['deepPercent'] as num?)?.toDouble(),
      remPercent: (json['remPercent'] as num?)?.toDouble(),
      sleepEfficiency: (json['sleepEfficiency'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$SleepMetricsModelToJson(_SleepMetricsModel instance) =>
    <String, dynamic>{
      'totalDurationMinutes': instance.totalDurationMinutes,
      'deepMinutes': instance.deepMinutes,
      'remMinutes': instance.remMinutes,
      'lightMinutes': instance.lightMinutes,
      'deepPercent': instance.deepPercent,
      'remPercent': instance.remPercent,
      'sleepEfficiency': instance.sleepEfficiency,
    };

_LoadMetricsModel _$LoadMetricsModelFromJson(Map<String, dynamic> json) =>
    _LoadMetricsModel(
      todayTrimp: (json['todayTrimp'] as num?)?.toDouble(),
      atl: (json['atl'] as num?)?.toDouble(),
      ctl: (json['ctl'] as num?)?.toDouble(),
      tsb: (json['tsb'] as num?)?.toDouble(),
      workloadRatio: (json['workloadRatio'] as num?)?.toDouble(),
      trimpStrategy: json['trimpStrategy'] as String?,
      sevenDayTrimpTotal: (json['sevenDayTrimpTotal'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$LoadMetricsModelToJson(_LoadMetricsModel instance) =>
    <String, dynamic>{
      'todayTrimp': instance.todayTrimp,
      'atl': instance.atl,
      'ctl': instance.ctl,
      'tsb': instance.tsb,
      'workloadRatio': instance.workloadRatio,
      'trimpStrategy': instance.trimpStrategy,
      'sevenDayTrimpTotal': instance.sevenDayTrimpTotal,
    };

_SubjectiveInputModel _$SubjectiveInputModelFromJson(
  Map<String, dynamic> json,
) => _SubjectiveInputModel(
  exhaustionLevel: (json['exhaustionLevel'] as num?)?.toInt(),
  muscleSoreness: (json['muscleSoreness'] as num?)?.toInt(),
  stressLevel: (json['stressLevel'] as num?)?.toInt(),
  note: json['note'] as String?,
  enteredAt: json['enteredAt'] as String?,
);

Map<String, dynamic> _$SubjectiveInputModelToJson(
  _SubjectiveInputModel instance,
) => <String, dynamic>{
  'exhaustionLevel': instance.exhaustionLevel,
  'muscleSoreness': instance.muscleSoreness,
  'stressLevel': instance.stressLevel,
  'note': instance.note,
  'enteredAt': instance.enteredAt,
};

_ComponentScoreModel _$ComponentScoreModelFromJson(Map<String, dynamic> json) =>
    _ComponentScoreModel(
      component: json['component'] as String,
      score: (json['score'] as num).toDouble(),
      isAvailable: json['isAvailable'] as bool,
      reason: json['reason'] as String?,
    );

Map<String, dynamic> _$ComponentScoreModelToJson(
  _ComponentScoreModel instance,
) => <String, dynamic>{
  'component': instance.component,
  'score': instance.score,
  'isAvailable': instance.isAvailable,
  'reason': instance.reason,
};

_ReadinessOverrideModel _$ReadinessOverrideModelFromJson(
  Map<String, dynamic> json,
) => _ReadinessOverrideModel(
  state: json['state'] as String,
  note: json['note'] as String?,
  overriddenAt: json['overriddenAt'] as String?,
);

Map<String, dynamic> _$ReadinessOverrideModelToJson(
  _ReadinessOverrideModel instance,
) => <String, dynamic>{
  'state': instance.state,
  'note': instance.note,
  'overriddenAt': instance.overriddenAt,
};
