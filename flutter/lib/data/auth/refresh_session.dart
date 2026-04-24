import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/services/auth_service.dart';

Future<String?> refreshSession({
  required Dio dio,
  required AuthService authService,
}) async {
  final refreshToken = await authService.getRefreshToken();
  if (refreshToken == null || refreshToken.isEmpty) {
    await authService.clearAll();
    return null;
  }

  try {
    final response = await _postRefresh(dio: dio, refreshToken: refreshToken);

    final refreshResponse = RefreshResponse.fromJson(response.data!);
    await authService.storeTokens(
      accessToken: refreshResponse.accessToken,
      refreshToken: refreshResponse.refreshToken,
    );
    return refreshResponse.accessToken;
  } on DioException catch (error) {
    if (error.response?.statusCode == 401) {
      await authService.clearAll();
      return null;
    }
    rethrow;
  }
}

Future<Response<Map<String, dynamic>>> _postRefresh({
  required Dio dio,
  required String refreshToken,
}) async {
  final attempts = <String>[
    ApiConstants.refreshPath,
    ApiConstants.legacyRefreshUrl,
  ];

  DioException? lastError;

  for (final path in attempts) {
    try {
      return await dio.post<Map<String, dynamic>>(
        path,
        data: RefreshRequest(refreshToken: refreshToken).toJson(),
        options: Options(
          extra: const {
            'skipAuthRefresh': true,
          },
        ),
      );
    } on DioException catch (error) {
      lastError = error;
      if (error.response?.statusCode != 404) {
        rethrow;
      }
    }
  }

  throw lastError ??
      DioException(
        requestOptions: RequestOptions(path: ApiConstants.refreshPath),
        type: DioExceptionType.unknown,
      );
}
