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

    if (response.data == null) {
      throw const FormatException('Refresh response contained no data');
    }

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
}) {
  return dio.post<Map<String, dynamic>>(
    ApiConstants.refreshPath,
    data: RefreshRequest(refreshToken: refreshToken).toJson(),
    options: Options(
      extra: const {
        'skipAuthRefresh': true,
      },
    ),
  );
}
