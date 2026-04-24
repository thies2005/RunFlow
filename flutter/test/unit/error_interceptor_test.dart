import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/interceptors/error_interceptor.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';

void main() {
  group('ErrorInterceptor', () {
    late ErrorInterceptor interceptor;

    setUp(() {
      interceptor = ErrorInterceptor();
    });

    DioException createError({
      required DioExceptionType type,
      int? statusCode,
      dynamic responseData,
    }) {
      return DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: type,
        response: statusCode != null
            ? Response(
                requestOptions: RequestOptions(path: '/test'),
                statusCode: statusCode,
                data: responseData,
              )
            : null,
      );
    }

    test('maps connection timeout to NetworkException', () async {
      final error = createError(type: DioExceptionType.connectionTimeout);
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error, isNotNull);
      expect(handler.error!.error, isA<NetworkException>());
      final ex = handler.error!.error as NetworkException;
      expect(ex.message, contains('timed out'));
    });

    test('maps connection error to NetworkException', () async {
      final error = createError(type: DioExceptionType.connectionError);
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error, isNotNull);
      expect(handler.error!.error, isA<NetworkException>());
      final ex = handler.error!.error as NetworkException;
      expect(ex.message, contains('internet'));
    });

    test('maps 400 to ValidationException', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 400,
        responseData: {'error': 'Bad request'},
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<ValidationException>());
    });

    test('maps 401 to AuthException', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 401,
        responseData: {'error': 'Unauthorized'},
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<AuthException>());
    });

    test('maps 404 to ServerException', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 404,
        responseData: {'error': 'Not found'},
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<ServerException>());
    });

    test('maps 429 to rate limit ServerException', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 429,
        responseData: {'error': 'Too many requests'},
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<ServerException>());
      final ex = handler.error!.error as ServerException;
      expect(ex.message, contains('Too many requests'));
    });

    test('maps 500 to ServerException', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 500,
        responseData: {'error': 'Internal error'},
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<ServerException>());
      final ex = handler.error!.error as ServerException;
      expect(ex.message, contains('Server error'));
    });

    test('maps string response body', () async {
      final error = createError(
        type: DioExceptionType.badResponse,
        statusCode: 401,
        responseData: '{"error":"Token expired"}',
      );
      final handler = _TestErrorHandler();

      interceptor.onError(error, handler);

      expect(handler.error!.error, isA<AuthException>());
    });
  });
}

class _TestErrorHandler extends ErrorInterceptorHandler {
  DioException? error;

  @override
  void next(DioException err) {
    error = err;
  }

  @override
  void resolve(Response<dynamic> response) {}

  @override
  void reject(DioException err) {
    error = err;
  }
}
