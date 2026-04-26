import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/data/repositories/health_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/health_repository.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';

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
Future<List<Supplement>> supplements(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getSupplements();
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

@riverpod
Future<List<BodyMeasurement>> bodyMeasurements(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getBodyMeasurements();
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

@riverpod
class SupplementList extends _$SupplementList {
  @override
  Future<List<Supplement>> build() async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      return await apiRepo.getSupplements();
    } catch (_) {
      final repo = ref.read(healthRepositoryProvider);
      return repo.getSupplements();
    }
  }

  Future<void> toggle(int id) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.toggleSupplement(id);
    ref.invalidateSelf();
  }

  Future<void> add(Supplement supplement) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.saveSupplement(supplement);
    ref.invalidateSelf();
  }
}

@riverpod
class NutritionNotifier extends _$NutritionNotifier {
  @override
  Future<NutritionLog> build(DateTime date) async {
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final daily = await apiRepo.getDailyHealth(date);
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
    } catch (_) {
      final repo = ref.read(healthRepositoryProvider);
      return repo.getNutritionLog(date);
    }
  }

  Future<void> save(NutritionLog log) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.saveNutritionLog(log);
    ref.invalidateSelf();
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
    } catch (_) {}
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
  } catch (_) {
    return const NutritionAnalytics();
  }
}

@riverpod
Future<SupplementAnalytics> supplementAnalytics(Ref ref) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    return apiRepo.getSupplementAnalytics();
  } catch (_) {
    return const SupplementAnalytics();
  }
}

@riverpod
Future<HealthHistory> healthHistory(Ref ref, String range) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    return apiRepo.getHealthHistory(range);
  } catch (_) {
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
    } catch (_) {
      final repo = ref.read(healthRepositoryProvider);
      return repo.searchFoodItems(query);
    }
  }

  Future<void> search(String q) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      if (q.trim().isEmpty) return <FoodItem>[];
      try {
        final apiRepo = ref.read(healthApiRepositoryProvider);
        return apiRepo.searchFood(q);
      } catch (_) {
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

  Future<void> scanImage(String imagePath) async {
    state = const AsyncValue.loading();
    try {
      final apiRepo = ref.read(healthApiRepositoryProvider);
      final item = await apiRepo.aiScanImage(imagePath);
      state = AsyncValue.data(item);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}
