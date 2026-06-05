
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:sqlite3/sqlite3.dart';

class NutritionDao {
  NutritionDao({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  Future<NutritionLog> getNutritionLogByDate(DateTime date) async {
    try {
      final db = await _db.database;
      final start = DateTime(date.year, date.month, date.day).millisecondsSinceEpoch;
      final end = start + const Duration(days: 1).inMilliseconds;
      final rows = db.select('SELECT * FROM nutrition_logs WHERE date >= ? AND date < ?', [start, end]);
      if (rows.isEmpty) {
        final now = DateTime.now().millisecondsSinceEpoch;
        db.execute(
          'INSERT INTO nutrition_logs (date, calories, protein, carbs, fat, water, notes, created_at) VALUES (?, 0, 0, 0, 0, 0, NULL, ?)',
          [start, now],
        );
        final id = db.lastInsertRowId;
        return NutritionLog(
          id: id,
          date: date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          water: 0,
          createdAt: DateTime.now(),
        );
      }
      return _rowToNutritionLog(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get nutrition log: $e');
    }
  }

  Future<void> updateNutritionLog(NutritionLog log) async {
    try {
      final db = await _db.database;
      db.execute(
        'UPDATE nutrition_logs SET calories = ?, protein = ?, carbs = ?, fat = ?, water = ?, notes = ? WHERE id = ?',
        [log.calories, log.protein, log.carbs, log.fat, log.water, log.notes, log.id],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to update nutrition log: $e');
    }
  }

  Future<List<FoodItem>> getAllFoodItems() async {
    try {
      final db = await _db.database;
      final rows = db.select('SELECT * FROM food_items');
      return rows.map(_rowToFoodItem).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get food items: $e');
    }
  }

  Future<List<FoodItem>> searchFoodItems(String query) async {
    try {
      final db = await _db.database;
      final rows = db.select('SELECT * FROM food_items WHERE name LIKE ?', ['%$query%']);
      return rows.map(_rowToFoodItem).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to search food items: $e');
    }
  }

  Future<int> insertFoodItem(FoodItem item) async {
    try {
      final db = await _db.database;
      db.execute(
        'INSERT INTO food_items (name, calories, protein, carbs, fat, serving_size, barcode, brand, favorite_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.name, item.calories, item.protein, item.carbs, item.fat, item.servingSize, item.barcode, item.brand, item.favoriteId],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert food item: $e');
    }
  }

  NutritionLog _rowToNutritionLog(Row row) {
    return NutritionLog(
      id: row['id'] as int,
      date: DateTime.fromMillisecondsSinceEpoch(row['date'] as int),
      calories: (row['calories'] as num).toDouble(),
      protein: (row['protein'] as num).toDouble(),
      carbs: (row['carbs'] as num).toDouble(),
      fat: (row['fat'] as num).toDouble(),
      water: (row['water'] as num).toDouble(),
      notes: row['notes'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
    );
  }

  FoodItem _rowToFoodItem(Row row) {
    return FoodItem(
      id: row['id'] as int,
      name: row['name'] as String,
      calories: (row['calories'] as num).toDouble(),
      protein: (row['protein'] as num).toDouble(),
      carbs: (row['carbs'] as num).toDouble(),
      fat: (row['fat'] as num).toDouble(),
      servingSize: (row['serving_size'] as num).toDouble(),
      barcode: row['barcode'] as String?,
      brand: row['brand'] as String?,
      favoriteId: row['favorite_id'] as String?,
    );
  }
}
