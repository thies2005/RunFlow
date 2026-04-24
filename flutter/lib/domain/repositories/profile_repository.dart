import 'package:runflow_flutter/data/models/profile_models.dart';

abstract class ProfileRepository {
  Future<UserProfile> getProfile();

  Future<UserProfile> updateProfile(UpdateProfileRequest request);
}
