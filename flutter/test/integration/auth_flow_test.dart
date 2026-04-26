import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/services/auth_service.dart';

void main() {
  group('Auth flow integration', () {
    late _MemoryAuthService authService;
    late Dio dio;
    late AuthRepositoryImpl repository;

    setUp(() {
      authService = _MemoryAuthService();
      dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl));
      repository = AuthRepositoryImpl(dio: dio, authService: authService);
    });

    test('login stores tokens and getCurrentUser returns user', () async {
      dio.httpClientAdapter = _LoginSuccessAdapter();

      final response = await repository.loginWithStravaCode('valid_code');

      expect(response.accessToken, 'access_token_123');
      expect(response.refreshToken, 'refresh_token_456');

      final user = await repository.getCurrentUser();
      expect(user, isNotNull);
      expect(user!.id, 'user-1');
      expect(user.email, 'test@example.com');
    });

    test('login then isLoggedIn returns true', () async {
      dio.httpClientAdapter = _LoginSuccessAdapter();

      await repository.loginWithStravaCode('valid_code');

      expect(await repository.isLoggedIn(), true);
    });

    test('logout clears session and isLoggedIn returns false', () async {
      dio.httpClientAdapter = _LoginSuccessAdapter();

      await repository.loginWithStravaCode('valid_code');
      expect(await repository.isLoggedIn(), true);

      await repository.logout();
      expect(await repository.isLoggedIn(), false);
      expect(await repository.getCurrentUser(), isNull);
    });

    test('restoreSession throws when no stored session', () async {
      expect(
        () => repository.restoreSession(),
        throwsA(isA<AuthException>()),
      );
    });

    test('login with email uses email-login endpoint', () async {
      final adapter = _RecordingAdapter();
      dio.httpClientAdapter = adapter;

      await repository.loginWithEmail(email: 'user@test.com', password: 'pass123');

      expect(adapter.lastPath, ApiConstants.emailLoginPath);
      expect(adapter.lastBody['email'], 'user@test.com');
      expect(adapter.lastBody['password'], 'pass123');
    });

    test('login failure does not store tokens', () async {
      dio.httpClientAdapter = _ErrorAdapter(401);

      try {
        await repository.loginWithStravaCode('bad_code');
      } catch (_) {}

      expect(await authService.getAccessToken(), isNull);
      expect(await authService.getRefreshToken(), isNull);
      expect(await authService.getUser(), isNull);
    });

    test('register stores tokens on success', () async {
      dio.httpClientAdapter = _LoginSuccessAdapter();

      await repository.register(
        email: 'new@test.com',
        password: 'pass123',
        name: 'New User',
      );

      final user = await repository.getCurrentUser();
      expect(user, isNotNull);
    });
  });
}

class _MemoryAuthService implements AuthService {
  String? _accessToken;
  String? _refreshToken;
  User? _user;

  @override
  Future<void> clearAll() async {
    _accessToken = null;
    _refreshToken = null;
    _user = null;
  }

  @override
  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
  }

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<User?> getUser() async => _user;

  @override
  Future<bool> get isLoggedIn async => _refreshToken != null;

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<void> storeUser(User user) async {
    _user = user;
  }
}

class _LoginSuccessAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'accessToken': 'access_token_123',
        'refreshToken': 'refresh_token_456',
        'expiresIn': 3600,
        'tokenType': 'Bearer',
        'user': {'id': 'user-1', 'email': 'test@example.com', 'name': 'Test'},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _ErrorAdapter implements HttpClientAdapter {
  _ErrorAdapter(this.statusCode);

  final int statusCode;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString('{"error":"Unauthorized"}', statusCode);
  }
}

class _RecordingAdapter implements HttpClientAdapter {
  _RecordingAdapter();

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
