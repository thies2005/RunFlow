import 'dart:async';

import 'package:dio/dio.dart';

class DeduplicationInterceptor extends Interceptor {
  DeduplicationInterceptor() {
    _cleanupTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      final now = DateTime.now();
      final staleKeys = _pendingRequests.entries
          .where((e) => now.difference(e.value.createdAt) > _timeout)
          .map((e) => e.key)
          .toList();
      for (final key in staleKeys) {
        final entry = _pendingRequests.remove(key);
        if (entry != null && !entry.completer.isCompleted) {
          entry.completer.completeError(
            DioException(
              requestOptions: RequestOptions(),
              error: 'Request deduplication timeout',
            ),
          );
        }
      }
    });
  }

  final Map<String, _PendingEntry> _pendingRequests = {};
  Timer? _cleanupTimer;

  static const _timeout = Duration(seconds: 30);
  static const _idempotentMethods = {'GET', 'HEAD', 'OPTIONS'};

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!_idempotentMethods.contains(options.method.toUpperCase())) {
      handler.next(options);
      return;
    }

    final key = _requestKey(options);

    final existing = _pendingRequests[key];
    if (existing != null) {
      try {
        final response = await existing.completer.future;
        handler.resolve(response);
        return;
      } catch (e) {
        handler.next(options);
        return;
      }
    }

    final completer = Completer<Response<dynamic>>();
    _pendingRequests[key] = _PendingEntry(completer);
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    final key = _requestKey(response.requestOptions);
    final entry = _pendingRequests.remove(key);
    if (entry != null && !entry.completer.isCompleted) {
      entry.completer.complete(response);
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final key = _requestKey(err.requestOptions);
    final entry = _pendingRequests.remove(key);
    if (entry != null && !entry.completer.isCompleted) {
      entry.completer.completeError(err);
    }
    handler.next(err);
  }

  void close() {
    _cleanupTimer?.cancel();
    _cleanupTimer = null;
    for (final entry in _pendingRequests.values) {
      if (!entry.completer.isCompleted) {
        entry.completer.completeError(
          DioException(
            requestOptions: RequestOptions(),
            error: 'Interceptor disposed',
          ),
        );
      }
    }
    _pendingRequests.clear();
  }

  String _requestKey(RequestOptions options) {
    final params = options.queryParameters.entries
        .map((e) => '${e.key}=${e.value}')
        .toList()
      ..sort();
    return '${options.method}:${options.uri}?${params.join('&')}';
  }
}

class _PendingEntry {
  _PendingEntry(this.completer) : createdAt = DateTime.now();

  final Completer<Response<dynamic>> completer;
  final DateTime createdAt;
}
