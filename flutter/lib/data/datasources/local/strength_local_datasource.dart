import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:sqlite3/sqlite3.dart';

class StrengthLocalDatasource {
  StrengthLocalDatasource({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  // --- Exercises CRUD ---

  Future<List<Exercise>> getAllExercises() async {
    final db = await _db.database;
    await seedDefaultExercisesIfEmpty();
    final rows = db.select('SELECT * FROM strength_exercises ORDER BY name ASC');
    return rows.map(_rowToExercise).toList();
  }

  Future<void> insertExercise(Exercise exercise) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    db.execute(
      'INSERT OR REPLACE INTO strength_exercises (id, name, primary_muscle, secondary_muscle, notes, rest_seconds, is_bodyweight, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        exercise.id,
        exercise.name,
        exercise.primaryMuscle.name,
        exercise.secondaryMuscle?.name,
        exercise.notes,
        exercise.restSeconds,
        exercise.isBodyweight ? 1 : 0,
        exercise.isCustom ? 1 : 0,
        now,
      ],
    );
  }

  Future<void> updateExercise(Exercise exercise) async {
    await insertExercise(exercise);
  }

  Future<void> deleteExercise(String id) async {
    final db = await _db.database;
    db.execute('DELETE FROM strength_exercises WHERE id = ?', [id]);
  }

  // --- Templates CRUD ---

  Future<List<StrengthWorkoutTemplate>> getAllTemplates() async {
    final db = await _db.database;
    final rows = db.select('SELECT * FROM strength_workout_templates ORDER BY sort_order ASC, name ASC');
    return rows.map(_rowToTemplate).toList();
  }

