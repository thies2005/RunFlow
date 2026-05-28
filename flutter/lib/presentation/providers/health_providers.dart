import 'dart:convert';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/data/repositories/health_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/health_repository.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/data/models/health_models.dart' as data_models;
import 'package:runflow_flutter/data/mappers/health_mappers.dart';

part 'health_providers.g.dart';

@Riverpod(keepAlive: true)
AppDatabase appDatabase(Ref ref) {
  return AppDatabase.instance;
}

@Riverpod(keepAlive: true)
HealthRepository healthRepository(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return HealthRepositoryImpl(database: db);
}

@riverpod
Future<FastingSession?> activeFasting(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getActiveFasting();
}

@riverpod
Future<List<FastingSession>> fastingHistory(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getFastingHistory();
}

@Riverpod(keepAlive: true)
Future<List<BodyMeasurement>> bodyMeasurements(Ref ref) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    return await apiRepo.getBodyMeasurements();
  } catch (e) {
    debugPrint(
      'HealthProviders: API body measurements failed, falling back to local: $e',
    );
    final repo = ref.read(healthRepositoryProvider);
    return repo.getBodyMeasurements();
  }
}

Future<void> _updateDailyHealthCache(DateTime date, FutureOr<DailyHealthLog> Function(DailyHealthLog) updater) async {
  final dateStr = date.toIso8601String().split('T').first;
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
    debugPrint('HealthProviders: Failed to update daily health cache: $e');
  }
}

@Riverpod(keepAlive: true)
Future<DailyHealthLog> dailyHealth(Ref ref, DateTime date) async {
  final dateStr = date.toIso8601String().split('T').first;
  final cacheKey = 'daily_health_log_$dateStr';

  Future<List<FoodLogEntry>> getLocalCachedFoodLogs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(cacheKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final Map<String, dynamic> jsonMap = jsonDecode(cachedStr) as Map<String, dynamic>;
        final dataLog = data_models.DailyHealthLog.fromJson(jsonMap);
        return dataLog.toDomain().foodLogs;
      }
    } catch (_) {}
    return [];
  }

  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    var log = await apiRepo.getDailyHealth(date);

    final localFoodLogs = await getLocalCachedFoodLogs();
    if (localFoodLogs.isNotEmpty) {
      final existingIds = log.foodLogs.map((e) => e.id).toSet();
      final uniqueLocalLogs = localFoodLogs.where((e) => !existingIds.contains(e.id)).toList();
      if (uniqueLocalLogs.isNotEmpty) {
        log = log.copyWith(foodLogs: [...log.foodLogs, ...uniqueLocalLogs]);
      }
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(log.toData().toJson());
      await prefs.setString(cacheKey, jsonStr);
    } catch (cacheErr) {
      debugPrint('HealthProviders: Failed to cache daily health log: $cacheErr');
    }
    return log;
  } catch (e) {
    debugPrint(
      'HealthProviders: API daily health failed, attempting cache fallback: $e',
    );
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(cacheKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final Map<String, dynamic> jsonMap = jsonDecode(cachedStr) as Map<String, dynamic>;
        final dataLog = data_models.DailyHealthLog.fromJson(jsonMap);
        return dataLog.toDomain();
      }
    } catch (cacheErr) {
      debugPrint('HealthProviders: Failed to load daily health log from cache: $cacheErr');
    }
    return DailyHealthLog(id: 0, date: date, supplementLogs: [], foodLogs: []);
  }
}

@riverpod
class TakenSupplementIds extends _$TakenSupplementIds {
  @override
  Future<Set<String>> build() async {
    final today = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
    );
    try {
      final daily = await ref.read(dailyHealthProvider(today).future);
      return daily.supplementLogs
          .where((log) => log.taken)
          .map((log) => log.supplementId)
          .toSet();
    } catch (e) {
      debugPrint('HealthProviders: Failed to load taken supplement IDs: $e');
      return {};
    }
  }

  void optimisticAdd(String supplementId) {
    final current = state.value ?? {};
    state = AsyncValue.data({...current, supplementId});
  }

  void optimisticRemove(String supplementId) {
    final current = state.value ?? {};
    state = AsyncValue.data({...current}..remove(supplementId));
  }

  void optimisticAddAll(Iterable<String> supplementIds) {
    final current = state.value ?? {};
    state = AsyncValue.data({...current, ...supplementIds});
  }
}

@riverpod
class Fasting extends _$Fasting {
  @override
  Future<FastingSession?> build() async {
    final repo = ref.read(healthRepositoryProvider);
    return repo.getActiveFasting();
  }

