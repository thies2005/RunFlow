
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:sqlite3/sqlite3.dart';

class BodyMeasurementDao {
  BodyMeasurementDao({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  Future<List<BodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final db = await _db.database;
      final conditions = <String>[];
      final args = <Object?>[];
      if (startDate != null) {
        conditions.add('date >= ?');
        args.add(startDate.millisecondsSinceEpoch);
      }
      if (endDate != null) {
        conditions.add('date <= ?');
        args.add(endDate.millisecondsSinceEpoch);
      }
      final where = conditions.isEmpty ? '' : 'WHERE ${conditions.join(' AND ')}';
      final rows = db.select('SELECT * FROM body_measurements $where ORDER BY date DESC', args);
      return rows.map(_rowToBodyMeasurement).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get body measurements: $e');
    }
  }

  Future<int> insertBodyMeasurement(BodyMeasurement measurement) async {
    try {
      final db = await _db.database;
      db.execute(
        'INSERT INTO body_measurements (date, weight, body_fat, chest, waist, hips, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          measurement.date.millisecondsSinceEpoch,
          measurement.weight,
          measurement.bodyFat,
          measurement.chest,
          measurement.waist,
          measurement.hips,
          measurement.notes,
        ],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert body measurement: $e');
    }
  }

  BodyMeasurement _rowToBodyMeasurement(Row row) {
    return BodyMeasurement(
      id: row['id'] as int,
      date: DateTime.fromMillisecondsSinceEpoch(row['date'] as int),
      weight: (row['weight'] as num).toDouble(),
      bodyFat: (row['body_fat'] as num).toDouble(),
      chest: row['chest'] != null ? (row['chest'] as num).toDouble() : null,
      waist: row['waist'] != null ? (row['waist'] as num).toDouble() : null,
      hips: row['hips'] != null ? (row['hips'] as num).toDouble() : null,
      notes: row['notes'] as String?,
    );
  }
}
