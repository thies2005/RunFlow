import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';

class ReadinessRemoteDatasource {
  ReadinessRemoteDatasource({required this.dio});

  final Dio dio;

  Future<DailyReadinessRecordModel> upsertDailyRecord(
    DailyReadinessRecordModel record,
  ) async {
    try {
      final response = await dio.post(
        ApiConstants.readinessDailyPath,
        data: record.toJson(),
      );
      return DailyReadinessRecordModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to upsert daily record.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<DailyReadinessRecordModel?> getDailyRecord(String date) async {
    try {
      final response = await dio.get(
        ApiConstants.readinessDailyPath,
        queryParameters: {'date': date},
      );
      if (response.data == null) return null;
      return DailyReadinessRecordModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get daily record.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<DailyReadinessRecordModel> patchOverride(
    String date,
    Map<String, dynamic> overrideData,
  ) async {
    try {
      final response = await dio.patch(
        '${ApiConstants.readinessDailyPath}/$date',
        data: overrideData,
      );
      return DailyReadinessRecordModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to patch override.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<List<DailyReadinessRecordModel>> getHistory(
    String start,
    String end,
  ) async {
    try {
      final response = await dio.get(
        ApiConstants.readinessHistoryPath,
        queryParameters: {'start': start, 'end': end},
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((e) => DailyReadinessRecordModel.fromJson(
                e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get history.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<ReadinessBaselineModel> upsertBaseline(
    ReadinessBaselineModel baseline,
  ) async {
    try {
      final response = await dio.put(
        ApiConstants.readinessBaselinePath,
        data: baseline.toJson(),
      );
      return ReadinessBaselineModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to upsert baseline.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<ReadinessBaselineModel?> getBaseline() async {
    try {
      final response = await dio.get(ApiConstants.readinessBaselinePath);
      if (response.data == null) return null;
      return ReadinessBaselineModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get baseline.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<AdaptedWorkoutModel> upsertAdaptedWorkout(
    AdaptedWorkoutModel adapted,
  ) async {
    try {
      final response = await dio.post(
        '${ApiConstants.readinessDailyPath}/adapted-workout',
        data: adapted.toJson(),
      );
      return AdaptedWorkoutModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to upsert adapted workout.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<WeeklyReconciliationRecordModel> upsertWeeklyRecord(
    WeeklyReconciliationRecordModel record,
  ) async {
    try {
      final response = await dio.post(
        ApiConstants.readinessWeeklyPath,
        data: record.toJson(),
      );
      return WeeklyReconciliationRecordModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to upsert weekly record.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<WeeklyReconciliationRecordModel?> getWeeklyRecord(
    String weekStart,
  ) async {
    try {
      final response = await dio.get(
        '${ApiConstants.readinessWeeklyPath}/$weekStart',
      );
      if (response.data == null) return null;
      return WeeklyReconciliationRecordModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get weekly record.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