  Future<void> start() async {
    final repo = ref.read(healthRepositoryProvider);
    final session = await repo.startFasting();
    state = AsyncValue.data(session);
    ref.invalidate(fastingHistoryProvider);
  }

  Future<void> stop() async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.stopFasting();
    state = const AsyncValue.data(null);
    ref.invalidate(fastingHistoryProvider);
  }
}

@Riverpod(keepAlive: true)
class FastingScheduleNotifier extends _$FastingScheduleNotifier {
  static const _key = 'fasting_schedule';

  @override
  FastingSchedule build() {
    _load();
    return const FastingSchedule();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_key);
    if (json != null) {
      try {
        state = FastingSchedule.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
      } catch (e) {
        debugPrint(
          'FastingScheduleNotifier: Failed to parse saved schedule: $e',
        );
      }
    }
  }

  Future<void> save(FastingSchedule schedule) async {
    state = schedule;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(schedule.toJson()));
    await prefs.setDouble('fasting_target_hours', schedule.targetHours);
  }
}

@Riverpod(keepAlive: true)
class SupplementList extends _$SupplementList {
  @override
  Future<List<Supplement>> build() async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      return await apiRepo.getSupplements();
    } catch (e) {
      debugPrint(
        'HealthProviders: API supplements failed, falling back to local: $e',
      );
      final repo = ref.read(healthRepositoryProvider);
      return repo.getSupplements();
    }
  }

  Future<void> toggle(String supplementId) async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final today = DateTime(
        DateTime.now().year,
        DateTime.now().month,
        DateTime.now().day,
      );
      final supplement = state.value
          ?.where((s) => s.uniqueId == supplementId)
          .firstOrNull;
      final resolvedId = supplement?.serverId ?? supplementId;
      final daily = await ref.read(dailyHealthProvider(today).future);
      final existingLog = daily.supplementLogs
          .where((log) => log.supplementId == resolvedId)
          .firstOrNull;
      final currentlyTaken = existingLog?.taken ?? false;

      final takenNotifier = ref.read(takenSupplementIdsProvider.notifier);
      if (currentlyTaken) {
        takenNotifier.optimisticRemove(resolvedId);
      } else {
        takenNotifier.optimisticAdd(resolvedId);
      }

      await apiRepo.toggleSupplementLog(resolvedId, today, !currentlyTaken);
      ref.invalidate(dailyHealthProvider(today));
      ref.invalidate(takenSupplementIdsProvider);
      ref.invalidate(supplementAnalyticsProvider);
    } catch (e) {
      logger.error('[SupplementList] Toggle supplement failed: $e');
      ref.invalidate(takenSupplementIdsProvider);
    }
  }

  Future<void> add(Supplement supplement) async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      await apiRepo.saveSupplementRemote(supplement);
    } catch (e) {
      debugPrint(
        'HealthProviders: API save supplement failed, falling back to local: $e',
      );
      final repo = ref.read(healthRepositoryProvider);
      await repo.saveSupplement(supplement);
    }
    ref.invalidateSelf();
  }

  Future<void> takeAll(List<String> supplementIds) async {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    final today = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
    );

    Set<String> alreadyTaken = {};
    try {
      final daily = await ref.read(dailyHealthProvider(today).future);
      alreadyTaken = daily.supplementLogs
          .where((log) => log.taken)
          .map((log) => log.supplementId)
          .toSet();
    } catch (e) {
      debugPrint(
        'HealthProviders: Failed to load already-taken supplements: $e',
      );
    }

    final optimisticIds = <String>[];
    for (final sid in supplementIds) {
      final supplement = state.value
          ?.where((s) => s.uniqueId == sid)
          .firstOrNull;
      if (supplement == null) continue;
      final resolvedId = supplement.serverId ?? sid;
      optimisticIds.add(resolvedId);
    }
    ref
        .read(takenSupplementIdsProvider.notifier)
        .optimisticAddAll(optimisticIds);

    for (final sid in supplementIds) {
      try {
        final supplement = state.value
            ?.where((s) => s.uniqueId == sid)
            .firstOrNull;
        if (supplement == null) continue;
        final resolvedId = supplement.serverId ?? sid;
        if (alreadyTaken.contains(resolvedId)) continue;
        await apiRepo.toggleSupplementLog(resolvedId, today, true);
        alreadyTaken.add(resolvedId);
      } catch (e) {
        logger.error('[SupplementList] Take all toggle failed for id $sid: $e');
      }
    }

    ref.invalidate(dailyHealthProvider(today));
    ref.invalidate(takenSupplementIdsProvider);
    ref.invalidate(supplementAnalyticsProvider);
  }
}

