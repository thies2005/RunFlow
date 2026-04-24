import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/auth/refresh_session.dart';
import 'package:runflow_flutter/data/interceptors/auth_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/refresh_interceptor.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/services/auth_service.dart';

void main() {
  group('RefreshInterceptor', () {
    test('reuses a single refresh request for concurrent 401 responses', () async {
      final authService = _FakeAuthService(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        user: const User(id: 'user-1', email: 'runner@example.com'),
      );
      final adapter = _FakeHttpClientAdapter();
      final dio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.fullApiUrl,
          headers: const {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      )..httpClientAdapter = adapter;

      dio.interceptors.addAll([
        AuthInterceptor(authService: authService),
        RefreshInterceptor(authService: authService, dio: dio),
      ]);

      final responses = await Future.wait([
        dio.get<Map<String, dynamic>>('/protected'),
        dio.get<Map<String, dynamic>>('/protected'),
      ]);

      expect(adapter.refreshCalls, 1);
      expect(responses, hasLength(2));
      expect(responses.every((response) => response.statusCode == 200), isTrue);
      expect(await authService.getAccessToken(), 'fresh-token');
      expect(await authService.getRefreshToken(), 'fresh-refresh-token');
    });

    test('shared refresh helper clears stored session when refresh is rejected', () async {
      final authService = _FakeAuthService(
        accessToken: 'expired-token',
        refreshToken: 'bad-refresh-token',
        user: const User(id: 'user-1'),
      );
      final adapter = _FakeHttpClientAdapter(refreshSucceeds: false);
      final dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl))
        ..httpClientAdapter = adapter;

      final accessToken = await refreshSession(dio: dio, authService: authService);

      expect(accessToken, isNull);
      expect(adapter.refreshCalls, 1);
      expect(await authService.getAccessToken(), isNull);
      expect(await authService.getRefreshToken(), isNull);
      expect(await authService.getUser(), isNull);
    });
  });
}

class _FakeAuthService implements AuthService {
  _FakeAuthService({
    this.accessToken,
    this.refreshToken,
    this.user,
  });

  String? accessToken;
  String? refreshToken;
  User? user;

  @override
  Future<void> clearAll() async {
    accessToken = null;
    refreshToken = null;
    user = null;
  }

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
  }

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<User?> getUser() async => user;

  @override
  Future<bool> get isLoggedIn async => accessToken != null;

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  @override
  Future<void> storeUser(User user) async {
    this.user = user;
  }
}

class _FakeHttpClientAdapter implements HttpClientAdapter {
  _FakeHttpClientAdapter({this.refreshSucceeds = true});

  final bool refreshSucceeds;
  int refreshCalls = 0;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == ApiConstants.refreshPath) {
      refreshCalls += 1;
      await Future<void>.delayed(const Duration(milliseconds: 10));

      if (!refreshSucceeds) {
        return ResponseBody.fromString(
          jsonEncode({'error': 'Unauthorized'}),
          401,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }

      return ResponseBody.fromString(
        jsonEncode({
          'accessToken': 'fresh-token',
          'refreshToken': 'fresh-refresh-token',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }

    if (options.path == '/protected') {
      final authorization = options.headers['Authorization'];
      if (authorization == 'Bearer fresh-token') {
        return ResponseBody.fromString(
          jsonEncode({'ok': true}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }

      return ResponseBody.fromString(
        jsonEncode({'error': 'Unauthorized'}),
        401,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }

    return ResponseBody.fromString(
      jsonEncode({'error': 'Not Found'}),
      404,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
