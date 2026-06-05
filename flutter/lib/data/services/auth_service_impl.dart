import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/services/auth_service.dart';

class AuthServiceImpl implements AuthService {
  AuthServiceImpl({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_json';

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  @override
  Future<void> storeUser(User user) async {
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
  }

  @override
  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  @override
  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  @override
  Future<User?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    return User.fromJson(
      Map<String, dynamic>.from(jsonDecode(raw) as Map),
    );
  }

  @override
  Future<bool> get isLoggedIn async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  @override
  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  @override
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
