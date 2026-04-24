import 'package:dio/dio.dart';
import 'package:runflow_flutter/services/auth_service.dart';

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
    }
    handler.next(options);
  }
}
