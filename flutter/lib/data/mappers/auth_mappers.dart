import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart' as domain;

extension SexMapper on Sex {
  domain.Sex toDomain() => domain.Sex.values[index];
}

extension DomainSexMapper on domain.Sex {
  Sex toData() => Sex.values[index];
}

extension UserMapper on User {
  domain.User toDomain() => domain.User(
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
        vdotCorrectionFactor: vdotCorrectionFactor,
        lastSyncAt: lastSyncAt,
        emailVerified: emailVerified,
      );
}

extension DomainUserMapper on domain.User {
  User toData() => User(
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
        vdotCorrectionFactor: vdotCorrectionFactor,
        lastSyncAt: lastSyncAt,
        emailVerified: emailVerified,
      );
}

extension LoginResponseMapper on LoginResponse {
  domain.LoginResponse toDomain() => domain.LoginResponse(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        tokenType: tokenType,
        user: user.toDomain(),
      );
}

extension DomainLoginResponseMapper on domain.LoginResponse {
  LoginResponse toData() => LoginResponse(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        tokenType: tokenType,
        user: user.toData(),
      );
}
