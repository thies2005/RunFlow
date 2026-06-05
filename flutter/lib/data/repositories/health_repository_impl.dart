import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/dao/nutrition_dao.dart';
import 'package:runflow_flutter/data/datasources/local/dao/supplement_dao.dart';
import 'package:runflow_flutter/data/datasources/local/dao/body_measurement_dao.dart';
import 'package:runflow_flutter/data/datasources/local/dao/fasting_dao.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/health_repository.dart';

class HealthRepositoryImpl implements HealthRepository {
  HealthRepositoryImpl({required this.database})
      : nutritionDao = NutritionDao(database: database),
        supplementDao = SupplementDao(database: database),
        bodyMeasurementDao = BodyMeasurementDao(database: database),
        fastingDao = FastingDao(database: database);

  final AppDatabase database;
  final NutritionDao nutritionDao;
  final SupplementDao supplementDao;
  final BodyMeasurementDao bodyMeasurementDao;
  final FastingDao fastingDao;

  @override
  Future<domain.NutritionLog> getNutritionLog(DateTime date) async {
    final log = await nutritionDao.getNutritionLogByDate(date);
    return log.toDomain();
  }

  @override
  Future<void> saveNutritionLog(domain.NutritionLog log) async {
    await nutritionDao.updateNutritionLog(log.toData());
  }

  @override
  Future<List<domain.FoodItem>> getFoodItems() async {
    final items = await nutritionDao.getAllFoodItems();
    return items.map((i) => i.toDomain()).toList();
  }

  @override
  Future<List<domain.FoodItem>> searchFoodItems(String query) async {
    final items = await nutritionDao.searchFoodItems(query);
    return items.map((i) => i.toDomain()).toList();
  }

  @override
  Future<void> saveFoodItem(domain.FoodItem item) async {
    await nutritionDao.insertFoodItem(item.toData());
  }

  @override
  Future<List<domain.Supplement>> getSupplements() async {
    final supplements = await supplementDao.getAllSupplements();
    return supplements.map((s) => s.toDomain()).toList();
  }

  @override
  Future<void> saveSupplement(domain.Supplement supplement) async {
    await supplementDao.insertSupplement(supplement.toData());
  }

  @override
  Future<void> toggleSupplement(int id) async {
    final supplements = await supplementDao.getAllSupplements();
    final supplement = supplements.firstWhere((s) => s.id == id);
    await supplementDao.updateSupplement(
      supplement.copyWith(isActive: !supplement.isActive),
    );
  }

  @override
  Future<List<domain.BodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final measurements = await bodyMeasurementDao.getBodyMeasurements(
      startDate: startDate,
      endDate: endDate,
    );
    return measurements.map((m) => m.toDomain()).toList();
  }

  @override
  Future<void> saveBodyMeasurement(domain.BodyMeasurement measurement) async {
    await bodyMeasurementDao.insertBodyMeasurement(measurement.toData());
  }

  @override
  Future<domain.FastingSession> startFasting() async {
    final now = DateTime.now();
    final session = FastingSession(
      id: 0,
      startTime: now,
      duration: 0,
      isActive: true,
    );
    final id = await fastingDao.insertFastingSession(session);
    return session.copyWith(id: id).toDomain();
  }

  @override
  Future<domain.FastingSession> stopFasting() async {
    final active = await fastingDao.getActiveFastingSession();
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
    await fastingDao.updateFastingSession(stopped);
    return stopped.toDomain();
  }

  @override
  Future<domain.FastingSession?> getActiveFasting() async {
    final session = await fastingDao.getActiveFastingSession();
    return session?.toDomain();
  }

  @override
  Future<List<domain.FastingSession>> getFastingHistory() async {
    final history = await fastingDao.getFastingHistory();
    return history.map((s) => s.toDomain()).toList();
  }

  @override
  Future<void> updateFastingSession(domain.FastingSession session) async {
    await fastingDao.updateFastingSession(session.toData());
  }

  @override
  Future<void> deleteFastingSession(int id) async {
    await fastingDao.deleteFastingSession(id);
  }
}
