import 'package:runflow_flutter/domain/entities/auth_entities.dart';

abstract class AuthRepository {
  Future<LoginResponse> loginWithStravaCode(String code, {String? redirectUri});

  Future<LoginResponse> loginWithEmail({
    required String email,
    required String password,
  });

  Future<void> refreshToken();

  Future<void> logout();

  void clearLocalSession();

  Future<bool> isLoggedIn();

  Future<User?> getCurrentUser();

  Future<void> restoreSession();

  Future<void> register({
    required String email,
    required String password,
    required String name,
  });

  Future<void> forgotPassword(String email);

  Future<void> verifyEmail(String email, String code);

  Future<void> resendVerification(String email);

  Future<bool> checkEmailVerified();
}
