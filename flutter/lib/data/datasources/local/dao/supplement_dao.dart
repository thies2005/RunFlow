import 'dart:convert';

import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:sqlite3/sqlite3.dart';

class SupplementDao {
  SupplementDao({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  Future<List<Supplement>> getAllSupplements() async {
    try {
      final db = await _db.database;
      final rows = db.select('SELECT * FROM supplements');
      return rows.map(_rowToSupplement).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get supplements: $e');
    }
  }

  Future<int> insertSupplement(Supplement supplement) async {
    try {
      final db = await _db.database;
      db.execute(
        'INSERT INTO supplements (server_id, name, dosage, frequency, is_active, amount, unit, time_of_day, days_of_week, stack_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          supplement.serverId, supplement.name, supplement.dosage, supplement.frequency, supplement.isActive ? 1 : 0,
          supplement.amount, supplement.unit, supplement.timeOfDay, jsonEncode(supplement.daysOfWeek), supplement.stackId, supplement.order,
        ],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert supplement: $e');
    }
  }

  Future<void> updateSupplement(Supplement supplement) async {
    try {
      final db = await _db.database;
      db.execute(
        'UPDATE supplements SET server_id = ?, name = ?, dosage = ?, frequency = ?, is_active = ?, amount = ?, unit = ?, time_of_day = ?, days_of_week = ?, stack_id = ?, sort_order = ? WHERE id = ?',
        [
          supplement.serverId, supplement.name, supplement.dosage, supplement.frequency, supplement.isActive ? 1 : 0,
          supplement.amount, supplement.unit, supplement.timeOfDay, jsonEncode(supplement.daysOfWeek), supplement.stackId, supplement.order,
          supplement.id,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to update supplement: $e');
    }
  }

  Supplement _rowToSupplement(Row row) {
    return Supplement(
      id: row['id'] as int,
      serverId: row['server_id'] as String?,
      name: row['name'] as String,
      dosage: row['dosage'] as String,
      frequency: row['frequency'] as String,
      isActive: (row['is_active'] as int) == 1,
      amount: (row['amount'] as num?)?.toDouble() ?? 0.0,
      unit: row['unit'] as String? ?? 'mg',
      timeOfDay: row['time_of_day'] as String? ?? 'MORNING',
      daysOfWeek: List<int>.from(jsonDecode(row['days_of_week'] as String? ?? '[]') as Iterable),
      stackId: row['stack_id'] as String?,
      order: row['sort_order'] as int? ?? 0,
    );
  }
}
