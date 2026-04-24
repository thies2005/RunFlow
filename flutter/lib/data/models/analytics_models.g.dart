// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'analytics_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_FitnessHistoryMetrics _$FitnessHistoryMetricsFromJson(
  Map<String, dynamic> json,
) => _FitnessHistoryMetrics(
  ctl: _parseDouble(json['ctl']),
  atl: _parseDouble(json['atl']),
  tsb: _parseDouble(json['tsb']),
  ctlRunning: _parseDouble(json['ctlRunning']),
);

Map<String, dynamic> _$FitnessHistoryMetricsToJson(
  _FitnessHistoryMetrics instance,
) => <String, dynamic>{
  'ctl': instance.ctl,
  'atl': instance.atl,
  'tsb': instance.tsb,
  'ctlRunning': instance.ctlRunning,
};

_FitnessHistory _$FitnessHistoryFromJson(Map<String, dynamic> json) =>
    _FitnessHistory(
      date: DateTime.parse(json['date'] as String),
      metrics: FitnessHistoryMetrics.fromJson(
        json['metrics'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$FitnessHistoryToJson(_FitnessHistory instance) =>
    <String, dynamic>{
      'date': instance.date.toIso8601String(),
      'metrics': instance.metrics,
    };
