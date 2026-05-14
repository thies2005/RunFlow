import 'package:runflow_flutter/domain/entities/health_entities.dart';

abstract class HealthRepository {
  Future<NutritionLog> getNutritionLog(DateTime date);
  Future<void> saveNutritionLog(NutritionLog log);
  Future<List<FoodItem>> getFoodItems();
  Future<List<FoodItem>> searchFoodItems(String query);
  Future<void> saveFoodItem(FoodItem item);
  Future<List<Supplement>> getSupplements();
  Future<void> saveSupplement(Supplement supplement);
  Future<void> toggleSupplement(int id);
  Future<List<BodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<void> saveBodyMeasurement(BodyMeasurement measurement);
  Future<FastingSession> startFasting();
  Future<FastingSession> stopFasting();
  Future<FastingSession?> getActiveFasting();
  Future<List<FastingSession>> getFastingHistory();
  Future<void> updateFastingSession(FastingSession session);
  Future<void> deleteFastingSession(int id);
}
