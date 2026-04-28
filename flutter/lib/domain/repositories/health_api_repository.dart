import 'package:runflow_flutter/data/models/health_models.dart';

abstract class HealthApiRepository {
  Future<void> syncNutritionLog(NutritionLog log);
  Future<List<FoodItem>> searchFood(String query);
  Future<FoodItem?> scanBarcode(String code);
  Future<FoodItem?> aiScanImage(String imagePath);
  Future<List<Supplement>> getSupplements();
  Future<void> saveSupplementRemote(Supplement supplement);
  Future<void> syncFasting(FastingSession session);
  Future<void> syncBodyMeasurement(BodyMeasurement measurement);
  Future<List<BodyMeasurement>> getBodyMeasurements();
  Future<void> batchSync(Map<String, dynamic> allData);
  Future<Map<String, dynamic>> getInsights();
  Future<NutritionTargets> getNutritionTargets();
  Future<void> setNutritionTargets(NutritionTargets targets);
  Future<DailyHealthLog> getDailyHealth(DateTime date);
  Future<void> updateWater(DateTime date, double amount);
  Future<void> toggleSupplementLog(String supplementId, DateTime date, bool taken);
  Future<NutritionAnalytics> getNutritionAnalytics(DateTime startDate, DateTime endDate);
  Future<SupplementAnalytics> getSupplementAnalytics();
  Future<HealthHistory> getHealthHistory(String range);
}
