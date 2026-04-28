import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:sqlite3/sqlite3.dart';

class AppDatabase {
  AppDatabase._();

  AppDatabase.forTesting() {
    _db = sqlite3.openInMemory();
    _db!.execute('PRAGMA foreign_keys = ON');
    _runMigrations(_db!);
  }

  static AppDatabase? _instance;
  static AppDatabase get instance => _instance ??= AppDatabase._();

  Database? _db;

  static const int _currentVersion = 2;

  static final Map<int, void Function(Database)> _migrations = {
    1: (Database db) {
      _addColumnIfNotExists(db, 'supplements', 'server_id', 'TEXT');
    },
  };

  Future<Database> get database async {
    if (_db != null) return _db!;
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'runflow.db'));
    _db = sqlite3.open(file.path);
    _db!.execute('PRAGMA journal_mode = WAL');
    _db!.execute('PRAGMA foreign_keys = ON');
    _runMigrations(_db!);
    return _db!;
  }

  Future<void> initialize() async {
    await database;
  }

  void _runMigrations(Database db) {
    final rows = db.select('PRAGMA user_version');
    final storedVersion = rows.first['user_version'] as int;

    if (storedVersion == 0) {
      _createTables(db);
      db.execute('PRAGMA user_version = $_currentVersion');
      return;
    }

    for (int v = storedVersion; v < _currentVersion; v++) {
      _migrations[v]?.call(db);
    }

    if (storedVersion < _currentVersion) {
      db.execute('PRAGMA user_version = $_currentVersion');
    }
  }

  void close() {
    _db?.close();
    _db = null;
  }

  static void _addColumnIfNotExists(Database db, String table, String column, String type) {
    final columns = db.select('PRAGMA table_info($table)');
    final exists = columns.any((row) => row['name'] == column);
    if (!exists) {
      db.execute('ALTER TABLE $table ADD COLUMN $column $type');
    }
  }

  void _createTables(Database db) {
    db.execute('''
      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        water REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        serving_size REAL NOT NULL,
        barcode TEXT
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS supplements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS supplement_stacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS supplement_stack_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stack_id INTEGER NOT NULL REFERENCES supplement_stacks(id),
        supplement_id INTEGER NOT NULL REFERENCES supplements(id)
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS daily_health_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        nutrition_log_id INTEGER REFERENCES nutrition_logs(id),
        weight REAL NOT NULL DEFAULT 0,
        body_fat REAL NOT NULL DEFAULT 0,
        notes TEXT
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS fasting_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        weight REAL NOT NULL,
        body_fat REAL NOT NULL,
        chest REAL,
        waist REAL,
        hips REAL,
        notes TEXT
      )
    ''');
  }

  Future<NutritionLog> getNutritionLogByDate(DateTime date) async {
    try {
      final db = await database;
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
      final db = await database;
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
      final db = await database;
      final rows = db.select('SELECT * FROM food_items');
      return rows.map(_rowToFoodItem).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get food items: $e');
    }
  }

  Future<List<FoodItem>> searchFoodItems(String query) async {
    try {
      final db = await database;
      final rows = db.select('SELECT * FROM food_items WHERE name LIKE ?', ['%$query%']);
      return rows.map(_rowToFoodItem).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to search food items: $e');
    }
  }

  Future<int> insertFoodItem(FoodItem item) async {
    try {
      final db = await database;
      db.execute(
        'INSERT INTO food_items (name, calories, protein, carbs, fat, serving_size, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.name, item.calories, item.protein, item.carbs, item.fat, item.servingSize, item.barcode],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert food item: $e');
    }
  }

  Future<List<Supplement>> getAllSupplements() async {
    try {
      final db = await database;
      final rows = db.select('SELECT * FROM supplements');
      return rows.map(_rowToSupplement).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get supplements: $e');
    }
  }

  Future<int> insertSupplement(Supplement supplement) async {
    try {
      final db = await database;
      db.execute(
        'INSERT INTO supplements (server_id, name, dosage, frequency, is_active) VALUES (?, ?, ?, ?, ?)',
        [supplement.serverId, supplement.name, supplement.dosage, supplement.frequency, supplement.isActive ? 1 : 0],
      );
      return db.lastInsertRowId;
    } catch (e) {
      throw CacheException(message: 'Failed to insert supplement: $e');
    }
  }

  Future<void> updateSupplement(Supplement supplement) async {
    try {
      final db = await database;
      db.execute(
        'UPDATE supplements SET server_id = ?, name = ?, dosage = ?, frequency = ?, is_active = ? WHERE id = ?',
        [supplement.serverId, supplement.name, supplement.dosage, supplement.frequency, supplement.isActive ? 1 : 0, supplement.id],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to update supplement: $e');
    }
  }

  Future<List<BodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final db = await database;
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
      final db = await database;
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

  Future<FastingSession?> getActiveFastingSession() async {
    try {
      final db = await database;
      final rows = db.select('SELECT * FROM fasting_sessions WHERE is_active = 1 LIMIT 1');
      if (rows.isEmpty) return null;
      return _rowToFastingSession(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get active fasting: $e');
    }
  }

  Future<List<FastingSession>> getFastingHistory() async {
    try {
      final db = await database;
      final rows = db.select('SELECT * FROM fasting_sessions WHERE is_active = 0 ORDER BY start_time DESC');
      return rows.map(_rowToFastingSession).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get fasting history: $e');
    }
  }

  Future<int> insertFastingSession(FastingSession session) async {
    try {
      final db = await database;
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
      final db = await database;
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
    );
  }

  Supplement _rowToSupplement(Row row) {
    return Supplement(
      id: row['id'] as int,
      serverId: row['server_id'] as String?,
      name: row['name'] as String,
      dosage: row['dosage'] as String,
      frequency: row['frequency'] as String,
      isActive: (row['is_active'] as int) == 1,
    );
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
