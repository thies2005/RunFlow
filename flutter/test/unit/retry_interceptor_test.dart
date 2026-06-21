import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/interceptors/retry_interceptor.dart';

void main() {
  group('RetryInterceptor', () {
    test(
        'does NOT retry a POST on connection timeout (would duplicate writes)',
        () async {
      final adapter = _FlakyAdapter(failTimes: 1);
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio: dio, maxRetries: 3));

      try {
        await dio.post<dynamic>('/activities', data: {});
        fail('Expected a DioException');
      } on DioException {
        // expected
      }

      expect(
        adapter.calls,
        1,
        reason: 'POST must not be retried on a network-level error',
      );
    });

    test('retries a GET on connection timeout (idempotent)', () async {
      final adapter = _FlakyAdapter(failTimes: 1);
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio: dio, maxRetries: 3));

      final response = await dio.get<dynamic>('/dashboard');

      expect(response.statusCode, 200);
      expect(adapter.calls, greaterThanOrEqualTo(2),
          reason: 'GET should be retried on a network-level error');
    });

    test('retries a POST on a retryable status (server did not apply)', () async {
      final adapter = _FlakyAdapter(
        failTimes: 1,
        errorType: DioExceptionType.badResponse,
        statusOnFail: 503,
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio: dio, maxRetries: 3));

      final response = await dio.post<dynamic>('/activities', data: {});

      expect(response.statusCode, 200);
      expect(adapter.calls, greaterThanOrEqualTo(2),
          reason: 'POST should be retried on a 503 since it was not applied');
    });

    test('honors the noRetry extra flag', () async {
      final adapter = _FlakyAdapter(failTimes: 1);
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
        ..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio: dio, maxRetries: 3));

      try {
        await dio.get<dynamic>(
          '/dashboard',
          options: Options(extra: {'noRetry': true}),
        );
        fail('Expected a DioException');
      } on DioException {
        // expected
      }

      expect(adapter.calls, 1, reason: 'noRetry must short-circuit retry');
    });
  });
}

class _FlakyAdapter implements HttpClientAdapter {
  _FlakyAdapter({
    required this.failTimes,
    this.errorType = DioExceptionType.connectionTimeout,
    this.statusOnFail,
  });

  final int failTimes;
  final DioExceptionType errorType;
  final int? statusOnFail;

  int _calls = 0;
  int get calls => _calls;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    _calls++;
    if (_calls <= failTimes) {
      if (errorType == DioExceptionType.badResponse && statusOnFail != null) {
        return ResponseBody.fromString(
          jsonEncode({'error': 'unavailable'}),
          statusOnFail!,
          headers: const {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      }
      throw DioException(
        requestOptions: options,
        type: errorType,
      );
    }
    return ResponseBody.fromString(
      '{}',
      200,
      headers: const {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
