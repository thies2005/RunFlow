import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
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

  static const int _currentVersion = 7;

  static final Map<int, void Function(Database)> _migrations = {
    1: (Database db) {
      _addColumnIfNotExists(db, 'supplements', 'server_id', 'TEXT');
    },
    2: (Database db) {
      db.execute('''
        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          local_id TEXT NOT NULL UNIQUE,
          strava_id TEXT NOT NULL DEFAULT '',
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          start_date INTEGER NOT NULL,
          distance REAL NOT NULL DEFAULT 0,
          moving_time INTEGER NOT NULL DEFAULT 0,
          average_speed REAL,
          average_hr REAL,
          max_hr INTEGER,
          average_cadence REAL,
          has_heartrate INTEGER NOT NULL DEFAULT 0,
          total_elevation REAL NOT NULL DEFAULT 0,
          trimp REAL,
          running_tss REAL,
          estimated_vdot REAL,
          training_type TEXT,
          hr_zone_1_time INTEGER NOT NULL DEFAULT 0,
          hr_zone_2_time INTEGER NOT NULL DEFAULT 0,
          hr_zone_3_time INTEGER NOT NULL DEFAULT 0,
          hr_zone_4_time INTEGER NOT NULL DEFAULT 0,
          hr_zone_5_time INTEGER NOT NULL DEFAULT 0,
          calories REAL,
          streams_json TEXT,
          is_synced INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS pending_sync (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL,
          local_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          max_retries INTEGER NOT NULL DEFAULT 5,
          created_at INTEGER NOT NULL,
          last_attempt_at INTEGER
        )
      ''');
    },
    3: (Database db) {
      db.execute('''
        CREATE TABLE IF NOT EXISTS api_cache (
          key TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      ''');
    },
    4: (Database db) {
      db.execute('''
        CREATE TABLE IF NOT EXISTS readiness_daily_records (
          date TEXT PRIMARY KEY,
          rhr_json TEXT,
          sleep_json TEXT,
          load_json TEXT,
          subjective_json TEXT,
          component_scores_json TEXT NOT NULL DEFAULT '[]',
          composite_score REAL NOT NULL DEFAULT 0,
          state TEXT NOT NULL DEFAULT 'unavailable',
          confidence TEXT NOT NULL DEFAULT 'unavailable',
          reasons_json TEXT NOT NULL DEFAULT '[]',
          override_json TEXT,
          computed_at INTEGER,
          synced_at INTEGER,
          max_hr INTEGER,
          resting_hr INTEGER
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS readiness_baselines (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          rhr_median_30_day REAL,
          sleep_average_28_day REAL,
          last_updated INTEGER NOT NULL
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS adapted_workouts (
          id TEXT PRIMARY KEY,
          original_workout_id TEXT NOT NULL,
          date TEXT NOT NULL,
          original_type TEXT NOT NULL,
          adapted_type TEXT NOT NULL,
          adaptation_type TEXT NOT NULL,
          original_target_distance REAL NOT NULL,
          adapted_target_distance REAL,
          original_target_duration INTEGER NOT NULL,
          adapted_target_duration INTEGER,
          original_target_pace REAL NOT NULL,
          adapted_target_pace REAL,
          reason TEXT NOT NULL,
          readiness_score REAL NOT NULL,
          readiness_state TEXT NOT NULL,
          is_accepted INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          synced_at INTEGER
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS weekly_reconciliation_records (
          week_start_date TEXT PRIMARY KEY,
          planned_load REAL NOT NULL DEFAULT 0,
          actual_load REAL NOT NULL DEFAULT 0,
          adapted_load REAL NOT NULL DEFAULT 0,
          deficit_percent REAL NOT NULL DEFAULT 0,
          surplus_percent REAL NOT NULL DEFAULT 0,
          adjustment_description TEXT,
          is_applied INTEGER NOT NULL DEFAULT 0,
          race_weeks_remaining INTEGER,
          requires_review INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          synced_at INTEGER
        )
      ''');
    },
    5: (Database db) {
      _addColumnIfNotExists(db, 'food_items', 'brand', 'TEXT');
      _addColumnIfNotExists(db, 'food_items', 'favorite_id', 'TEXT');
      
      _addColumnIfNotExists(db, 'supplements', 'amount', 'REAL NOT NULL DEFAULT 0');
      _addColumnIfNotExists(db, 'supplements', 'unit', 'TEXT NOT NULL DEFAULT "mg"');
      _addColumnIfNotExists(db, 'supplements', 'time_of_day', 'TEXT NOT NULL DEFAULT "MORNING"');
      _addColumnIfNotExists(db, 'supplements', 'days_of_week', 'TEXT NOT NULL DEFAULT "[]"');
      _addColumnIfNotExists(db, 'supplements', 'stack_id', 'TEXT');
      _addColumnIfNotExists(db, 'supplements', 'sort_order', 'INTEGER NOT NULL DEFAULT 0');

      db.execute('CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON nutrition_logs(date)');
      db.execute('CREATE INDEX IF NOT EXISTS idx_daily_health_logs_date ON daily_health_logs(date)');
      db.execute('CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name)');
    },
    6: (Database db) {
      db.execute('''
        CREATE TABLE IF NOT EXISTS strength_exercises (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          primary_muscle TEXT NOT NULL,
          secondary_muscle TEXT,
          notes TEXT,
          rest_seconds INTEGER NOT NULL DEFAULT 90,
          is_bodyweight INTEGER NOT NULL DEFAULT 0,
          is_custom INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS strength_workout_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          exercises_json TEXT NOT NULL DEFAULT '[]',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      ''');
      db.execute('''
        CREATE TABLE IF NOT EXISTS strength_sessions (
          id TEXT PRIMARY KEY,
          template_id TEXT,
          workout_name TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL,
          exercises_json TEXT NOT NULL DEFAULT '[]',
          total_volume REAL NOT NULL DEFAULT 0,
          total_sets INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          average_hr REAL,
          max_hr INTEGER,
          calories REAL,
          linked_activity_id TEXT,
          created_at INTEGER NOT NULL
        )
      ''');
      db.execute('CREATE INDEX IF NOT EXISTS idx_strength_sessions_start ON strength_sessions(start_time)');
      _addColumnIfNotExists(db, 'activities', 'is_linked_to_strength', 'INTEGER NOT NULL DEFAULT 0');
    },
  };

  Future<Database>? _openFuture;

  Future<Database> get database {
    if (_db != null) return Future.value(_db!);
    // Cache the in-flight open so concurrent callers don't race past the null
    // check and open multiple sqlite handles / run migrations twice.
    return _openFuture ??= _open();
  }

  Future<Database> _open() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'runflow.db'));
    final db = sqlite3.open(file.path);
    db.execute('PRAGMA journal_mode = WAL');
    db.execute('PRAGMA foreign_keys = ON');
    _runMigrations(db);
    _db = db;
    _openFuture = null;
    return db;
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
    _openFuture = null;
  }

  static const _userScopedTables = <String>[
    'activities',
    'pending_sync',
    'api_cache',
    'readiness_daily_records',
    'readiness_baselines',
    'adapted_workouts',
    'weekly_reconciliation_records',
    'strength_exercises',
    'strength_workout_templates',
    'strength_sessions',
    'nutrition_logs',
    'food_items',
    'supplements',
    'supplement_stacks',
    'supplement_stack_items',
    'daily_health_logs',
    'fasting_sessions',
    'body_measurements',
  ];

  Future<void> clearUserData() async {
    final db = await database;
    // PRAGMA foreign_keys is a no-op inside a transaction, and the user tables
    // have FK child->parent relationships (e.g. supplement_stack_items ->
    // supplements/stacks, daily_health_logs -> nutrition_logs). Deleting in any
    // order would otherwise trip a FOREIGN KEY constraint and roll back, wiping
    // nothing. Disable enforcement for this connection (outside the txn), wipe
    // every user table atomically, then restore the prior setting.
    final fkWasOn =
        (db.select('PRAGMA foreign_keys').first['foreign_keys'] as int?) == 1;
    if (fkWasOn) {
      db.execute('PRAGMA foreign_keys = OFF');
    }
    try {
      db.execute('BEGIN');
      try {
        for (final table in _userScopedTables) {
          db.execute('DELETE FROM $table');
        }
        db.execute('COMMIT');
      } catch (e) {
        db.execute('ROLLBACK');
        rethrow;
      }
    } finally {
      if (fkWasOn) {
        db.execute('PRAGMA foreign_keys = ON');
      }
    }
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
        barcode TEXT,
        brand TEXT,
        favorite_id TEXT
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS supplements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        amount REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'mg',
        time_of_day TEXT NOT NULL DEFAULT 'MORNING',
        days_of_week TEXT NOT NULL DEFAULT '[]',
        stack_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
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
    db.execute('CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON nutrition_logs(date)');
    db.execute('CREATE INDEX IF NOT EXISTS idx_daily_health_logs_date ON daily_health_logs(date)');
    db.execute('CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name)');
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
    db.execute('''
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        strava_id TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        start_date INTEGER NOT NULL,
        distance REAL NOT NULL DEFAULT 0,
        moving_time INTEGER NOT NULL DEFAULT 0,
        average_speed REAL,
        average_hr REAL,
        max_hr INTEGER,
        average_cadence REAL,
        has_heartrate INTEGER NOT NULL DEFAULT 0,
        total_elevation REAL NOT NULL DEFAULT 0,
        trimp REAL,
        running_tss REAL,
        estimated_vdot REAL,
        training_type TEXT,
        hr_zone_1_time INTEGER NOT NULL DEFAULT 0,
        hr_zone_2_time INTEGER NOT NULL DEFAULT 0,
        hr_zone_3_time INTEGER NOT NULL DEFAULT 0,
        hr_zone_4_time INTEGER NOT NULL DEFAULT 0,
        hr_zone_5_time INTEGER NOT NULL DEFAULT 0,
        calories REAL,
        streams_json TEXT,
        is_synced INTEGER NOT NULL DEFAULT 0,
        is_linked_to_strength INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        local_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        created_at INTEGER NOT NULL,
        last_attempt_at INTEGER
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS api_cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS readiness_daily_records (
        date TEXT PRIMARY KEY,
        rhr_json TEXT,
        sleep_json TEXT,
        load_json TEXT,
        subjective_json TEXT,
        component_scores_json TEXT NOT NULL DEFAULT '[]',
        composite_score REAL NOT NULL DEFAULT 0,
        state TEXT NOT NULL DEFAULT 'unavailable',
        confidence TEXT NOT NULL DEFAULT 'unavailable',
        reasons_json TEXT NOT NULL DEFAULT '[]',
        override_json TEXT,
        computed_at INTEGER,
        synced_at INTEGER,
        max_hr INTEGER,
        resting_hr INTEGER
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS readiness_baselines (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        rhr_median_30_day REAL,
        sleep_average_28_day REAL,
        last_updated INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS adapted_workouts (
        id TEXT PRIMARY KEY,
        original_workout_id TEXT NOT NULL,
        date TEXT NOT NULL,
        original_type TEXT NOT NULL,
        adapted_type TEXT NOT NULL,
        adaptation_type TEXT NOT NULL,
        original_target_distance REAL NOT NULL,
        adapted_target_distance REAL,
        original_target_duration INTEGER NOT NULL,
        adapted_target_duration INTEGER,
        original_target_pace REAL NOT NULL,
        adapted_target_pace REAL,
        reason TEXT NOT NULL,
        readiness_score REAL NOT NULL,
        readiness_state TEXT NOT NULL,
        is_accepted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS weekly_reconciliation_records (
        week_start_date TEXT PRIMARY KEY,
        planned_load REAL NOT NULL DEFAULT 0,
        actual_load REAL NOT NULL DEFAULT 0,
        adapted_load REAL NOT NULL DEFAULT 0,
        deficit_percent REAL NOT NULL DEFAULT 0,
        surplus_percent REAL NOT NULL DEFAULT 0,
        adjustment_description TEXT,
        is_applied INTEGER NOT NULL DEFAULT 0,
        race_weeks_remaining INTEGER,
        requires_review INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS strength_exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        secondary_muscle TEXT,
        notes TEXT,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        is_bodyweight INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS strength_workout_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        exercises_json TEXT NOT NULL DEFAULT '[]',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');
    db.execute('''
      CREATE TABLE IF NOT EXISTS strength_sessions (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        workout_name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        exercises_json TEXT NOT NULL DEFAULT '[]',
        total_volume REAL NOT NULL DEFAULT 0,
        total_sets INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        average_hr REAL,
        max_hr INTEGER,
        calories REAL,
        linked_activity_id TEXT,
        created_at INTEGER NOT NULL
      )
    ''');
    db.execute('CREATE INDEX IF NOT EXISTS idx_strength_sessions_start ON strength_sessions(start_time)');
  }








































}
