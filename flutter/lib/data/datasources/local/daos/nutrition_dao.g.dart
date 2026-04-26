// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'nutrition_dao.dart';

// ignore_for_file: type=lint
mixin _$NutritionDaoMixin on DatabaseAccessor<AppDatabase> {
  $NutritionLogsTable get nutritionLogs => attachedDatabase.nutritionLogs;
  $FoodItemsTable get foodItems => attachedDatabase.foodItems;
  NutritionDaoManager get managers => NutritionDaoManager(this);
}

class NutritionDaoManager {
  final _$NutritionDaoMixin _db;
  NutritionDaoManager(this._db);
  $$NutritionLogsTableTableManager get nutritionLogs =>
      $$NutritionLogsTableTableManager(_db.attachedDatabase, _db.nutritionLogs);
  $$FoodItemsTableTableManager get foodItems =>
      $$FoodItemsTableTableManager(_db.attachedDatabase, _db.foodItems);
}
