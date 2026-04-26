import 'dart:math';

import 'package:dio/dio.dart';

class RetryInterceptor extends QueuedInterceptor {
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

    final delay = _calculateBackoff(retryCount);
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
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return true;
    }

    final statusCode = err.response?.statusCode;
    if (statusCode == null) return false;

    if (statusCode >= 500) return true;
    if (statusCode == 408 || statusCode == 429) return true;

    return false;
  }

  Duration _calculateBackoff(int retryCount) {
    final exponentialMs = _baseDelay.inMilliseconds * (1 << retryCount);
    final jitterMs = Random().nextInt(_maxJitterMs);
    return Duration(milliseconds: exponentialMs + jitterMs);
  }
}
