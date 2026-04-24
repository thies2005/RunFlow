// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ActivitiesResponse _$ActivitiesResponseFromJson(Map<String, dynamic> json) =>
    _ActivitiesResponse(
      activities: (json['activities'] as List<dynamic>)
          .map((e) => Activity.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      offset: (json['offset'] as num).toInt(),
      hasMore: json['hasMore'] as bool,
    );

Map<String, dynamic> _$ActivitiesResponseToJson(_ActivitiesResponse instance) =>
    <String, dynamic>{
      'activities': instance.activities,
      'total': instance.total,
      'limit': instance.limit,
      'offset': instance.offset,
      'hasMore': instance.hasMore,
    };
