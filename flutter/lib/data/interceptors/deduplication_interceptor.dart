import 'dart:async';

import 'package:dio/dio.dart';

class DeduplicationInterceptor extends Interceptor {
  final Map<String, Completer<Response<dynamic>>> _pendingRequests = {};

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final key = _requestKey(options);

    final existing = _pendingRequests[key];
    if (existing != null) {
      try {
        final response = await existing.future;
        handler.resolve(response);
        return;
      } catch (e) {
        handler.next(options);
        return;
      }
    }

    final completer = Completer<Response<dynamic>>();
    _pendingRequests[key] = completer;
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    final key = _requestKey(response.requestOptions);
    final completer = _pendingRequests.remove(key);
    completer?.complete(response);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final key = _requestKey(err.requestOptions);
    final completer = _pendingRequests.remove(key);
    completer?.completeError(err);
    handler.next(err);
  }

  String _requestKey(RequestOptions options) {
    final params = options.queryParameters.entries
        .map((e) => '${e.key}=${e.value}')
        .toList()
      ..sort();
    return '${options.method}:${options.uri}?${params.join('&')}';
  }
}
