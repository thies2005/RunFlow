import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/interceptors/deduplication_interceptor.dart';

void main() {
  group('DeduplicationInterceptor', () {
    late DeduplicationInterceptor interceptor;

    setUp(() {
      interceptor = DeduplicationInterceptor();
    });

    tearDown(() {
      interceptor.close();
    });

    test('constructor starts cleanup timer', () {
      final fresh = DeduplicationInterceptor();
      expect(fresh, isNotNull);
      fresh.close();
    });

    test('close stops cleanup timer and can be called multiple times', () {
      interceptor.close();
      interceptor.close();
    });

    test('GET requests are deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.get<dynamic>('/test'),
        dio.get<dynamic>('/test'),
        dio.get<dynamic>('/test'),
      ]);

      expect(responses, hasLength(3));
      expect(adapter.requestCount, 1);
      expect(responses.every((r) => r.statusCode == 200), isTrue);
    });

    test('POST requests are not deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.post<dynamic>('/test'),
        dio.post<dynamic>('/test'),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 2);
    });

    test('PUT requests are not deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.put<dynamic>('/test'),
        dio.put<dynamic>('/test'),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 2);
    });

    test('DELETE requests are not deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.delete<dynamic>('/test'),
        dio.delete<dynamic>('/test'),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 2);
    });

    test('dedup key does not have trailing ? for no-param requests', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.get<dynamic>('/dashboard'),
        dio.get<dynamic>('/dashboard'),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 1);
    });

    test('dedup key includes params when they exist', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.get<dynamic>('/test', queryParameters: {'page': 1}),
        dio.get<dynamic>('/test', queryParameters: {'page': 1}),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 1);
    });

    test('requests with different params are not deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.get<dynamic>('/test', queryParameters: {'page': 1}),
        dio.get<dynamic>('/test', queryParameters: {'page': 2}),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 2);
    });

    test('requests with different paths are not deduplicated', () async {
      final adapter = _CountingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(interceptor);

      final responses = await Future.wait([
        dio.get<dynamic>('/test-a'),
        dio.get<dynamic>('/test-b'),
      ]);

      expect(responses, hasLength(2));
      expect(adapter.requestCount, 2);
    });
  });
}

class _CountingAdapter implements HttpClientAdapter {
  int requestCount = 0;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestCount += 1;
    await Future<void>.delayed(const Duration(milliseconds: 10));
    return ResponseBody.fromString(
      jsonEncode({'ok': true}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
