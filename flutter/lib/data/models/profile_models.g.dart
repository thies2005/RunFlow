// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_UserProfile _$UserProfileFromJson(Map<String, dynamic> json) => _UserProfile(
  id: json['id'] as String,
  email: json['email'] as String?,
  name: json['name'] as String?,
  image: json['image'] as String?,
  sex: sexFromJson(json['sex']),
  birthDate: flexibleDateTimeFromJson(json['birthDate']),
  hrMax: (json['hrMax'] as num?)?.toInt(),
  hrRest: (json['hrRest'] as num?)?.toInt(),
  weight: (json['weight'] as num?)?.toDouble(),
  height: (json['height'] as num?)?.toDouble(),
  hrZone1Max: (json['hrZone1Max'] as num?)?.toInt(),
  hrZone2Max: (json['hrZone2Max'] as num?)?.toInt(),
  hrZone3Max: (json['hrZone3Max'] as num?)?.toInt(),
  hrZone4Max: (json['hrZone4Max'] as num?)?.toInt(),
  hrZone5Max: (json['hrZone5Max'] as num?)?.toInt(),
  hrZone6Max: (json['hrZone6Max'] as num?)?.toInt(),
  thresholdHeartRate: (json['thresholdHeartRate'] as num?)?.toInt(),
  thresholdPace: (json['thresholdPace'] as num?)?.toInt(),
  vdotCorrectionFactor: (json['vdotCorrectionFactor'] as num?)?.toDouble(),
  lastSyncAt: flexibleDateTimeFromJson(json['lastSyncAt']),
  createdAt: flexibleDateTimeFromJson(json['createdAt']),
);

Map<String, dynamic> _$UserProfileToJson(_UserProfile instance) =>
    <String, dynamic>{
      'id': instance.id,
      'email': instance.email,
      'name': instance.name,
      'image': instance.image,
      'sex': sexToJson(instance.sex),
      'birthDate': dateTimeToJson(instance.birthDate),
      'hrMax': instance.hrMax,
      'hrRest': instance.hrRest,
      'weight': instance.weight,
      'height': instance.height,
      'hrZone1Max': instance.hrZone1Max,
      'hrZone2Max': instance.hrZone2Max,
      'hrZone3Max': instance.hrZone3Max,
      'hrZone4Max': instance.hrZone4Max,
      'hrZone5Max': instance.hrZone5Max,
      'hrZone6Max': instance.hrZone6Max,
      'thresholdHeartRate': instance.thresholdHeartRate,
      'thresholdPace': instance.thresholdPace,
      'vdotCorrectionFactor': instance.vdotCorrectionFactor,
      'lastSyncAt': dateTimeToJson(instance.lastSyncAt),
      'createdAt': dateTimeToJson(instance.createdAt),
    };

_UpdateProfileRequest _$UpdateProfileRequestFromJson(
  Map<String, dynamic> json,
) => _UpdateProfileRequest(
  name: json['name'] as String?,
  sex: sexFromJson(json['sex']),
  birthDate: flexibleDateTimeFromJson(json['birthDate']),
  hrMax: (json['hrMax'] as num?)?.toInt(),
  hrRest: (json['hrRest'] as num?)?.toInt(),
  weight: (json['weight'] as num?)?.toDouble(),
  height: (json['height'] as num?)?.toDouble(),
  hrZone1Max: (json['hrZone1Max'] as num?)?.toInt(),
  hrZone2Max: (json['hrZone2Max'] as num?)?.toInt(),
  hrZone3Max: (json['hrZone3Max'] as num?)?.toInt(),
  hrZone4Max: (json['hrZone4Max'] as num?)?.toInt(),
  hrZone5Max: (json['hrZone5Max'] as num?)?.toInt(),
  hrZone6Max: (json['hrZone6Max'] as num?)?.toInt(),
  thresholdHeartRate: (json['thresholdHeartRate'] as num?)?.toInt(),
  thresholdPace: (json['thresholdPace'] as num?)?.toInt(),
  vdotCorrectionFactor: (json['vdotCorrectionFactor'] as num?)?.toDouble(),
);

Map<String, dynamic> _$UpdateProfileRequestToJson(
  _UpdateProfileRequest instance,
) => <String, dynamic>{
  'name': instance.name,
  'sex': sexToJson(instance.sex),
  'birthDate': dateOnlyToJson(instance.birthDate),
  'hrMax': instance.hrMax,
  'hrRest': instance.hrRest,
  'weight': instance.weight,
  'height': instance.height,
  'hrZone1Max': instance.hrZone1Max,
  'hrZone2Max': instance.hrZone2Max,
  'hrZone3Max': instance.hrZone3Max,
  'hrZone4Max': instance.hrZone4Max,
  'hrZone5Max': instance.hrZone5Max,
  'hrZone6Max': instance.hrZone6Max,
  'thresholdHeartRate': instance.thresholdHeartRate,
  'thresholdPace': instance.thresholdPace,
  'vdotCorrectionFactor': instance.vdotCorrectionFactor,
};
