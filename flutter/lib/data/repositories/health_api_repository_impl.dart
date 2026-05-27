import 'dart:io';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/health_api_repository.dart';

class HealthApiRepositoryImpl implements HealthApiRepository {
  HealthApiRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<void> syncNutritionLog(domain.NutritionLog log) async {
    try {
      await dio.post(
        ApiConstants.nutritionLogPath,
        data: log.toData().toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to sync nutrition log.');
    }
  }

  @override
  Future<void> logFoodEntry({
    required DateTime date,
    required String mealType,
    required double quantity,
    required domain.FoodItem foodItem,
  }) async {
    try {
      final data = foodItem.toData();
      await dio.post(
        ApiConstants.nutritionLogPath,
        data: {
          'date': date.toIso8601String().split('T').first,
          'mealType': mealType,
          'quantity': quantity,
          'foodItem': {
            'name': data.name,
            'calories': data.calories,
            'protein': data.protein,
            'carbs': data.carbs,
            'fats': data.fat,
            'servingSize': '${data.servingSize.toInt()}g',
            if (data.barcode != null) 'barcode': data.barcode,
          },
        },
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to log food entry.');
    }
  }

  @override
  Future<List<domain.FoodItem>> searchFood(String query) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionSearchPath,
        queryParameters: {'q': query},
      );
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                FoodItem.fromJson(item as Map<String, dynamic>).toDomain())
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final foods = map['foods'] as List<dynamic>? ?? [];
      return foods
          .map((dynamic item) =>
              FoodItem.fromJson(item as Map<String, dynamic>).toDomain())
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to search food.');
    }
  }

  @override
  Future<domain.FoodItem?> scanBarcode(String code) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionScanPath,
        queryParameters: {'barcode': code},
      );
      final data = response.data;
      if (data == null) return null;
      if (data is Map<String, dynamic>) {
        final foodData = data['food'] as Map<String, dynamic>? ?? data;
        return FoodItem.fromJson(foodData).toDomain();
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _mapException(e, 'Failed to scan barcode.');
    }
  }

  @override
  Future<domain.FoodItem?> aiScanImage(String imagePath, {String? context}) async {
    try {
      final filename = imagePath.split(Platform.pathSeparator).last;
      final formFields = <String, dynamic>{
        'image': await MultipartFile.fromFile(imagePath, filename: filename),
      };
      if (context != null && context.isNotEmpty) {
        formFields['context'] = context;
      }
      final formData = FormData.fromMap(formFields);
      final response = await dio.post(
        ApiConstants.nutritionAiScanPath,
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 30),
        ),
      );
      final data = response.data;
      if (data == null) return null;
      if (data is Map<String, dynamic>) {
        // The AI scan endpoint returns a different format than FoodItem:
        // { mealName, items, totalCalories, totalProtein, totalCarbs, totalFats, ... }
        // We need to map it to a FoodItem manually.
        if (data.containsKey('food')) {
          final foodData = data['food'] as Map<String, dynamic>;
          return FoodItem.fromJson(foodData).toDomain();
        }
        // Handle AI scan response format
        final name = data['mealName'] as String? ?? 'Scanned Food';
        final totalCalories = (data['totalCalories'] as num?)?.toDouble() ?? 0;
        final totalProtein = (data['totalProtein'] as num?)?.toDouble() ?? 0;
        final totalCarbs = (data['totalCarbs'] as num?)?.toDouble() ?? 0;
        final totalFats = (data['totalFats'] as num?)?.toDouble() ?? 0;
        // Estimate serving size from total grams of items
        double servingGrams = 0;
        if (data['items'] is List) {
          for (final item in data['items'] as List) {
            if (item is Map<String, dynamic>) {
              servingGrams += (item['estimatedGrams'] as num?)?.toDouble() ?? 0;
            }
          }
        }
        if (servingGrams <= 0) servingGrams = 100;

        return domain.FoodItem(
          id: 0,
          name: name,
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFats,
          servingSize: servingGrams,
        );
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _mapException(e, 'Failed to scan image with AI.');
    }
  }

  @override
  Future<List<domain.Supplement>> getSupplements() async {
    try {
      final response = await dio.get(ApiConstants.supplementsPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                Supplement.fromJson(item as Map<String, dynamic>).toDomain())
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final supplements = map['supplements'] as List<dynamic>? ?? [];
      return supplements
          .map((dynamic item) =>
              Supplement.fromJson(item as Map<String, dynamic>).toDomain())
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get supplements.');
    }
  }

  @override
  Future<void> saveSupplementRemote(domain.Supplement supplement) async {
    try {
      await dio.post(
        ApiConstants.supplementsPath,
        data: supplement.toData().toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to save supplement.');
    }
  }

  @override
  Future<void> syncFasting(domain.FastingSession session) async {
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
  Future<void> syncBodyMeasurement(domain.BodyMeasurement measurement) async {
    try {
      final dateStr = measurement.date.toIso8601String().split('T').first;
      await dio.post(
        ApiConstants.bodyCompositionPath,
        data: {
          'dateStr': dateStr,
          'weight': measurement.weight,
          if (measurement.bodyFat >= 0) 'bodyFat': measurement.bodyFat,
          if (measurement.chest != null) 'chest': measurement.chest,
          if (measurement.waist != null) 'waist': measurement.waist,
          if (measurement.hips != null) 'hips': measurement.hips,
        },
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to sync body measurement.');
    }
  }

  @override
  Future<List<domain.BodyMeasurement>> getBodyMeasurements() async {
    try {
      final response = await dio.get(ApiConstants.bodyCompositionPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) => _parseBodyMeasurement(item as Map<String, dynamic>).toDomain())
            .toList();
      }
      final map = data as Map<String, dynamic>;
      final measurements = map['measurements'] as List<dynamic>? ?? map['data'] as List<dynamic>? ?? [];
      return measurements
          .map((dynamic item) => _parseBodyMeasurement(item as Map<String, dynamic>).toDomain())
          .toList();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get body measurements.');
    }
  }

  BodyMeasurement _parseBodyMeasurement(Map<String, dynamic> json) {
    final rawId = json['id'];
    final id = rawId is num ? rawId.toInt() : int.tryParse(rawId?.toString() ?? '') ?? 0;
    final rawDate = json['date'] ?? json['dateStr'];
    final date = DateTime.tryParse(rawDate?.toString() ?? '') ?? DateTime.now();

    double toDouble(dynamic value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    double? toNullableDouble(dynamic value) {
      if (value == null) return null;
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    return BodyMeasurement(
      id: id,
      date: date,
      weight: toDouble(json['weight']),
      bodyFat: toDouble(json['bodyFat']),
      chest: toNullableDouble(json['chest']),
      waist: toNullableDouble(json['waist']),
      hips: toNullableDouble(json['hips']),
      notes: json['notes'] as String?,
    );
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
  Future<domain.NutritionTargets> getNutritionTargets() async {
    try {
      final response = await dio.get(ApiConstants.nutritionTargetPath);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final targetData =
            data['target'] as Map<String, dynamic>? ?? data;
        return NutritionTargets.fromJson(targetData).toDomain();
      }
      return NutritionTargets.defaults.toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get nutrition targets.');
    }
  }

  @override
  Future<void> setNutritionTargets(domain.NutritionTargets targets) async {
    try {
      await dio.post(
        ApiConstants.nutritionTargetPath,
        data: targets.toData().toJson(),
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to set nutrition targets.');
    }
  }

  @override
  Future<domain.DailyHealthLog> getDailyHealth(DateTime date) async {
    try {
      final dateStr = date.toIso8601String().split('T').first;
      final response = await dio.get(
        ApiConstants.healthDailyPath,
        queryParameters: {'date': dateStr},
      );
      final envelope = response.data as Map<String, dynamic>;
      final dailyHealthData = envelope['dailyHealth'] as Map<String, dynamic>?;
      if (dailyHealthData == null) {
        return DailyHealthLog(
          id: envelope['id'] as int? ?? 0,
          date: date,
          steps: 0,
          waterIntake: 0,
          exerciseCalories: (envelope['exerciseCalories'] as num?)?.toInt() ?? 0,
          supplementLogs: (envelope['supplementLogs'] as List<dynamic>?)
                  ?.map((e) => SupplementLog.fromJson(e as Map<String, dynamic>))
                  .toList() ??
              [],
          foodLogs: (envelope['foodLogs'] as List<dynamic>?)
                  ?.map((e) => FoodLogEntry.fromJson(e as Map<String, dynamic>))
                  .toList() ??
              [],
          meta: envelope['meta'] != null
              ? DailyHealthMeta.fromJson(envelope['meta'] as Map<String, dynamic>)
              : null,
        ).toDomain();
      }
      dailyHealthData['date'] = dailyHealthData['date'] ?? dateStr;
      dailyHealthData['id'] = dailyHealthData['id'] ?? 0;
      if (envelope.containsKey('exerciseCalories')) {
        dailyHealthData['exerciseCalories'] = envelope['exerciseCalories'];
      }
      if (envelope.containsKey('supplementLogs')) {
        dailyHealthData['supplementLogs'] = envelope['supplementLogs'];
      }
      if (envelope.containsKey('foodLogs')) {
        dailyHealthData['foodLogs'] = envelope['foodLogs'];
      }
      if (envelope.containsKey('meta')) {
        dailyHealthData['meta'] = envelope['meta'];
      }
      return DailyHealthLog.fromJson(dailyHealthData).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get daily health.');
    }
  }

  @override
  Future<void> updateWater(DateTime date, double amount) async {
    try {
      await dio.post(
        ApiConstants.healthDailyPath,
        data: {
          'action': 'updateWater',
          'date': date.toIso8601String().split('T').first,
          'amount': amount,
        },
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to update water.');
    }
  }

  @override
  Future<void> toggleSupplementLog(String supplementId, DateTime date, bool taken) async {
    try {
      await dio.post(
        ApiConstants.healthDailyPath,
        data: {
          'action': 'toggleSupplement',
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
  Future<domain.NutritionAnalytics> getNutritionAnalytics(DateTime startDate, DateTime endDate) async {
    try {
      final response = await dio.get(
        ApiConstants.nutritionAnalyticsPath,
        queryParameters: {
          'startDate': startDate.toIso8601String().split('T').first,
          'endDate': endDate.toIso8601String().split('T').first,
        },
      );
      return NutritionAnalytics.fromJson(response.data as Map<String, dynamic>).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get nutrition analytics.');
    }
  }

  @override
  Future<domain.SupplementAnalytics> getSupplementAnalytics(DateTime startDate, DateTime endDate) async {
    try {
      final response = await dio.get(
        ApiConstants.supplementsAnalyticsPath,
        queryParameters: {
          'startDate': startDate.toIso8601String().split('T').first,
          'endDate': endDate.toIso8601String().split('T').first,
        },
      );
      final data = response.data as Map<String, dynamic>;

      final mostMissed = data['mostMissed'] as List<dynamic>? ?? [];
      final supplements = mostMissed.map((item) {
        final map = item as Map<String, dynamic>;
        return SupplementAdherence(
          name: map['name'] as String? ?? '',
          adherencePercent: (map['adherence'] as num?)?.toDouble() ?? 0,
          daysTaken: (map['taken'] as num?)?.toInt() ?? 0,
          totalDays: (map['scheduled'] as num?)?.toInt() ?? 0,
        );
      }).toList();

      return SupplementAnalytics(
        overallAdherence: (data['overallAdherence'] as num?)?.toDouble() ?? 0,
        avgDailyDoses: (data['avgDailyDoses'] as num?)?.toDouble() ?? 0,
        totalSupplements: (data['totalSupplements'] as num?)?.toInt() ?? 0,
        totalScheduled: (data['totalScheduled'] as num?)?.toInt() ?? 0,
        totalTaken: (data['totalTaken'] as num?)?.toInt() ?? 0,
        totalDays: (data['totalDays'] as num?)?.toInt() ?? 0,
        supplements: supplements,
      ).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get supplement analytics.');
    }
  }

  @override
  Future<domain.HealthHistory> getHealthHistory(String range) async {
    try {
      final response = await dio.get(
        ApiConstants.healthHistoryPath,
        queryParameters: {'range': range},
      );
      final data = response.data as Map<String, dynamic>;
      final historyList = data['history'] as List<dynamic>? ?? [];

      final stepsPoints = <HealthHistoryPoint>[];
      final weightPoints = <HealthHistoryPoint>[];

      for (final item in historyList) {
        final map = item as Map<String, dynamic>;
        final dateStr = map['date'] as String? ?? map['dateStr'] as String? ?? '';
        final date = DateTime.tryParse(dateStr) ?? DateTime.now();
        if (map['steps'] != null) {
          stepsPoints.add(HealthHistoryPoint(date: date, value: (map['steps'] as num).toDouble()));
        }
        if (map['weight'] != null) {
          weightPoints.add(HealthHistoryPoint(date: date, value: (map['weight'] as num).toDouble()));
        }
      }

      return HealthHistory(steps: stepsPoints, weight: weightPoints).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get health history.');
    }
  }

  @override
  Future<domain.AiMealSuggestion> getMealSuggestion({
    required double remainingCalories,
    required double remainingProtein,
    required double remainingCarbs,
    required double remainingFats,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.nutritionSuggestPath,
        data: {
          'remainingCalories': remainingCalories,
          'remainingProtein': remainingProtein,
          'remainingCarbs': remainingCarbs,
          'remainingFats': remainingFats,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final items = (data['items'] as List<dynamic>? ?? [])
          .map((item) => domain.AiMealItem(
                name: item['name'] as String? ?? '',
                calories: (item['calories'] as num?)?.toDouble() ?? 0,
                protein: (item['protein'] as num?)?.toDouble() ?? 0,
                carbs: (item['carbs'] as num?)?.toDouble() ?? 0,
                fats: (item['fats'] as num?)?.toDouble() ?? 0,
                servingSize: item['servingSize'] as String?,
              ))
          .toList();
      return domain.AiMealSuggestion(
        suggestionName: data['suggestionName'] as String? ?? '',
        reasoning: data['reasoning'] as String? ?? '',
        items: items,
        totalCalories: (data['totalCalories'] as num?)?.toDouble() ?? 0,
        totalProtein: (data['totalProtein'] as num?)?.toDouble() ?? 0,
        totalCarbs: (data['totalCarbs'] as num?)?.toDouble() ?? 0,
        totalFats: (data['totalFats'] as num?)?.toDouble() ?? 0,
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get meal suggestion.');
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

  @override
  Future<List<domain.FoodItem>> getFoodFavorites() async {
    try {
      final response = await dio.get(ApiConstants.nutritionFavoritesPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                FoodItem.fromJson(item as Map<String, dynamic>).toDomain())
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get food favorites.');
    }
  }

  @override
  Future<domain.FoodItem> addFoodFavorite(domain.FoodItem food) async {
    try {
      final response = await dio.post(
        ApiConstants.nutritionFavoritesPath,
        data: {
          'name': food.name,
          'brand': food.brand ?? '',
          'calories': food.calories,
          'protein': food.protein,
          'carbs': food.carbs,
          'fats': food.fat,
          'servingSize': '${food.servingSize.toInt()}g',
          'barcode': food.barcode,
        },
      );
      return FoodItem.fromJson(response.data as Map<String, dynamic>).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to add food favorite.');
    }
  }

  @override
  Future<void> removeFoodFavorite(String favoriteId) async {
    try {
      await dio.delete(
        ApiConstants.nutritionFavoritesPath,
        queryParameters: {'id': favoriteId},
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to remove food favorite.');
    }
  }

  @override
  Future<List<domain.SavedMeal>> getSavedMeals() async {
    try {
      final response = await dio.get(ApiConstants.nutritionMealsPath);
      final data = response.data;
      if (data is List) {
        return data
            .map((dynamic item) =>
                SavedMeal.fromJson(item as Map<String, dynamic>).toDomain())
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to get saved meals.');
    }
  }

  @override
  Future<domain.SavedMeal> saveMeal({
    required String name,
    required List<domain.FoodItem> items,
  }) async {
    try {
      double totalCal = 0;
      double totalProt = 0;
      double totalCarbs = 0;
      double totalFat = 0;
      
      final mappedItems = items.map((i) {
        totalCal += i.calories;
        totalProt += i.protein;
        totalCarbs += i.carbs;
        totalFat += i.fat;
        
        return {
          'name': i.name,
          'estimatedGrams': i.servingSize,
          'calories': i.calories,
          'protein': i.protein,
          'carbs': i.carbs,
          'fats': i.fat,
        };
      }).toList();

      final response = await dio.post(
        ApiConstants.nutritionMealsPath,
        data: {
          'name': name,
          'totalCalories': totalCal,
          'totalProtein': totalProt,
          'totalCarbs': totalCarbs,
          'totalFats': totalFat,
          'items': mappedItems,
        },
      );
      return SavedMeal.fromJson(response.data as Map<String, dynamic>).toDomain();
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to save meal.');
    }
  }

  @override
  Future<void> deleteSavedMeal(String mealId) async {
    try {
      await dio.delete(
        ApiConstants.nutritionMealsPath,
        queryParameters: {'id': mealId},
      );
    } on DioException catch (e) {
      throw _mapException(e, 'Failed to delete saved meal.');
    }
  }
}
