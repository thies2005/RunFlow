import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/domain/repositories/health_api_repository.dart';

class HealthApiRepositoryImpl implements HealthApiRepository {
  HealthApiRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<void> syncNutritionLog(NutritionLog log) async {
    try {
      await dio.post(
        ApiConstants.nutritionLogPath,
        data: log.toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to sync nutrition log.');
    }
  }

  @override
  Future<List<FoodItem>> searchFood(String query) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionSearchPath,
        queryParameters: {'q': query},
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                FoodItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final foods = map['foods'] as List<dynamic>? ?? [];
      return foods
          .map((dynamic item) =>
              FoodItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to search food.');
    }
  }

  @override
  Future<FoodItem?> scanBarcode(String code) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionScanPath,
        queryParameters: {'barcode': code},
      );
      final data = response.data;
      if (data == null) return null;
      if (data is Map<String, dynamic>) {
        final foodData = data['food'] as Map<String, dynamic>? ?? data;
        return FoodItem.fromJson(foodData);
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _mapException(e, 'Failed to scan barcode.');
    }
  }

  @override
  Future<FoodItem?> aiScanImage(String imagePath) async {
    try {
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(imagePath),
      });
      final response = await dio.post(
        ApiConstants.nutritionAiScanPath,
        data: formData,
      );
      final data = response.data;
      if (data == null) return null;
      if (data is Map<String, dynamic>) {
        final foodData = data['food'] as Map<String, dynamic>? ?? data;
        return FoodItem.fromJson(foodData);
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _mapException(e, 'Failed to scan image with AI.');
    }
  }

  @override
  Future<List<Supplement>> getSupplements() async {
    try {
      final response = await dio.get(ApiConstants.supplementsPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                Supplement.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final supplements = map['supplements'] as List<dynamic>? ?? [];
      return supplements
          .map((dynamic item) =>
              Supplement.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get supplements.');
    }
  }

  @override
  Future<void> saveSupplementRemote(Supplement supplement) async {
    try {
      await dio.post(
        ApiConstants.supplementsPath,
        data: supplement.toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to save supplement.');
    }
  }

  @override
  Future<void> syncFasting(FastingSession session) async {
    try {
      if (session.isActive) {
        await dio.post(
          ApiConstants.fastingPath,
          data: {
            'action': 'start',
            'startTime': session.startTime.toIso8601String(),
          },
        );
      } else {
        await dio.post(
          ApiConstants.fastingPath,
          data: {
            'action': 'end',
            'endTime': session.endTime?.toIso8601String(),
          },
        );
      }
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to sync fasting session.');
    }
  }

  @override
  Future<void> syncBodyMeasurement(BodyMeasurement measurement) async {
    try {
      await dio.post(
        ApiConstants.bodyCompositionPath,
        data: measurement.toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to sync body measurement.');
    }
  }

  @override
  Future<List<BodyMeasurement>> getBodyMeasurements() async {
    try {
      final response = await dio.get(ApiConstants.bodyCompositionPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                BodyMeasurement.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final measurements = map['measurements'] as List<dynamic>? ?? map['data'] as List<dynamic>? ?? [];
      return measurements
          .map((dynamic item) =>
              BodyMeasurement.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get body measurements.');
    }
  }

  @override
  Future<void> batchSync(Map<String, dynamic> allData) async {
    try {
      await dio.post(
        ApiConstants.healthSyncBatchPath,
        data: {'data': allData['data']},
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to batch sync.');
    }
  }

  @override
  Future<Map<String, dynamic>> getInsights() async {
    try {
      final response = await dio.get(ApiConstants.healthInsightsPath);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get insights.');
    }
  }

  @override
  Future<NutritionTargets> getNutritionTargets() async {
    try {
      final response = await dio.get(ApiConstants.nutritionTargetPath);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final targetData =
            data['target'] as Map<String, dynamic>? ?? data;
        return NutritionTargets.fromJson(targetData);
      }
      return const NutritionTargets(
        calories: 2500,
        protein: 150,
        carbs: 300,
        fat: 80,
        water: 2.0,
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get nutrition targets.');
    }
  }

  @override
  Future<void> setNutritionTargets(NutritionTargets targets) async {
    try {
      await dio.post(
        ApiConstants.nutritionTargetPath,
        data: targets.toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to set nutrition targets.');
    }
  }

  @override
  Future<DailyHealthLog> getDailyHealth(DateTime date) async {
    try {
      final dateStr = date.toIso8601String().split('T').first;
      final response = await dio.get(
        ApiConstants.healthDailyPath,
        queryParameters: {'date': dateStr},
      );
      return DailyHealthLog.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get daily health.');
    }
  }

  @override
  Future<void> updateWater(DateTime date, double amount) async {
    try {
      await dio.post(
        '${ApiConstants.healthDailyPath}/water',
        data: {'date': date.toIso8601String().split('T').first, 'amount': amount},
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to update water.');
    }
  }

  @override
  Future<void> toggleSupplementLog(String supplementId, DateTime date, bool taken) async {
    try {
      await dio.post(
        '${ApiConstants.supplementsPath}/log',
        data: {
          'supplementId': supplementId,
          'date': date.toIso8601String().split('T').first,
          'taken': taken,
        },
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to toggle supplement log.');
    }
  }

  @override
  Future<NutritionAnalytics> getNutritionAnalytics(DateTime startDate, DateTime endDate) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionAnalyticsPath,
        queryParameters: {
          'startDate': startDate.toIso8601String().split('T').first,
          'endDate': endDate.toIso8601String().split('T').first,
        },
      );
      return NutritionAnalytics.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get nutrition analytics.');
    }
  }

  @override
  Future<SupplementAnalytics> getSupplementAnalytics() async {
    try {
      final response = await dio.get(ApiConstants.supplementsAnalyticsPath);
      return SupplementAnalytics.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get supplement analytics.');
    }
  }

  @override
  Future<HealthHistory> getHealthHistory(String range) async {
    try {
      final response = await dio.get(
        ApiConstants.healthHistoryPath,
        queryParameters: {'range': range},
      );
      return HealthHistory.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get health history.');
    }
  }

  AppException _mapException(DioException e, String fallback) {
    return e.error is AppException
        ? e.error as AppException
        : ServerException(
            message: fallback,
            statusCode: e.response?.statusCode,
          );
  }
}
