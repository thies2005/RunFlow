import 'package:runflow_flutter/domain/entities/profile_entities.dart';
import 'package:runflow_flutter/domain/entities/settings_entities.dart';

abstract class ProfileRepository {
  Future<UserProfile> getProfile();

  Future<UserProfile> updateProfile(UpdateProfileRequest request);

  Future<ApiKeyInfo> getApiKeyInfo();

  Future<GeneratedApiKey> generateApiKey({String name});

  Future<void> revokeApiKey();

  Future<void> deleteAccount();
}