@riverpod
class NutritionNotifier extends _$NutritionNotifier {
  @override
  Future<NutritionLog> build(DateTime date) async {
    try {
      final daily = await ref.read(dailyHealthProvider(date).future);
      if (daily.id == 0 && daily.foodLogs.isEmpty) {
        try {
          final repo = ref.read(healthRepositoryProvider);
          final localLog = await repo.getNutritionLog(date);
          if (localLog.calories > 0 || localLog.water > 0) {
            return localLog;
          }
        } catch (_) {}
      }
      double totalCalories = 0;
      double totalProtein = 0;
      double totalCarbs = 0;
      double totalFat = 0;
      for (final entry in daily.foodLogs) {
        totalCalories += entry.calories ?? 0;
        totalProtein += entry.protein ?? 0;
        totalCarbs += entry.carbs ?? 0;
        totalFat += entry.fats ?? 0;
      }
      return NutritionLog(
        id: daily.id,
        date: date,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        water: daily.waterIntake,
        createdAt: DateTime.now(),
      );
    } catch (e) {
      debugPrint(
        'HealthProviders: API nutrition log failed, falling back to local: $e',
      );
      final repo = ref.read(healthRepositoryProvider);
      return repo.getNutritionLog(date);
    }
  }

  Future<void> save(NutritionLog log) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.saveNutritionLog(log);
    ref.invalidateSelf();
  }

  Future<void> logFood(FoodItem food, {String mealType = 'snack'}) async {
    final newEntry = FoodLogEntry(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      mealType: mealType,
      name: food.name,
      quantity: 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fat,
    );
    
    await _updateDailyHealthCache(date, (log) {
      return log.copyWith(foodLogs: [...log.foodLogs, newEntry]);
    });

    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final loggedEntry = await apiRepo.logFoodEntry(
        date: date,
        mealType: mealType,
        quantity: 1,
        foodItem: food,
      );
      
      await _updateDailyHealthCache(date, (log) {
        final filtered = log.foodLogs.where((e) => e.id != newEntry.id).toList();
        return log.copyWith(foodLogs: [...filtered, loggedEntry]);
      });

      await ref
          .read(healthSyncServiceProvider)
          .syncNutritionToHealthConnect(date);
    } catch (e) {
      logger.error('[NutritionNotifier] Log food entry failed: $e');
    }
    final current = state.value;
    if (current != null) {
      final updated = current.copyWith(
        calories: current.calories + food.calories,
        protein: current.protein + food.protein,
        carbs: current.carbs + food.carbs,
        fat: current.fat + food.fat,
      );
      final repo = ref.read(healthRepositoryProvider);
      await repo.saveNutritionLog(updated);
    }
    ref.invalidateSelf();
    ref.invalidate(dailyHealthProvider(date));
  }

  Future<void> logSavedMeal(SavedMeal meal, {String mealType = 'snack'}) async {
    final List<FoodLogEntry> localEntries = [];
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    for (int i = 0; i < meal.items.length; i++) {
      final item = meal.items[i];
      localEntries.add(FoodLogEntry(
        id: 'local_${nowMs}_$i',
        mealType: mealType,
        name: item.name,
        quantity: 1,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
      ));
    }

    await _updateDailyHealthCache(date, (log) {
      return log.copyWith(foodLogs: [...log.foodLogs, ...localEntries]);
    });

    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final List<FoodLogEntry> serverEntries = [];
      for (final item in meal.items) {
        final food = FoodItem(
          id: 0,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fats,
          servingSize: item.estimatedGrams,
        );
        final logged = await apiRepo.logFoodEntry(
          date: date,
          mealType: mealType,
          quantity: 1,
          foodItem: food,
        );
        serverEntries.add(logged);
      }
      
      await _updateDailyHealthCache(date, (log) {
        final localIds = localEntries.map((e) => e.id).toSet();
        final filtered = log.foodLogs.where((e) => !localIds.contains(e.id)).toList();
        return log.copyWith(foodLogs: [...filtered, ...serverEntries]);
      });

      await ref
          .read(healthSyncServiceProvider)
          .syncNutritionToHealthConnect(date);
    } catch (e) {
      logger.error('[NutritionNotifier] Log saved meal failed: $e');
    }
    final current = state.value;
    if (current != null) {
      final updated = current.copyWith(
        calories: current.calories + meal.totalCalories,
        protein: current.protein + meal.totalProtein,
        carbs: current.carbs + meal.totalCarbs,
        fat: current.fat + meal.totalFats,
      );
      final repo = ref.read(healthRepositoryProvider);
      await repo.saveNutritionLog(updated);
    }
    ref.invalidateSelf();
    ref.invalidate(dailyHealthProvider(date));
  }

  Future<void> updateFoodLog(
    FoodLogEntry entry,
    double quantity, {
    String? mealType,
  }) async {
    if (entry.id.isEmpty) return;
    
    await _updateDailyHealthCache(date, (log) {
      final updatedLogs = log.foodLogs.map((e) {
        if (e.id == entry.id) {
          final factor = quantity / (e.quantity ?? 1.0);
          return e.copyWith(
            quantity: quantity,
            mealType: mealType ?? e.mealType,
            calories: e.calories != null ? e.calories! * factor : null,
            protein: e.protein != null ? e.protein! * factor : null,
            carbs: e.carbs != null ? e.carbs! * factor : null,
            fats: e.fats != null ? e.fats! * factor : null,
          );
        }
        return e;
      }).toList();
      return log.copyWith(foodLogs: updatedLogs);
    });

    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      await apiRepo.updateFoodLogEntry(
        logId: entry.id,
        mealType: mealType ?? entry.mealType,
        quantity: quantity,
      );
      await ref
          .read(healthSyncServiceProvider)
          .syncNutritionToHealthConnect(date);
    } catch (e) {
      logger.error('[NutritionNotifier] Update food log failed: $e');
    }
    ref.invalidateSelf();
    ref.invalidate(dailyHealthProvider(date));
  }

  Future<void> deleteFoodLog(FoodLogEntry entry) async {
    if (entry.id.isEmpty) return;
    
    await _updateDailyHealthCache(date, (log) {
      final filtered = log.foodLogs.where((e) => e.id != entry.id).toList();
      return log.copyWith(foodLogs: filtered);
    });

    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      await apiRepo.deleteFoodLogEntry(entry.id);
      await ref
          .read(healthSyncServiceProvider)
          .deleteNutritionFromHealthConnect(entry.id);
    } catch (e) {
      logger.error('[NutritionNotifier] Delete food log failed: $e');
    }
    ref.invalidateSelf();
    ref.invalidate(dailyHealthProvider(date));
  }
}

