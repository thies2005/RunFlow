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
      if (data is! Map<String, dynamic>) return [];

      final ctlList = (data['ctl'] as List?) ?? [];
      final atlList = (data['atl'] as List?) ?? [];
      final tsbList = (data['tsb'] as List?) ?? [];

      final atlByDate = <String, double>{};
      for (final item in atlList) {
        final m = item as Map<String, dynamic>;
        atlByDate[m['date'] as String] = (m['value'] as num?)?.toDouble() ?? 0.0;
      }

      final tsbByDate = <String, double>{};
      for (final item in tsbList) {
        final m = item as Map<String, dynamic>;
        tsbByDate[m['date'] as String] = (m['value'] as num?)?.toDouble() ?? 0.0;
      }

      final result = <FitnessHistory>[];
      for (final item in ctlList) {
        final m = item as Map<String, dynamic>;
        final dateStr = m['date'] as String;
        final ctlVal = (m['value'] as num?)?.toDouble() ?? 0.0;
        result.add(FitnessHistory(
          date: DateTime.parse(dateStr),
          metrics: FitnessHistoryMetrics(
            ctl: ctlVal,
            atl: atlByDate[dateStr] ?? 0.0,
            tsb: tsbByDate[dateStr] ?? 0.0,
            ctlRunning: 0.0,
          ),
        ));
      }

      return result;
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
