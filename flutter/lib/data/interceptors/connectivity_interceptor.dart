import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';

class OfflineException extends AppException {
  const OfflineException({String? cachedData})
      : _cachedData = cachedData,
        super(message: 'No internet connection.', code: 'OFFLINE');

  final String? _cachedData;

  String? get cachedData => _cachedData;
}

class ConnectivityInterceptor extends Interceptor {
  ConnectivityInterceptor({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final results = await _connectivity.checkConnectivity();
    final isOffline = results.every((r) => r == ConnectivityResult.none);

    if (isOffline) {
      handler.reject(
        DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
          error: const OfflineException(),
        ),
      );
      return;
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      final isOffline = err.error is OfflineException;
      if (isOffline) {
        handler.next(err);
        return;
      }
    }
    handler.next(err);
  }
}
