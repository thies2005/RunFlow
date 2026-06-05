import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final exception = _mapDioException(err);
    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: exception,
      ),
    );
  }

  AppException _mapDioException(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkException(
          message: 'Connection timed out. Please try again.',
        );
      case DioExceptionType.connectionError:
        return const NetworkException(
          message: 'No internet connection. Please check your network.',
        );
      case DioExceptionType.badResponse:
        return _mapResponseError(err);
      case DioExceptionType.cancel:
        return const NetworkException(message: 'Request was cancelled.');
      case DioExceptionType.badCertificate:
        return const NetworkException(
          message: 'Certificate verification failed.',
        );
      case DioExceptionType.unknown:
        return NetworkException(
          message: err.message ?? 'An unexpected error occurred.',
        );
    }
  }

  AppException _mapResponseError(DioException err) {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;

    String apiMessage = 'An error occurred.';

    if (data is Map<String, dynamic>) {
      apiMessage = (data['error'] as String?) ?? apiMessage;
    } else if (data is String) {
      try {
        final decoded = jsonDecode(data) as Map<String, dynamic>;
        apiMessage = (decoded['error'] as String?) ?? apiMessage;
      } catch (e, stack) {
      logger.debug('Exception: $e\n$stack');
        // use default message
      }
    }

    switch (statusCode) {
      case 400:
        return ValidationException(message: apiMessage);
      case 401:
        return AuthException(
          message: apiMessage,
          statusCode: statusCode,
        );
      case 403:
        return AuthException(
          message: apiMessage,
          statusCode: statusCode,
        );
      case 404:
        return ServerException(
          message: apiMessage,
          statusCode: statusCode,
        );
      case 409:
        return ServerException(
          message: apiMessage,
          statusCode: statusCode,
        );
      case 429:
        return ServerException(
          message: 'Too many requests. Please try again later.',
          statusCode: statusCode,
        );
      case 500:
      case 502:
      case 503:
        return const ServerException(
          message: 'Server error. Please try again later.',
        );
      default:
        return ServerException(
          message: apiMessage,
          statusCode: statusCode,
        );
    }
  }
}
