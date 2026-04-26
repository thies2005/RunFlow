import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/services/auth_service.dart';

void main() {
  group('AuthRepositoryImpl.register', () {
    test('sends email, password, and name to register endpoint', () async {
      final adapter = _RecordingHttpClientAdapter();
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: _MemoryAuthService(),
      );

      await repository.register(
        email: 'runner@example.com',
        password: 'secret123',
        name: 'Runner',
      );

      expect(adapter.lastPath, ApiConstants.registerPath);
      expect(adapter.lastBody['email'], 'runner@example.com');
      expect(adapter.lastBody['password'], 'secret123');
      expect(adapter.lastBody['name'], 'Runner');
    });

    test('throws AuthException on 409 conflict', () async {
      final adapter = _ErrorHttpClientAdapter(statusCode: 409);
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: _MemoryAuthService(),
      );

      expect(
        () => repository.register(
          email: 'taken@example.com',
          password: 'secret123',
          name: 'Runner',
        ),
        throwsA(isA<AuthException>()),
      );
    });

    test('stores tokens on successful registration', () async {
      final authService = _MemoryAuthService();
      final adapter = _RecordingHttpClientAdapter();
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: authService,
      );

      await repository.register(
        email: 'runner@example.com',
        password: 'secret123',
        name: 'Runner',
      );

      expect(authService.storedAccessToken, 'token');
      expect(authService.storedRefreshToken, 'refresh');
    });
  });

  group('AuthRepositoryImpl.forgotPassword', () {
    test('sends email to forgot-password endpoint', () async {
      final adapter = _RecordingHttpClientAdapter();
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: _MemoryAuthService(),
      );

      await repository.forgotPassword('runner@example.com');

      expect(adapter.lastPath, ApiConstants.forgotPasswordPath);
      expect(adapter.lastBody['email'], 'runner@example.com');
    });

    test('throws AuthException on network error', () async {
      final adapter = _ErrorHttpClientAdapter(statusCode: 500);
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;
      final repository = AuthRepositoryImpl(
        dio: dio,
        authService: _MemoryAuthService(),
      );

      expect(
        () => repository.forgotPassword('runner@example.com'),
        throwsA(isA<AuthException>()),
      );
    });
  });
}

class _MemoryAuthService implements AuthService {
  String? storedAccessToken;
  String? storedRefreshToken;
  User? storedUser;

  @override
  Future<void> clearAll() async {
    storedAccessToken = null;
    storedRefreshToken = null;
    storedUser = null;
  }

  @override
  Future<void> clearTokens() async {
    storedAccessToken = null;
    storedRefreshToken = null;
  }

  @override
  Future<String?> getAccessToken() async => storedAccessToken;

  @override
  Future<String?> getRefreshToken() async => storedRefreshToken;

  @override
  Future<User?> getUser() async => storedUser;

  @override
  Future<bool> get isLoggedIn async => storedAccessToken != null;

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    storedAccessToken = accessToken;
    storedRefreshToken = refreshToken;
  }

  @override
  Future<void> storeUser(User user) async {
    storedUser = user;
  }
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

class _ErrorHttpClientAdapter implements HttpClientAdapter {
  _ErrorHttpClientAdapter({required this.statusCode});

  final int statusCode;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'error': 'failed'}),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
