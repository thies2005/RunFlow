import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/json_compat.dart';

part 'auth_models.freezed.dart';
part 'auth_models.g.dart';

@Freezed(copyWith: true)
sealed class LoginRequest with _$LoginRequest {
  const factory LoginRequest({
    required String code,
    String? redirectUri,
  }) = _LoginRequest;
  const LoginRequest._();

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
}

@Freezed(copyWith: true)
sealed class LoginResponse with _$LoginResponse {
  const factory LoginResponse({
    required String accessToken,
    required String refreshToken,
    required int expiresIn,
    required String tokenType,
    required User user,
  }) = _LoginResponse;
  const LoginResponse._();

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);
}

@Freezed(copyWith: true)
sealed class RefreshRequest with _$RefreshRequest {
  const factory RefreshRequest({required String refreshToken}) = _RefreshRequest;
  const RefreshRequest._();

  factory RefreshRequest.fromJson(Map<String, dynamic> json) =>
      _$RefreshRequestFromJson(json);
}

@Freezed(copyWith: true)
sealed class RefreshResponse with _$RefreshResponse {
  const factory RefreshResponse({
    required String accessToken,
    required String refreshToken,
  }) = _RefreshResponse;
  const RefreshResponse._();

  factory RefreshResponse.fromJson(Map<String, dynamic> json) =>
      _$RefreshResponseFromJson(json);
}

enum Sex { male, female, other }

@Freezed(copyWith: true)
sealed class User with _$User {
  const factory User({
    required String id,
    String? email,
    String? name,
    String? image,
    @JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,
    @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)
    DateTime? birthDate,
    int? hrMax,
    int? hrRest,
    double? weight,
    double? height,
    double? vdotCorrectionFactor,
    @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)
    DateTime? lastSyncAt,
  }) = _User;
  const User._();

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@Freezed(copyWith: true)
sealed class ApiError with _$ApiError {
  const factory ApiError({
    required String error,
    required DateTime timestamp,
    String? code,
    Map<String, dynamic>? details,
    String? path,
  }) = _ApiError;
  const ApiError._();

  factory ApiError.fromJson(Map<String, dynamic> json) =>
      _$ApiErrorFromJson(json);
}

Sex? sexFromJson(Object? value) {
  return switch (compatibilitySexFromJson(value)) {
    CompatibilitySex.male => Sex.male,
    CompatibilitySex.female => Sex.female,
    CompatibilitySex.other => Sex.other,
    null => null,
  };
}

String? sexToJson(Sex? value) {
  return switch (value) {
    Sex.male => compatibilitySexToJson(CompatibilitySex.male),
    Sex.female => compatibilitySexToJson(CompatibilitySex.female),
    Sex.other => compatibilitySexToJson(CompatibilitySex.other),
    null => null,
  };
}
