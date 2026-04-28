import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/auth/refresh_session.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/services/auth_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required this.dio,
    required this.authService,
  });

  final Dio dio;
  final AuthService authService;

  @override
  Future<LoginResponse> loginWithStravaCode(
    String code, {
    String? redirectUri,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.loginPath,
        data: LoginRequest(code: code, redirectUri: redirectUri).toJson(),
      );

      final loginResponse = LoginResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      await authService.storeTokens(
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
      );
      await authService.storeUser(loginResponse.user);

      return loginResponse;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Login failed. Please try again.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<LoginResponse> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _postEmailLogin(email: email, password: password);

      final loginResponse = LoginResponse.fromJson(
        response.data as Map<String, dynamic>,
      );

      await authService.storeTokens(
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
      );
      await authService.storeUser(loginResponse.user);

      return loginResponse;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Login failed. Please try again.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<Response<dynamic>> _postEmailLogin({
    required String email,
    required String password,
  }) async {
    final attempts = <Future<Response<dynamic>> Function()>[
      () => dio.post(
            ApiConstants.emailLoginPath,
            data: {
              'email': email,
              'password': password,
            },
          ),
      () => dio.post(
            ApiConstants.loginPath,
            data: {
              'email': email,
              'password': password,
            },
          ),
      () => dio.post(
            ApiConstants.loginPath,
            data: {
              'code': email,
              'password': password,
            },
          ),
    ];

    DioException? lastError;

    for (final attempt in attempts) {
      try {
        return await attempt();
      } on DioException catch (error) {
        lastError = error;
        final statusCode = error.response?.statusCode;
        if (statusCode != 404 && statusCode != 405) {
          rethrow;
        }
      }
    }

    throw lastError ??
        DioException(
          requestOptions: RequestOptions(path: ApiConstants.emailLoginPath),
          type: DioExceptionType.unknown,
        );
  }

  @override
  Future<void> refreshToken() async {
    try {
      final accessToken = await refreshSession(
        dio: dio,
        authService: authService,
      );
      if (accessToken == null || accessToken.isEmpty) {
        throw const AuthException(message: 'Session expired. Please log in again.');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await authService.clearAll();
      }
      throw e.error is AppException
          ? e.error as AppException
          : const AuthException(message: 'Session expired. Please log in again.');
    }
  }

  @override
  Future<void> logout() async {
    try {
      await dio.post('/auth/logout');
    } catch (e) {
      debugPrint('[AuthRepositoryImpl] Logout request failed: $e');
    }
    await authService.clearAll();
  }

  @override
  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.registerPath,
        data: {
          'email': email,
          'password': password,
          'name': name,
        },
      );
      final loginResponse = LoginResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
      final user = loginResponse.user;
      final tokens = <String, dynamic>{
        'accessToken': loginResponse.accessToken,
        'refreshToken': loginResponse.refreshToken,
      };
      final fullResponse = Map<String, dynamic>.from(tokens);
      fullResponse['tokenType'] = loginResponse.tokenType;
      fullResponse['user'] = {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'image': user.image,
      };
      await authService.storeTokens(
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
      );
      await authService.storeUser(user);
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      final errorData = e.response?.data;
      final errorMessage = errorData is Map<String, dynamic>
          ? (errorData['message'] as String?) ?? ''
          : '';
      if (statusCode == 409 ||
          (statusCode == 400 && errorMessage.contains('already exists'))) {
        throw AuthException(
          message: 'An account with this email already exists.',
          statusCode: statusCode,
        );
      }
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Registration failed. Please try again.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> forgotPassword(String email) async {
    try {
      await dio.post(
        ApiConstants.forgotPasswordPath,
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Password reset request failed. Please try again.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    return authService.isLoggedIn;
  }

  @override
  Future<User?> getCurrentUser() async {
    return authService.getUser();
  }

  @override
  Future<void> restoreSession() async {
    final accessToken = await authService.getAccessToken();
    final storedRefreshToken = await authService.getRefreshToken();
    final user = await authService.getUser();

    if (storedRefreshToken == null || storedRefreshToken.isEmpty || user == null) {
      await authService.clearAll();
      throw const AuthException(message: 'No stored session.');
    }

    try {
      await refreshToken();
    } on DioException catch (error) {
      final canUseCachedSession = accessToken != null &&
          accessToken.isNotEmpty &&
          (error.type == DioExceptionType.connectionError ||
              error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.receiveTimeout ||
              error.type == DioExceptionType.sendTimeout ||
              error.type == DioExceptionType.unknown);

      if (!canUseCachedSession) {
        rethrow;
      }
    }
  }
}
