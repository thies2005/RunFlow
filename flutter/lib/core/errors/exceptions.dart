class AppException implements Exception {
  const AppException({
    required this.message,
    this.code,
    this.statusCode,
    this.originalError,
  });

  final String message;
  final String? code;
  final int? statusCode;
  final Object? originalError;

  @override
  String toString() => 'AppException($code): $message';
}

class AuthException extends AppException {
  const AuthException({required super.message, super.statusCode})
      : super(code: 'AUTH_ERROR');
}

class NetworkException extends AppException {
  const NetworkException({required super.message, super.statusCode})
      : super(code: 'NETWORK_ERROR');
}

class ServerException extends AppException {
  const ServerException({required super.message, super.statusCode = 500})
      : super(code: 'SERVER_ERROR');
}

class CacheException extends AppException {
  const CacheException({required super.message})
      : super(code: 'CACHE_ERROR');
}

class ValidationException extends AppException {
  const ValidationException({required super.message})
      : super(code: 'VALIDATION_ERROR');
}
