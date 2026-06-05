import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/domain/services/auth_service.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this.authService});

  final AuthService authService;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await authService.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
      logger.debug('Auth: Added token to ${options.uri}');
    } else {
      logger.debug('Auth: No token available for ${options.uri}');
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    logger.error('API Error: ${err.message} [${err.response?.statusCode}] ${err.requestOptions.uri}');
    handler.next(err);
  }
}
