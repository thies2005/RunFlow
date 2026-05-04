import 'dart:async';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/auth/refresh_session.dart';
import 'package:runflow_flutter/services/auth_service.dart';

class RefreshInterceptor extends QueuedInterceptor {
  RefreshInterceptor({
    required this.authService,
    required this.dio,
    this.onSessionExpired,
  });

  final AuthService authService;
  final Dio dio;
  final void Function()? onSessionExpired;

  Completer<String?>? _refreshCompleter;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    final shouldSkipRefresh = request.path == ApiConstants.refreshPath ||
        request.extra['skipAuthRefresh'] == true ||
        request.extra['retriedAfterRefresh'] == true;

    if (err.response?.statusCode != 401 || shouldSkipRefresh) {
      handler.next(err);
      return;
    }

    try {
      final currentAccessToken = await authService.getAccessToken();
      final requestAccessToken = request.headers['Authorization'];
      final refreshedToken = currentAccessToken != null &&
              currentAccessToken.isNotEmpty &&
              requestAccessToken != 'Bearer $currentAccessToken'
          ? currentAccessToken
          : await _refreshOrAwait();

      final newAccessToken = refreshedToken;
      if (newAccessToken == null || newAccessToken.isEmpty) {
        onSessionExpired?.call();
        handler.next(err);
        return;
      }

      final retryResponse = await _retryRequest(request, newAccessToken);
      handler.resolve(retryResponse);
    } on DioException catch (retryError) {
      handler.next(retryError);
    } catch (_) {
      handler.next(
        DioException(
          requestOptions: request,
          response: err.response,
          type: DioExceptionType.unknown,
          error: 'Session expired. Please log in again.',
        ),
      );
    }
  }

  Future<String?> _refreshOrAwait() async {
    final existingCompleter = _refreshCompleter;
    if (existingCompleter != null) {
      return existingCompleter.future;
    }

    final completer = Completer<String?>();
    _refreshCompleter = completer;

    try {
      final token = await refreshSession(dio: dio, authService: authService);
      completer.complete(token);
      return token;
    } catch (error, stackTrace) {
      completer.completeError(error, stackTrace);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }

  Future<Response<dynamic>> _retryRequest(
    RequestOptions request,
    String accessToken,
  ) {
    final headers = Map<String, dynamic>.from(request.headers)
      ..['Authorization'] = 'Bearer $accessToken';
    final extra = Map<String, dynamic>.from(request.extra)
      ..['retriedAfterRefresh'] = true;

    return dio.request<dynamic>(
      request.path,
      data: request.data,
      queryParameters: request.queryParameters,
      cancelToken: request.cancelToken,
      onReceiveProgress: request.onReceiveProgress,
      onSendProgress: request.onSendProgress,
      options: Options(
        method: request.method,
        headers: headers,
        extra: extra,
        responseType: request.responseType,
        contentType: request.contentType,
        sendTimeout: request.sendTimeout,
        receiveTimeout: request.receiveTimeout,
        followRedirects: request.followRedirects,
        validateStatus: request.validateStatus,
        receiveDataWhenStatusError: request.receiveDataWhenStatusError,
      ),
    );
  }
}
