import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/auth/refresh_session.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/domain/services/auth_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required this.dio,
    required this.authService,
  });

  final Dio dio;
  final AuthService authService;

  @override
  Future<domain.LoginResponse> loginWithStravaCode(
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

      return loginResponse.toDomain();
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
  Future<domain.LoginResponse> loginWithEmail({
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

      return loginResponse.toDomain();
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
  }) {
    return dio.post(
      ApiConstants.emailLoginPath,
      data: {
        'email': email,
        'password': password,
      },
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
      logger.error('[AuthRepositoryImpl] Logout request failed: $e');
    }
    await authService.clearAll();
  }

  @override
  void clearLocalSession() {
    authService.clearAll();
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
  Future<void> verifyEmail(String email, String code) async {
    try {
      await dio.post(
        ApiConstants.verifyEmailPath,
        data: {'email': email, 'code': code},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Email verification failed.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> resendVerification(String email) async {
    try {
      await dio.post(
        ApiConstants.resendVerificationPath,
        data: {'email': email},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : AuthException(
              message: 'Failed to resend verification email.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<bool> checkEmailVerified() async {
    try {
      final user = await getCurrentUser();
      return user?.emailVerified ?? false;
    } catch (e) {
      logger.debug('AuthRepository: Failed to check email verified: $e');
      return false;
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    return authService.isLoggedIn;
  }

  @override
  Future<domain.User?> getCurrentUser() async {
    final user = await authService.getUser();
    return user?.toDomain();
  }

  @override
  Future<void> restoreSession() async {
    final accessToken = await authService.getAccessToken();
    final storedRefreshToken = await authService.getRefreshToken();
    final user = await authService.getUser();

    if (user == null &&
        (accessToken == null || accessToken.isEmpty) &&
        (storedRefreshToken == null || storedRefreshToken.isEmpty)) {
      await authService.clearAll();
      throw const AuthException(message: 'No stored session.');
    }

    if (user != null && accessToken != null && accessToken.isNotEmpty) {
      return;
    }

    try {
      await refreshToken();
    } on DioException catch (error) {
      final canUseCachedSession = user != null &&
          (error.type == DioExceptionType.connectionError ||
              error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.receiveTimeout ||
              error.type == DioExceptionType.sendTimeout ||
              error.type == DioExceptionType.unknown);

      if (canUseCachedSession) {
        return;
      }

      if (user != null) {
        return;
      }

      rethrow;
    } on AuthException {
      // Refresh failed (rejected, or refresh token missing after a network
      // blip in refreshToken). Fail closed: clear the cached session and
      // surface the failure so the app logs the user out rather than
      // continuing as a ghost session that 401s on every request. This is
      // stricter than the old behavior but is the safer security posture.
      await authService.clearAll();
      rethrow;
    }
  }
}
