// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) =>
    _LoginRequest(
      code: json['code'] as String,
      redirectUri: json['redirectUri'] as String?,
    );

Map<String, dynamic> _$LoginRequestToJson(_LoginRequest instance) =>
    <String, dynamic>{
      'code': instance.code,
      'redirectUri': instance.redirectUri,
    };

_LoginResponse _$LoginResponseFromJson(Map<String, dynamic> json) =>
    _LoginResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
      tokenType: json['tokenType'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LoginResponseToJson(_LoginResponse instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'expiresIn': instance.expiresIn,
      'tokenType': instance.tokenType,
      'user': instance.user,
    };

_RefreshRequest _$RefreshRequestFromJson(Map<String, dynamic> json) =>
    _RefreshRequest(refreshToken: json['refreshToken'] as String);

Map<String, dynamic> _$RefreshRequestToJson(_RefreshRequest instance) =>
    <String, dynamic>{'refreshToken': instance.refreshToken};

_RefreshResponse _$RefreshResponseFromJson(Map<String, dynamic> json) =>
    _RefreshResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );

Map<String, dynamic> _$RefreshResponseToJson(_RefreshResponse instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
    };

_User _$UserFromJson(Map<String, dynamic> json) => _User(
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
  vdotCorrectionFactor: (json['vdotCorrectionFactor'] as num?)?.toDouble(),
  lastSyncAt: flexibleDateTimeFromJson(json['lastSyncAt']),
);

Map<String, dynamic> _$UserToJson(_User instance) => <String, dynamic>{
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
  'vdotCorrectionFactor': instance.vdotCorrectionFactor,
  'lastSyncAt': dateTimeToJson(instance.lastSyncAt),
};

_ApiError _$ApiErrorFromJson(Map<String, dynamic> json) => _ApiError(
  error: json['error'] as String,
  timestamp: DateTime.parse(json['timestamp'] as String),
  code: json['code'] as String?,
  details: json['details'] as Map<String, dynamic>?,
  path: json['path'] as String?,
);

Map<String, dynamic> _$ApiErrorToJson(_ApiError instance) => <String, dynamic>{
  'error': instance.error,
  'timestamp': instance.timestamp.toIso8601String(),
  'code': instance.code,
  'details': instance.details,
  'path': instance.path,
};
