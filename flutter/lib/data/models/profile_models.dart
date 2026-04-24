import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/json_compat.dart';

part 'profile_models.freezed.dart';
part 'profile_models.g.dart';

@Freezed(copyWith: true)
sealed class UserProfile with _$UserProfile {
  const factory UserProfile({
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
    int? hrZone1Max,
    int? hrZone2Max,
    int? hrZone3Max,
    int? hrZone4Max,
    int? hrZone5Max,
    int? hrZone6Max,
    int? thresholdHeartRate,
    int? thresholdPace,
    double? vdotCorrectionFactor,
    @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)
    DateTime? lastSyncAt,
    @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)
    DateTime? createdAt,
  }) = _UserProfile;
  const UserProfile._();

  factory UserProfile.fromJson(Map<String, dynamic> json) =>
      _$UserProfileFromJson(json);
}

@Freezed(copyWith: true)
sealed class UpdateProfileRequest with _$UpdateProfileRequest {
  const factory UpdateProfileRequest({
    String? name,
    @JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,
    @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson)
    DateTime? birthDate,
    int? hrMax,
    int? hrRest,
    double? weight,
    double? height,
    int? hrZone1Max,
    int? hrZone2Max,
    int? hrZone3Max,
    int? hrZone4Max,
    int? hrZone5Max,
    int? hrZone6Max,
    int? thresholdHeartRate,
    int? thresholdPace,
    double? vdotCorrectionFactor,
  }) = _UpdateProfileRequest;
  const UpdateProfileRequest._();

  factory UpdateProfileRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateProfileRequestFromJson(json);
}
