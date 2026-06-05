
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:sqlite3/sqlite3.dart';

class FastingDao {
  FastingDao({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  Future<FastingSession?> getActiveFastingSession() async {
    try {
      final db = await _db.database;
      final rows = db.select('SELECT * FROM fasting_sessions WHERE is_active = 1 LIMIT 1');
      if (rows.isEmpty) return null;
      return _rowToFastingSession(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get active fasting: $e');
    }
  }

  Future<List<FastingSession>> getFastingHistory() async {
    try {
      final db = await _db.database;
      final rows = db.select('SELECT * FROM fasting_sessions WHERE is_active = 0 ORDER BY start_time DESC');
      return rows.map(_rowToFastingSession).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get fasting history: $e');
    }
  }

  Future<int> insertFastingSession(FastingSession session) async {
    try {
      final db = await _db.database;
      db.execute(
        'INSERT INTO fasting_sessions (start_time, end_time, duration, is_active) VALUES (?, NULL, ?, ?)',
        [session.startTime.millisecondsSinceEpoch, session.duration, session.isActive ? 1 : 0],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert fasting session: $e');
    }
  }

  Future<void> updateFastingSession(FastingSession session) async {
    try {
      final db = await _db.database;
      db.execute(
        'UPDATE fasting_sessions SET start_time = ?, end_time = ?, duration = ?, is_active = ? WHERE id = ?',
        [
          session.startTime.millisecondsSinceEpoch,
          session.endTime?.millisecondsSinceEpoch,
          session.duration,
          session.isActive ? 1 : 0,
          session.id,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to update fasting session: $e');
    }
  }

  Future<void> deleteFastingSession(int id) async {
    try {
      final db = await _db.database;
      db.execute('DELETE FROM fasting_sessions WHERE id = ?', [id]);
    } catch (e) {
      throw CacheException(message: 'Failed to delete fasting session: $e');
    }
  }

  FastingSession _rowToFastingSession(Row row) {
    final endTimeMs = row['end_time'] as int?;
    return FastingSession(
      id: row['id'] as int,
      startTime: DateTime.fromMillisecondsSinceEpoch(row['start_time'] as int),
      endTime: endTimeMs != null ? DateTime.fromMillisecondsSinceEpoch(endTimeMs) : null,
      duration: row['duration'] as int,
      isActive: (row['is_active'] as int) == 1,
    );
  }
}