  Future<void> insertTemplate(StrengthWorkoutTemplate template) async {
    final db = await _db.database;
    final exercisesJson = jsonEncode(template.exercises.map((e) => e.toJson()).toList());
    db.execute(
      'INSERT OR REPLACE INTO strength_workout_templates (id, name, exercises_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        template.id,
        template.name,
        exercisesJson,
        template.sortOrder,
        template.createdAt.millisecondsSinceEpoch,
        template.updatedAt.millisecondsSinceEpoch,
      ],
    );
  }

  Future<void> updateTemplate(StrengthWorkoutTemplate template) async {
    await insertTemplate(template);
  }

  Future<void> deleteTemplate(String id) async {
    final db = await _db.database;
    db.execute('DELETE FROM strength_workout_templates WHERE id = ?', [id]);
  }

  // --- Sessions CRUD ---

  Future<List<StrengthSession>> getAllSessions() async {
    final db = await _db.database;
    final rows = db.select('SELECT * FROM strength_sessions ORDER BY start_time DESC');
    return rows.map(_rowToSession).toList();
  }

  Future<List<StrengthSession>> getSessionsInRange(DateTime start, DateTime end) async {
    final db = await _db.database;
    final rows = db.select(
      'SELECT * FROM strength_sessions WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC',
      [start.millisecondsSinceEpoch, end.millisecondsSinceEpoch],
    );
    return rows.map(_rowToSession).toList();
  }

  Future<void> insertSession(StrengthSession session) async {
    final db = await _db.database;
    final exercisesJson = jsonEncode(session.exercises.map((e) => e.toJson()).toList());
    final now = DateTime.now().millisecondsSinceEpoch;
    db.execute(
      'INSERT OR REPLACE INTO strength_sessions (id, template_id, workout_name, start_time, end_time, duration_seconds, exercises_json, total_volume, total_sets, notes, average_hr, max_hr, calories, linked_activity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        session.id,
        session.templateId,
        session.workoutName,
        session.startTime.millisecondsSinceEpoch,
        session.endTime.millisecondsSinceEpoch,
        session.durationSeconds,
        exercisesJson,
        session.totalVolume,
        session.totalSets,
        session.notes,
        session.averageHr,
        session.maxHr,
        session.calories,
        session.linkedActivityId,
        now,
      ],
    );
  }

  Future<void> deleteSession(String id) async {
    final db = await _db.database;
    // If there was a linked activity, restore it (remove the hidden is_linked_to_strength flag)
    final sessionRow = db.select('SELECT linked_activity_id FROM strength_sessions WHERE id = ?', [id]);
    if (sessionRow.isNotEmpty) {
      final linkedId = sessionRow.first['linked_activity_id'] as String?;
      if (linkedId != null && linkedId.isNotEmpty) {
        db.execute('UPDATE activities SET is_linked_to_strength = 0 WHERE id = ?', [linkedId]);
      }
    }
    db.execute('DELETE FROM strength_sessions WHERE id = ?', [id]);
  }

  Future<WorkoutExercise?> getLastSessionForExercise(String exerciseId) async {
    final db = await _db.database;
    final rows = db.select(
      'SELECT exercises_json FROM strength_sessions ORDER BY start_time DESC'
    );
    for (final row in rows) {
      final jsonStr = row['exercises_json'] as String;
      final List<dynamic> list = jsonDecode(jsonStr) as List<dynamic>;
      for (final item in list) {
        final ex = WorkoutExercise.fromJson(item as Map<String, dynamic>);
        if (ex.exerciseId == exerciseId) {
          return ex;
        }
      }
    }
    return null;
  }

  Future<void> linkActivityToSession(
    String sessionId,
    String activityId,
    double avgHr,
    int maxHr,
    double calories,
  ) async {
    final db = await _db.database;
    db.execute(
      'UPDATE strength_sessions SET linked_activity_id = ?, average_hr = ?, max_hr = ?, calories = ? WHERE id = ?',
      [activityId, avgHr, maxHr, calories, sessionId],
    );
    db.execute(
      'UPDATE activities SET is_linked_to_strength = 1 WHERE id = ?',
      [activityId],
    );
  }

  // --- Seed Logic ---

  Future<void> seedDefaultExercisesIfEmpty() async {
    final db = await _db.database;
    final countRow = db.select('SELECT COUNT(*) as count FROM strength_exercises');
    final count = countRow.first['count'] as int;
    if (count == 0) {
      try {
        final jsonString = await rootBundle.loadString('assets/data/default_exercises.json');
        final List<dynamic> list = jsonDecode(jsonString) as List<dynamic>;
        for (final item in list) {
          final exercise = Exercise.fromJson(item as Map<String, dynamic>);
          db.execute(
            'INSERT INTO strength_exercises (id, name, primary_muscle, secondary_muscle, notes, rest_seconds, is_bodyweight, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
            [
              exercise.id,
              exercise.name,
              exercise.primaryMuscle.name,
              exercise.secondaryMuscle?.name,
              exercise.notes,
              exercise.restSeconds,
              exercise.isBodyweight ? 1 : 0,
              DateTime.now().millisecondsSinceEpoch,
            ],
          );
        }
      } catch (e) {
        // Fallback for tests when rootBundle is not available or initialized
      }
    }
  }

  // --- Helpers ---

  Exercise _rowToExercise(Row row) {
    return Exercise(
      id: row['id'] as String,
      name: row['name'] as String,
      primaryMuscle: MuscleGroup.values.firstWhere(
        (e) => e.name == (row['primary_muscle'] as String),
        orElse: () => MuscleGroup.other,
      ),
      secondaryMuscle: row['secondary_muscle'] != null
          ? MuscleGroup.values.firstWhere(
              (e) => e.name == (row['secondary_muscle'] as String),
              orElse: () => MuscleGroup.other,
            )
          : null,
      notes: row['notes'] as String?,
      restSeconds: row['rest_seconds'] as int,
      isBodyweight: (row['is_bodyweight'] as int) == 1,
      isCustom: (row['is_custom'] as int) == 1,
    );
  }

  StrengthWorkoutTemplate _rowToTemplate(Row row) {
    final jsonStr = row['exercises_json'] as String;
    final List<dynamic> list = jsonDecode(jsonStr) as List<dynamic>;
    final exercises = list.map((e) => WorkoutExercise.fromJson(e as Map<String, dynamic>)).toList();
    return StrengthWorkoutTemplate(
      id: row['id'] as String,
      name: row['name'] as String,
      exercises: exercises,
      sortOrder: row['sort_order'] as int,
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(row['updated_at'] as int),
    );
  }

  StrengthSession _rowToSession(Row row) {
    final jsonStr = row['exercises_json'] as String;
    final List<dynamic> list = jsonDecode(jsonStr) as List<dynamic>;
    final exercises = list.map((e) => WorkoutExercise.fromJson(e as Map<String, dynamic>)).toList();
    return StrengthSession(
      id: row['id'] as String,
      templateId: row['template_id'] as String?,
      workoutName: row['workout_name'] as String,
      startTime: DateTime.fromMillisecondsSinceEpoch(row['start_time'] as int),
      endTime: DateTime.fromMillisecondsSinceEpoch(row['end_time'] as int),
      durationSeconds: row['duration_seconds'] as int,
      exercises: exercises,
      totalVolume: (row['total_volume'] as num).toDouble(),
      totalSets: row['total_sets'] as int,
      notes: row['notes'] as String?,
      averageHr: row['average_hr'] != null ? (row['average_hr'] as num).toDouble() : null,
      maxHr: row['max_hr'] as int?,
      calories: row['calories'] != null ? (row['calories'] as num).toDouble() : null,
      linkedActivityId: row['linked_activity_id'] as String?,
    );
  }
}
