import 'dart:math';

import 'package:dio/dio.dart';

class RetryInterceptor extends Interceptor {
  RetryInterceptor({
    required this.dio,
    this.maxRetries = 3,
    this.retryableStatusCodes = const {408, 429, 500, 502, 503, 504},
  });

  final Dio dio;
  final int maxRetries;
  final Set<int> retryableStatusCodes;

  static const _baseDelay = Duration(seconds: 1);
  static const _maxJitterMs = 500;

  static const _idempotentMethods = {'GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'};

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final extra = err.requestOptions.extra;
    if (extra['noRetry'] == true) {
      handler.next(err);
      return;
    }

    final retryCount = (extra['retryCount'] as int?) ?? 0;
    if (retryCount >= maxRetries || !_shouldRetry(err)) {
      handler.next(err);
      return;
    }

    final delay = _calculateBackoff(retryCount, err.response?.headers);
    await Future<void>.delayed(delay);

    try {
      final newExtra = Map<String, dynamic>.from(extra)
        ..['retryCount'] = retryCount + 1;

      final response = await dio.fetch<dynamic>(
        err.requestOptions.copyWith(extra: newExtra),
      );
      handler.resolve(response);
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  bool _shouldRetry(DioException err) {
    final method = err.requestOptions.method.toUpperCase();

    // Network-level errors (timeouts, connection failures) are only safe to
    // retry for idempotent methods: a POST/PUT that times out may have already
    // been applied by the server, and re-issuing it would create a duplicate
    // write (activities, weight logs, AI scans, etc.).
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return _idempotentMethods.contains(method);
    }

    final statusCode = err.response?.statusCode;
    if (statusCode == null) return false;

    // Retryable status codes (5xx/408/429) mean the server did not apply the
    // request, so retrying is safe regardless of method.
    return retryableStatusCodes.contains(statusCode);
  }

  Duration _calculateBackoff(int retryCount, Headers? responseHeaders) {
    final serverHint = _retryAfterMillis(responseHeaders);
    final exponentialMs = _baseDelay.inMilliseconds * (1 << retryCount);
    final jitterMs = Random().nextInt(_maxJitterMs);
    final computed = exponentialMs + jitterMs;
    return Duration(milliseconds: max(serverHint, computed));
  }

  int _retryAfterMillis(Headers? headers) {
    final value = headers?.value('retry-after');
    if (value == null || value.isEmpty) return 0;
    final seconds = int.tryParse(value);
    if (seconds == null) return 0;
    return seconds * 1000;
  }
}