@riverpod
class BarcodeScan extends _$BarcodeScan {
  @override
  FutureOr<FoodItem?> build() => null;

  Future<void> scan(String barcode) async {
    state = const AsyncValue.loading();
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final item = await apiRepo.scanBarcode(barcode);
      if (item != null) {
        state = AsyncValue.data(item);
        return;
      }
    } catch (e) {
      logger.error('[BarcodeScan] API barcode scan failed: $e');
    }
    try {
      final repo = ref.read(healthRepositoryProvider);
      final items = await repo.getFoodItems();
      final item = items.cast<FoodItem?>().firstWhere(
        (i) => i?.barcode == barcode,
        orElse: () => null,
      );
      state = AsyncValue.data(item);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

@riverpod
Future<NutritionAnalytics> nutritionAnalytics(Ref ref) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    final now = DateTime.now();
    final startDate = now.subtract(const Duration(days: 7));
    return apiRepo.getNutritionAnalytics(startDate, now);
  } catch (e) {
    debugPrint('HealthProviders: API nutrition analytics failed: $e');
    return const NutritionAnalytics();
  }
}

@riverpod
Future<SupplementAnalytics> supplementAnalytics(Ref ref) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    final now = DateTime.now();
    final startDate = now.subtract(const Duration(days: 7));
    return apiRepo.getSupplementAnalytics(startDate, now);
  } catch (e) {
    debugPrint('HealthProviders: API supplement analytics failed: $e');
    return const SupplementAnalytics();
  }
}

@riverpod
Future<HealthHistory> healthHistory(Ref ref, String range) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    return apiRepo.getHealthHistory(range);
  } catch (e) {
    debugPrint('HealthProviders: API health history failed: $e');
    return const HealthHistory();
  }
}

@riverpod
class FoodSearch extends _$FoodSearch {
  @override
  FutureOr<List<FoodItem>> build(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      return apiRepo.searchFood(query);
    } catch (e) {
      debugPrint(
        'HealthProviders: API food search failed, falling back to local: $e',
      );
      try {
        final repo = ref.read(healthRepositoryProvider);
        return repo.searchFoodItems(query);
      } catch (e2) {
        debugPrint('HealthProviders: Local food search also failed: $e2');
        return [];
      }
    }
  }

  Future<void> search(String q) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      if (q.trim().isEmpty) return <FoodItem>[];
      try {
        final apiRepo = ref.read(healthApiRepositoryProvider);
        return apiRepo.searchFood(q);
      } catch (e) {
        debugPrint(
          'HealthProviders: API food search failed, falling back to local: $e',
        );
        final repo = ref.read(healthRepositoryProvider);
        return repo.searchFoodItems(q);
      }
    });
  }
}

