import 'package:runflow_flutter/data/models/health_models.dart';

abstract class HealthApiRepository {
  Future<void> syncNutritionLog(NutritionLog log);
  Future<List<FoodItem>> searchFood(String query);
  Future<FoodItem?> scanBarcode(String code);
  Future<List<Supplement>> getSupplements();
  Future<void> saveSupplementRemote(Supplement supplement);
  Future<void> syncFasting(FastingSession session);
  Future<void> syncBodyMeasurement(BodyMeasurement measurement);
  Future<void> batchSync(Map<String, dynamic> allData);
  Future<Map<String, dynamic>> getInsights();
  Future<NutritionTargets> getNutritionTargets();
  Future<void> setNutritionTargets(NutritionTargets targets);
}
