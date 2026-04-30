import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/data/mappers/auth_mappers.dart';
import 'package:runflow_flutter/domain/entities/profile_entities.dart' as domain;

extension UserProfileMapper on UserProfile {
  domain.UserProfile toDomain() => domain.UserProfile(
        id: id,
        email: email,
        name: name,
        image: image,
        sex: sex?.toDomain(),
        birthDate: birthDate,
        hrMax: hrMax,
        hrRest: hrRest,
        weight: weight,
        height: height,
        hrZone1Max: hrZone1Max,
        hrZone2Max: hrZone2Max,
        hrZone3Max: hrZone3Max,
        hrZone4Max: hrZone4Max,
        hrZone5Max: hrZone5Max,
        hrZone6Max: hrZone6Max,
        thresholdHeartRate: thresholdHeartRate,
        thresholdPace: thresholdPace,
        vdotCorrectionFactor: vdotCorrectionFactor,
        lastSyncAt: lastSyncAt,
        createdAt: createdAt,
      );
}

extension DomainUserProfileMapper on domain.UserProfile {
  UserProfile toData() => UserProfile(
        id: id,
        email: email,
        name: name,
        image: image,
        sex: sex?.toData(),
        birthDate: birthDate,
        hrMax: hrMax,
        hrRest: hrRest,
        weight: weight,
        height: height,
        hrZone1Max: hrZone1Max,
        hrZone2Max: hrZone2Max,
        hrZone3Max: hrZone3Max,
        hrZone4Max: hrZone4Max,
        hrZone5Max: hrZone5Max,
        hrZone6Max: hrZone6Max,
        thresholdHeartRate: thresholdHeartRate,
        thresholdPace: thresholdPace,
        vdotCorrectionFactor: vdotCorrectionFactor,
        lastSyncAt: lastSyncAt,
        createdAt: createdAt,
      );
}

extension UpdateProfileRequestMapper on UpdateProfileRequest {
  domain.UpdateProfileRequest toDomain() => domain.UpdateProfileRequest(
        name: name,
        sex: sex?.toDomain(),
        birthDate: birthDate,
        hrMax: hrMax,
        hrRest: hrRest,
        weight: weight,
        height: height,
        hrZone1Max: hrZone1Max,
        hrZone2Max: hrZone2Max,
        hrZone3Max: hrZone3Max,
        hrZone4Max: hrZone4Max,
        hrZone5Max: hrZone5Max,
        hrZone6Max: hrZone6Max,
        thresholdHeartRate: thresholdHeartRate,
        thresholdPace: thresholdPace,
        vdotCorrectionFactor: vdotCorrectionFactor,
      );
}

extension DomainUpdateProfileRequestMapper on domain.UpdateProfileRequest {
  UpdateProfileRequest toData() => UpdateProfileRequest(
        name: name,
        sex: sex?.toData(),
        birthDate: birthDate,
        hrMax: hrMax,
        hrRest: hrRest,
        weight: weight,
        height: height,
        hrZone1Max: hrZone1Max,
        hrZone2Max: hrZone2Max,
        hrZone3Max: hrZone3Max,
        hrZone4Max: hrZone4Max,
        hrZone5Max: hrZone5Max,
        hrZone6Max: hrZone6Max,
        thresholdHeartRate: thresholdHeartRate,
        thresholdPace: thresholdPace,
        vdotCorrectionFactor: vdotCorrectionFactor,
      );
}