@riverpod
class AiScan extends _$AiScan {
  @override
  AsyncValue<FoodItem?> build() {
    return const AsyncValue.data(null);
  }

  Future<void> scanImage(String imagePath, {String? context}) async {
    state = const AsyncValue.loading();
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final item = await apiRepo.aiScanImage(imagePath, context: context);
      state = AsyncValue.data(item);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

@Riverpod(keepAlive: true)
class StackRenameMap extends _$StackRenameMap {
  static const _key = 'stack_rename_map';
  bool _loaded = false;

  @override
  Map<String, String> build() {
    _loadFromPrefs();
    return {};
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final entries = prefs.getStringList(_key) ?? [];
    final map = <String, String>{};
    for (final entry in entries) {
      final parts = entry.split('||');
      if (parts.length == 2) {
        map[parts[0]] = parts[1];
      }
    }
    state = map;
    _loaded = true;
  }

  Future<void> rename(String stackId, String newName) async {
    if (!_loaded) await _loadFromPrefs();
    final prefs = await SharedPreferences.getInstance();
    final updated = Map<String, String>.from(state);
    if (newName.isEmpty || newName == stackId) {
      updated.remove(stackId);
    } else {
      updated[stackId] = newName;
    }
    state = updated;
    await prefs.setStringList(
      _key,
      updated.entries.map((e) => '${e.key}||${e.value}').toList(),
    );
  }

  String displayName(String stackId) {
    return state[stackId] ?? stackId;
  }
}

@riverpod
class FoodFavorites extends _$FoodFavorites {
  @override
  FutureOr<List<FoodItem>> build() async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      return apiRepo.getFoodFavorites();
    } catch (e) {
      debugPrint('HealthProviders: Failed to load food favorites: $e');
      return [];
    }
  }

  Future<void> toggleFavorite(FoodItem food) async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      if (food.favoriteId != null) {
        await apiRepo.removeFoodFavorite(food.favoriteId!);
        final current = state.asData?.value ?? [];
        state = AsyncValue.data(
          current.where((f) => f.favoriteId != food.favoriteId).toList(),
        );
      } else {
        final favorited = await apiRepo.addFoodFavorite(food);
        final current = state.asData?.value ?? [];
        state = AsyncValue.data([favorited, ...current]);
      }
    } catch (e) {
      debugPrint('HealthProviders: Failed to toggle favorite: $e');
    }
  }

  bool isFavorite(String name, {String? brand}) {
    final favorites = state.asData?.value ?? [];
    final normalizedName = name.toLowerCase();
    final normalizedBrand = (brand ?? '').toLowerCase();
    return favorites.any(
      (f) =>
          f.name.toLowerCase() == normalizedName &&
          (f.brand ?? '').toLowerCase() == normalizedBrand,
    );
  }

  String? favoriteIdFor(String name, {String? brand}) {
    final favorites = state.asData?.value ?? [];
    final normalizedName = name.toLowerCase();
    final normalizedBrand = (brand ?? '').toLowerCase();
    try {
      return favorites
          .firstWhere(
            (f) =>
                f.name.toLowerCase() == normalizedName &&
                (f.brand ?? '').toLowerCase() == normalizedBrand,
          )
          .favoriteId;
    } catch (_) {
      return null;
    }
  }
}

@riverpod
class SavedMeals extends _$SavedMeals {
  @override
  FutureOr<List<SavedMeal>> build() async {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    return apiRepo.getSavedMeals();
  }

  Future<void> save(String name, List<FoodItem> items) async {
    if (items.isEmpty) return;
    final apiRepo = ref.read(healthApiRepositoryProvider);
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await apiRepo.saveMeal(name: name, items: items);
      return apiRepo.getSavedMeals();
    });
  }

  Future<void> edit(String mealId, String name, List<FoodItem> items) async {
    if (items.isEmpty) return;
    final apiRepo = ref.read(healthApiRepositoryProvider);
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await apiRepo.updateSavedMeal(mealId: mealId, name: name, items: items);
      return apiRepo.getSavedMeals();
    });
  }

  Future<void> delete(String mealId) async {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    final current = state.asData?.value ?? [];
    state = AsyncValue.data(current.where((m) => m.id != mealId).toList());
    try {
      await apiRepo.deleteSavedMeal(mealId);
    } catch (e) {
      debugPrint('HealthProviders: Failed to delete saved meal: $e');
      ref.invalidateSelf();
    }
  }
}
