import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/repositories/analytics_repository.dart';

class AnalyticsRepositoryImpl implements AnalyticsRepository {
  AnalyticsRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<AnalyticsStats> getStats() async {
    try {
      final response = await dio.get(ApiConstants.analyticsStatsPath);
      return AnalyticsStats.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['analyticsStats', 'stats'],
        ),
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load analytics stats.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<List<FitnessHistory>> getHistory({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final response = await dio.get(
        ApiConstants.analyticsHistoryPath,
        queryParameters: {
          'startDate': startDate.toUtc().toIso8601String(),
          'endDate': endDate.toUtc().toIso8601String(),
        },
      );
      final data = response.data;
      final List<dynamic> items;
      if (data is List) {
        items = data;
      } else if (data is Map<String, dynamic>) {
        final unwrapped = unwrapPayload(data, const ['history', 'fitnessHistory']);
        final list = unwrapped['history'] ?? unwrapped['fitnessHistory'];
        if (list is List) {
          items = list;
        } else {
          items = [];
        }
      } else {
        items = [];
      }
      return items
          .map((e) => FitnessHistory.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load fitness history.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
