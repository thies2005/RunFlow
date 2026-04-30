import 'package:runflow_flutter/domain/entities/auth_entities.dart';

class UserProfile {
  const UserProfile({
    required this.id,
    this.email,
    this.name,
    this.image,
    this.sex,
    this.birthDate,
    this.hrMax,
    this.hrRest,
    this.weight,
    this.height,
    this.hrZone1Max,
    this.hrZone2Max,
    this.hrZone3Max,
    this.hrZone4Max,
    this.hrZone5Max,
    this.hrZone6Max,
    this.thresholdHeartRate,
    this.thresholdPace,
    this.vdotCorrectionFactor,
    this.lastSyncAt,
    this.createdAt,
  });

  final String id;
  final String? email;
  final String? name;
  final String? image;
  final Sex? sex;
  final DateTime? birthDate;
  final int? hrMax;
  final int? hrRest;
  final double? weight;
  final double? height;
  final int? hrZone1Max;
  final int? hrZone2Max;
  final int? hrZone3Max;
  final int? hrZone4Max;
  final int? hrZone5Max;
  final int? hrZone6Max;
  final int? thresholdHeartRate;
  final int? thresholdPace;
  final double? vdotCorrectionFactor;
  final DateTime? lastSyncAt;
  final DateTime? createdAt;

  UserProfile copyWith({
    String? id,
    String? email,
    String? name,
    String? image,
    Sex? sex,
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
    DateTime? lastSyncAt,
    DateTime? createdAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      image: image ?? this.image,
      sex: sex ?? this.sex,
      birthDate: birthDate ?? this.birthDate,
      hrMax: hrMax ?? this.hrMax,
      hrRest: hrRest ?? this.hrRest,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      hrZone1Max: hrZone1Max ?? this.hrZone1Max,
      hrZone2Max: hrZone2Max ?? this.hrZone2Max,
      hrZone3Max: hrZone3Max ?? this.hrZone3Max,
      hrZone4Max: hrZone4Max ?? this.hrZone4Max,
      hrZone5Max: hrZone5Max ?? this.hrZone5Max,
      hrZone6Max: hrZone6Max ?? this.hrZone6Max,
      thresholdHeartRate: thresholdHeartRate ?? this.thresholdHeartRate,
      thresholdPace: thresholdPace ?? this.thresholdPace,
      vdotCorrectionFactor: vdotCorrectionFactor ?? this.vdotCorrectionFactor,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserProfile &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          email == other.email &&
          name == other.name &&
          image == other.image &&
          sex == other.sex &&
          birthDate == other.birthDate &&
          hrMax == other.hrMax &&
          hrRest == other.hrRest &&
          weight == other.weight &&
          height == other.height &&
          hrZone1Max == other.hrZone1Max &&
          hrZone2Max == other.hrZone2Max &&
          hrZone3Max == other.hrZone3Max &&
          hrZone4Max == other.hrZone4Max &&
          hrZone5Max == other.hrZone5Max &&
          hrZone6Max == other.hrZone6Max &&
          thresholdHeartRate == other.thresholdHeartRate &&
          thresholdPace == other.thresholdPace &&
          vdotCorrectionFactor == other.vdotCorrectionFactor &&
          lastSyncAt == other.lastSyncAt &&
          createdAt == other.createdAt;

  @override
  int get hashCode => Object.hashAll([
        id,
        email,
        name,
        image,
        sex,
        birthDate,
        hrMax,
        hrRest,
        weight,
        height,
        hrZone1Max,
        hrZone2Max,
        hrZone3Max,
        hrZone4Max,
        hrZone5Max,
        hrZone6Max,
        thresholdHeartRate,
        thresholdPace,
        vdotCorrectionFactor,
        lastSyncAt,
        createdAt,
      ]);
}

class UpdateProfileRequest {
  const UpdateProfileRequest({
    this.name,
    this.sex,
    this.birthDate,
    this.hrMax,
    this.hrRest,
    this.weight,
    this.height,
    this.hrZone1Max,
    this.hrZone2Max,
    this.hrZone3Max,
    this.hrZone4Max,
    this.hrZone5Max,
    this.hrZone6Max,
    this.thresholdHeartRate,
    this.thresholdPace,
    this.vdotCorrectionFactor,
  });

  final String? name;
  final Sex? sex;
  final DateTime? birthDate;
  final int? hrMax;
  final int? hrRest;
  final double? weight;
  final double? height;
  final int? hrZone1Max;
  final int? hrZone2Max;
  final int? hrZone3Max;
  final int? hrZone4Max;
  final int? hrZone5Max;
  final int? hrZone6Max;
  final int? thresholdHeartRate;
  final int? thresholdPace;
  final double? vdotCorrectionFactor;

  UpdateProfileRequest copyWith({
    String? name,
    Sex? sex,
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
  }) {
    return UpdateProfileRequest(
      name: name ?? this.name,
      sex: sex ?? this.sex,
      birthDate: birthDate ?? this.birthDate,
      hrMax: hrMax ?? this.hrMax,
      hrRest: hrRest ?? this.hrRest,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      hrZone1Max: hrZone1Max ?? this.hrZone1Max,
      hrZone2Max: hrZone2Max ?? this.hrZone2Max,
      hrZone3Max: hrZone3Max ?? this.hrZone3Max,
      hrZone4Max: hrZone4Max ?? this.hrZone4Max,
      hrZone5Max: hrZone5Max ?? this.hrZone5Max,
      hrZone6Max: hrZone6Max ?? this.hrZone6Max,
      thresholdHeartRate: thresholdHeartRate ?? this.thresholdHeartRate,
      thresholdPace: thresholdPace ?? this.thresholdPace,
      vdotCorrectionFactor: vdotCorrectionFactor ?? this.vdotCorrectionFactor,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateProfileRequest &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          sex == other.sex &&
          birthDate == other.birthDate &&
          hrMax == other.hrMax &&
          hrRest == other.hrRest &&
          weight == other.weight &&
          height == other.height &&
          hrZone1Max == other.hrZone1Max &&
          hrZone2Max == other.hrZone2Max &&
          hrZone3Max == other.hrZone3Max &&
          hrZone4Max == other.hrZone4Max &&
          hrZone5Max == other.hrZone5Max &&
          hrZone6Max == other.hrZone6Max &&
          thresholdHeartRate == other.thresholdHeartRate &&
          thresholdPace == other.thresholdPace &&
          vdotCorrectionFactor == other.vdotCorrectionFactor;

  @override
  int get hashCode => Object.hashAll([
        name,
        sex,
        birthDate,
        hrMax,
        hrRest,
        weight,
        height,
        hrZone1Max,
        hrZone2Max,
        hrZone3Max,
        hrZone4Max,
        hrZone5Max,
        hrZone6Max,
        thresholdHeartRate,
        thresholdPace,
        vdotCorrectionFactor,
      ]);
}
