import 'package:drift/drift.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/tables.dart';

part 'nutrition_dao.g.dart';

@DriftAccessor(tables: [NutritionLogs, FoodItems])
class NutritionDao extends DatabaseAccessor<AppDatabase>
    with _$NutritionDaoMixin {
  NutritionDao(super.db);

  Future<DbNutritionLog?> getNutritionLogByDate(DateTime date) {
    final start =
        DateTime(date.year, date.month, date.day).millisecondsSinceEpoch;
    final end = start + const Duration(days: 1).inMilliseconds;
    return (select(nutritionLogs)
          ..where((t) => t.date.isBetweenValues(start, end)))
        .getSingleOrNull();
  }

  Future<int> insertNutritionLog(NutritionLogsCompanion entry) =>
      into(nutritionLogs).insert(entry);

  Future<void> updateNutritionLog(NutritionLogsCompanion entry) {
    return (update(nutritionLogs)..where((t) => t.id.equals(entry.id.value)))
        .write(entry);
  }

  Future<List<DbFoodItem>> getAllFoodItems() => select(foodItems).get();

  Future<List<DbFoodItem>> searchFoodItems(String query) {
    return (select(foodItems)..where((t) => t.name.like('%$query%'))).get();
  }

  Future<int> insertFoodItem(FoodItemsCompanion entry) =>
      into(foodItems).insert(entry);
}
