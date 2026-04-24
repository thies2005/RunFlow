import 'package:runflow_flutter/data/models/auth_models.dart';

abstract class AuthRepository {
  Future<LoginResponse> loginWithStravaCode(String code, {String? redirectUri});

  Future<LoginResponse> loginWithEmail({
    required String email,
    required String password,
  });

  Future<void> refreshToken();

  Future<void> logout();

  Future<bool> isLoggedIn();

  Future<User?> getCurrentUser();

  Future<void> restoreSession();
}
