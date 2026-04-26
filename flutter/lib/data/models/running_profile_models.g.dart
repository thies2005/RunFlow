// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'running_profile_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RunningProfile _$RunningProfileFromJson(Map<String, dynamic> json) =>
    _RunningProfile(
      weeklyMileage: (json['weeklyMileage'] as num?)?.toDouble() ?? 0.0,
      experienceLevel:
          $enumDecodeNullable(
            _$ExperienceLevelEnumMap,
            json['experienceLevel'],
          ) ??
          ExperienceLevel.intermediate,
      preferredDistances:
          (json['preferredDistances'] as List<dynamic>?)
              ?.map((e) => $enumDecode(_$PreferredDistanceEnumMap, e))
              .toList() ??
          const [],
      runsPerWeek: (json['runsPerWeek'] as num?)?.toInt() ?? 4,
      hasRaceExperience: json['hasRaceExperience'] as bool? ?? true,
      isInjured: json['isInjured'] as bool? ?? false,
    );

Map<String, dynamic> _$RunningProfileToJson(_RunningProfile instance) =>
    <String, dynamic>{
      'weeklyMileage': instance.weeklyMileage,
      'experienceLevel': _$ExperienceLevelEnumMap[instance.experienceLevel]!,
      'preferredDistances': instance.preferredDistances
          .map((e) => _$PreferredDistanceEnumMap[e]!)
          .toList(),
      'runsPerWeek': instance.runsPerWeek,
      'hasRaceExperience': instance.hasRaceExperience,
      'isInjured': instance.isInjured,
    };

const _$ExperienceLevelEnumMap = {
  ExperienceLevel.beginner: 'BEGINNER',
  ExperienceLevel.intermediate: 'INTERMEDIATE',
  ExperienceLevel.advanced: 'ADVANCED',
};

const _$PreferredDistanceEnumMap = {
  PreferredDistance.fiveK: 'FIVE_K',
  PreferredDistance.tenK: 'TEN_K',
  PreferredDistance.halfMarathon: 'HALF_MARATHON',
  PreferredDistance.marathon: 'MARATHON',
  PreferredDistance.ultra: 'ULTRA',
};
