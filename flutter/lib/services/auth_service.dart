import 'package:runflow_flutter/data/models/auth_models.dart';

abstract class AuthService {
  Future<bool> get isLoggedIn;
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<User?> getUser();
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  });
  Future<void> storeUser(User user);
  Future<void> clearTokens();
  Future<void> clearAll();
}
