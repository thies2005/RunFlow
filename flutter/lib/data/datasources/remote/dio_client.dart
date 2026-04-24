import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';

class DioClient {
  DioClient({required Dio dio}) : _dio = dio {
    _dio.options = BaseOptions(
      baseUrl: ApiConstants.fullApiUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  final Dio _dio;

  Dio get dio => _dio;
}
