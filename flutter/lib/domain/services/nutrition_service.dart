import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/domain/repositories/health_api_repository.dart';
import 'package:runflow_flutter/domain/repositories/health_repository.dart';
import 'package:runflow_flutter/core/extensions/extensions.dart';
import 'package:runflow_flutter/data/services/health_sync_service.dart';
import 'package:runflow_flutter/data/models/health_models.dart' as data_models;
import 'package:runflow_flutter/data/mappers/health_mappers.dart';

class NutritionService {
  NutritionService({
    required this.apiRepo,
    required this.localRepo,
    required this.syncService,
  });

  final HealthApiRepository apiRepo;
  final HealthRepository localRepo;
  final HealthSyncService syncService;

  Future<void> updateDailyHealthCache(
    DateTime date,
    FutureOr<DailyHealthLog> Function(DailyHealthLog) updater,
  ) async {
    final dateStr = date.toIsoDateString;
    final cacheKey = 'daily_health_log_$dateStr';
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(cacheKey);
      DailyHealthLog current;
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final Map<String, dynamic> jsonMap = jsonDecode(cachedStr) as Map<String, dynamic>;
        final dataLog = data_models.DailyHealthLog.fromJson(jsonMap);
        current = dataLog.toDomain();
      } else {
        current = DailyHealthLog(id: 0, date: date, supplementLogs: [], foodLogs: []);
      }
      final updated = await updater(current);
      final jsonStr = jsonEncode(updated.toData().toJson());
      await prefs.setString(cacheKey, jsonStr);
    } catch (e) {
      logger.debug('NutritionService: Failed to update daily health cache: $e');
    }
  }

  Future<List<FoodLogEntry>> getLocalCachedFoodLogs(DateTime date) async {
    final dateStr = date.toIsoDateString;
    final cacheKey = 'daily_health_log_$dateStr';
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(cacheKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final Map<String, dynamic> jsonMap = jsonDecode(cachedStr) as Map<String, dynamic>;
        final dataLog = data_models.DailyHealthLog.fromJson(jsonMap);
        return dataLog.toDomain().foodLogs;
      }
    } catch (e, stack) {
      logger.debug('Exception: $e\n$stack');
    }
    return [];
  }

  String getDefaultMealType() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 22) return 'dinner';
    return 'snack';
  }

  Future<FoodLogEntry?> logFood(DateTime date, FoodItem food, {String? mealType}) async {
    final actualMealType = mealType ?? getDefaultMealType();
    final newEntry = FoodLogEntry(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      mealType: actualMealType,
      name: food.name,
      quantity: 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    );

    await updateDailyHealthCache(date, (log) {
      return log.copyWith(foodLogs: [...log.foodLogs, newEntry]);
    });

    try {
      final loggedEntry = await apiRepo.logFoodEntry(
        date: date,
        mealType: actualMealType,
        quantity: 1,
        foodItem: food,
      );

      await updateDailyHealthCache(date, (log) {
        final filtered = log.foodLogs.where((e) => e.id != newEntry.id).toList();
        return log.copyWith(foodLogs: [...filtered, loggedEntry]);
      });

      await syncService.syncNutritionToHealthConnect(date);
      return loggedEntry;
    } catch (e) {
      logger.error('[NutritionService] Log food entry failed: $e');
      return null;
    }
  }

  Future<List<FoodLogEntry>> logSavedMeal(DateTime date, SavedMeal meal, {String? mealType}) async {
    final actualMealType = mealType ?? getDefaultMealType();
    final List<FoodLogEntry> localEntries = [];
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    for (int i = 0; i < meal.items.length; i++) {
      final item = meal.items[i];
      localEntries.add(FoodLogEntry(
        id: 'local_${nowMs}_$i',
        mealType: actualMealType,
        name: item.name,
        quantity: 1,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      ));
    }

    await updateDailyHealthCache(date, (log) {
      return log.copyWith(foodLogs: [...log.foodLogs, ...localEntries]);
    });

    try {
      final List<FoodLogEntry> serverEntries = [];
      for (final item in meal.items) {
        final food = FoodItem(
          id: 0,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          servingSize: item.estimatedGrams,
        );
        final logged = await apiRepo.logFoodEntry(
          date: date,
          mealType: actualMealType,
          quantity: 1,
          foodItem: food,
        );
        serverEntries.add(logged);
      }

      await updateDailyHealthCache(date, (log) {
        final localIds = localEntries.map((e) => e.id).toSet();
        final filtered = log.foodLogs.where((e) => !localIds.contains(e.id)).toList();
        return log.copyWith(foodLogs: [...filtered, ...serverEntries]);
      });

      await syncService.syncNutritionToHealthConnect(date);
      return serverEntries;
    } catch (e) {
      logger.error('[NutritionService] Log saved meal failed: $e');
      return [];
    }
  }

  Future<void> updateFoodLog(DateTime date, FoodLogEntry entry, double quantity, {String? mealType}) async {
    if (entry.id.isEmpty) return;

    await updateDailyHealthCache(date, (log) {
      final updatedLogs = log.foodLogs.map((e) {
        if (e.id == entry.id) {
          final factor = quantity / (e.quantity ?? 1.0);
          return e.copyWith(
            quantity: quantity,
            mealType: mealType ?? e.mealType,
            calories: e.calories != null ? e.calories! * factor : null,
            protein: e.protein != null ? e.protein! * factor : null,
            carbs: e.carbs != null ? e.carbs! * factor : null,
            fat: e.fat != null ? e.fat! * factor : null,
          );
        }
        return e;
      }).toList();
      return log.copyWith(foodLogs: updatedLogs);
    });

    try {
      await apiRepo.updateFoodLogEntry(
        logId: entry.id,
        mealType: mealType ?? entry.mealType,
        quantity: quantity,
      );
      await syncService.syncNutritionToHealthConnect(date);
    } catch (e) {
      logger.error('[NutritionService] Update food log failed: $e');
    }
  }

  Future<void> deleteFoodLog(DateTime date, FoodLogEntry entry) async {
    if (entry.id.isEmpty) return;

    await updateDailyHealthCache(date, (log) {
      final filtered = log.foodLogs.where((e) => e.id != entry.id).toList();
      return log.copyWith(foodLogs: filtered);
    });

    try {
      await apiRepo.deleteFoodLogEntry(entry.id);
      await syncService.deleteNutritionFromHealthConnect(entry.id);
    } catch (e) {
      logger.error('[NutritionService] Delete food log failed: $e');
    }
  }
}
