// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_entities.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_FastingSchedule _$FastingScheduleFromJson(Map<String, dynamic> json) =>
    _FastingSchedule(
      fastingStartHour: (json['fastingStartHour'] as num?)?.toInt() ?? 20,
      fastingStartMinute: (json['fastingStartMinute'] as num?)?.toInt() ?? 0,
      fastingEndHour: (json['fastingEndHour'] as num?)?.toInt() ?? 12,
      fastingEndMinute: (json['fastingEndMinute'] as num?)?.toInt() ?? 0,
      targetHours: (json['targetHours'] as num?)?.toDouble() ?? 16.0,
      isEnabled: json['isEnabled'] as bool? ?? false,
    );

Map<String, dynamic> _$FastingScheduleToJson(_FastingSchedule instance) =>
    <String, dynamic>{
      'fastingStartHour': instance.fastingStartHour,
      'fastingStartMinute': instance.fastingStartMinute,
      'fastingEndHour': instance.fastingEndHour,
      'fastingEndMinute': instance.fastingEndMinute,
      'targetHours': instance.targetHours,
      'isEnabled': instance.isEnabled,
    };
