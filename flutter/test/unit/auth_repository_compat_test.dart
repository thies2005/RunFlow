import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/services/auth_service.dart';

void main() {
  group('AuthRepositoryImpl compatibility', () {
    test('email login uses dedicated endpoint and payload', () async {
      final adapter = _RecordingHttpClientAdapter();
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: _MemoryAuthService(),
      );

      await repository.loginWithEmail(
        email: 'runner@example.com',
        password: 'secret',
      );

      expect(adapter.lastPath, ApiConstants.emailLoginPath);
      expect(adapter.lastBody['email'], 'runner@example.com');
      expect(adapter.lastBody['password'], 'secret');
      expect(adapter.lastBody.containsKey('code'), isFalse);
    });
  });
}

class _MemoryAuthService implements AuthService {
  @override
  Future<void> clearAll() async {}

  @override
  Future<void> clearTokens() async {}

  @override
  Future<String?> getAccessToken() async => null;

  @override
  Future<String?> getRefreshToken() async => null;

  @override
  Future<User?> getUser() async => null;

  @override
  Future<bool> get isLoggedIn async => false;

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  @override
  Future<void> storeUser(User user) async {}
}

class _RecordingHttpClientAdapter implements HttpClientAdapter {
  late String lastPath;
  late Map<String, dynamic> lastBody;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastPath = options.path;
    lastBody = Map<String, dynamic>.from(options.data as Map);

    return ResponseBody.fromString(
      jsonEncode({
        'accessToken': 'token',
        'refreshToken': 'refresh',
        'expiresIn': 3600,
        'tokenType': 'Bearer',
        'user': {'id': 'u1', 'email': 'runner@example.com'},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
