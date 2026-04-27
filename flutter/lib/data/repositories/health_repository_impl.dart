import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/domain/repositories/health_repository.dart';

class HealthRepositoryImpl implements HealthRepository {
  HealthRepositoryImpl({required this.database});

  final AppDatabase database;

  @override
  Future<NutritionLog> getNutritionLog(DateTime date) async {
    return database.getNutritionLogByDate(date);
  }

  @override
  Future<void> saveNutritionLog(NutritionLog log) async {
    await database.updateNutritionLog(log);
  }

  @override
  Future<List<FoodItem>> getFoodItems() async {
    return database.getAllFoodItems();
  }

  @override
  Future<List<FoodItem>> searchFoodItems(String query) async {
    return database.searchFoodItems(query);
  }

  @override
  Future<void> saveFoodItem(FoodItem item) async {
    await database.insertFoodItem(item);
  }

  @override
  Future<List<Supplement>> getSupplements() async {
    return database.getAllSupplements();
  }

  @override
  Future<void> saveSupplement(Supplement supplement) async {
    await database.insertSupplement(supplement);
  }

  @override
  Future<void> toggleSupplement(String id) async {
    final supplements = await database.getAllSupplements();
    final supplement = supplements.firstWhere((s) => s.id == id);
    await database.updateSupplement(
      supplement.copyWith(isActive: !supplement.isActive),
    );
  }

  @override
  Future<List<BodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return database.getBodyMeasurements(
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  Future<void> saveBodyMeasurement(BodyMeasurement measurement) async {
    await database.insertBodyMeasurement(measurement);
  }

  @override
  Future<FastingSession> startFasting() async {
    final now = DateTime.now();
    final session = FastingSession(
      id: 0,
      startTime: now,
      duration: 0,
      isActive: true,
    );
    final id = await database.insertFastingSession(session);
    return session.copyWith(id: id);
  }

  @override
  Future<FastingSession> stopFasting() async {
    final active = await database.getActiveFastingSession();
    if (active == null) {
      throw Exception('No active fasting session');
    }
    final now = DateTime.now();
    final duration = now.difference(active.startTime).inMinutes;
    final stopped = active.copyWith(
      endTime: now,
      duration: duration,
      isActive: false,
    );
    await database.updateFastingSession(stopped);
    return stopped;
  }

  @override
  Future<FastingSession?> getActiveFasting() async {
    return database.getActiveFastingSession();
  }

  @override
  Future<List<FastingSession>> getFastingHistory() async {
    return database.getFastingHistory();
  }
}
