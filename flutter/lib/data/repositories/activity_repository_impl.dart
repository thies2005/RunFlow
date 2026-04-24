import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';

class ActivityRepositoryImpl implements ActivityRepository {
  ActivityRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    ActivityType? type,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'limit': limit,
        'offset': offset,
      };
      if (type != null) {
        queryParameters['type'] = type.name.toUpperCase();
      }
      final response = await dio.get(
        ApiConstants.activitiesPath,
        queryParameters: queryParameters,
      );
      return ActivitiesResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activities.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<Activity> getActivity(String id) async {
    try {
      final response = await dio.get('${ApiConstants.activitiesPath}/$id');
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(
        payload,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
