import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/strength_local_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase database;
  late StrengthLocalDatasource datasource;

  setUp(() async {
    database = AppDatabase.forTesting();
    datasource = StrengthLocalDatasource(database: database);
  });

  tearDown(() {
    database.close();
  });

  group('StrengthLocalDatasource Exercises CRUD', () {
    test('getAllExercises returns seeded default exercises when empty', () async {
      final exercises = await datasource.getAllExercises();
      expect(exercises, isNotEmpty);
      expect(exercises.any((e) => e.name == 'Barbell Bench Press'), isTrue);
    });

    test('insert and get round-trip', () async {
      const exercise = Exercise(
        id: 'ex_1',
        name: 'Custom Push Press',
        primaryMuscle: MuscleGroup.shoulders,
        secondaryMuscle: MuscleGroup.triceps,
        notes: 'Keep bar path straight',
        restSeconds: 120,
        isBodyweight: false,
        isCustom: true,
      );

      final initialList = await datasource.getAllExercises();
      final initialCount = initialList.length;

      await datasource.insertExercise(exercise);
      final list = await datasource.getAllExercises();

      expect(list.length, initialCount + 1);
      final fetched = list.firstWhere((e) => e.id == 'ex_1');
      expect(fetched.name, 'Custom Push Press');
      expect(fetched.primaryMuscle, MuscleGroup.shoulders);
      expect(fetched.secondaryMuscle, MuscleGroup.triceps);
      expect(fetched.notes, 'Keep bar path straight');
      expect(fetched.restSeconds, 120);
      expect(fetched.isBodyweight, false);
      expect(fetched.isCustom, true);
    });

    test('update exercise fields', () async {
      const exercise = Exercise(
        id: 'ex_1',
        name: 'Custom Push Press',
        primaryMuscle: MuscleGroup.shoulders,
        restSeconds: 90,
      );
      await datasource.insertExercise(exercise);

      const updated = Exercise(
        id: 'ex_1',
        name: 'Incline Push Press',
        primaryMuscle: MuscleGroup.shoulders,
        restSeconds: 120,
        notes: '30 degree incline',
      );
      await datasource.updateExercise(updated);

      final list = await datasource.getAllExercises();
      final fetched = list.firstWhere((e) => e.id == 'ex_1');
      expect(fetched.name, 'Incline Push Press');
      expect(fetched.restSeconds, 120);
      expect(fetched.notes, '30 degree incline');
    });

    test('delete exercise', () async {
      const exercise = Exercise(
        id: 'ex_1',
        name: 'Squat Heavy',
        primaryMuscle: MuscleGroup.quads,
        restSeconds: 90,
      );
      final initialList = await datasource.getAllExercises();
      final initialCount = initialList.length;

      await datasource.insertExercise(exercise);
      expect((await datasource.getAllExercises()).length, initialCount + 1);

      await datasource.deleteExercise('ex_1');
      final listAfter = await datasource.getAllExercises();
      expect(listAfter.length, initialCount);
      expect(listAfter.any((e) => e.id == 'ex_1'), isFalse);
    });
  });

  group('StrengthLocalDatasource Templates CRUD', () {
    test('insert and get templates', () async {
      final template = StrengthWorkoutTemplate(
        id: 'temp_1',
        name: 'Push Day',
        exercises: [
          const WorkoutExercise(
            id: 'we_1',
            exerciseId: 'ex_1',
            exerciseName: 'Bench Press',
            primaryMuscle: MuscleGroup.chest,
            restSeconds: 90,
            sets: [
              ExerciseSet(id: 's_1', setNumber: 1, reps: 8, weight: 80),
            ],
          )
        ],
        sortOrder: 1,
        createdAt: DateTime(2026, 6, 1),
        updatedAt: DateTime(2026, 6, 2),
      );

      await datasource.insertTemplate(template);
      final list = await datasource.getAllTemplates();

      expect(list.length, 1);
      final fetched = list.first;
      expect(fetched.id, 'temp_1');
      expect(fetched.name, 'Push Day');
      expect(fetched.sortOrder, 1);
      expect(fetched.exercises.length, 1);
      expect(fetched.exercises.first.exerciseName, 'Bench Press');
      expect(fetched.exercises.first.sets.first.reps, 8);
    });

    test('delete template', () async {
      final template = StrengthWorkoutTemplate(
        id: 'temp_1',
        name: 'Pull Day',
        exercises: const [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await datasource.insertTemplate(template);
      expect(await datasource.getAllTemplates(), isNotEmpty);

      await datasource.deleteTemplate('temp_1');
      expect(await datasource.getAllTemplates(), isEmpty);
    });
  });

  group('StrengthLocalDatasource Sessions CRUD', () {
    final session = StrengthSession(
      id: 'sess_1',
      templateId: 'temp_1',
      workoutName: 'Evening Workout',
      startTime: DateTime(2026, 6, 4, 10, 0),
      endTime: DateTime(2026, 6, 4, 11, 0),
      durationSeconds: 3600,
      totalVolume: 2400.0,
      totalSets: 12,
      notes: 'Felt strong today',
      exercises: [
        const WorkoutExercise(
          id: 'we_1',
          exerciseId: 'ex_1',
          exerciseName: 'Deadlift',
          primaryMuscle: MuscleGroup.back,
          restSeconds: 180,
          sets: [
            ExerciseSet(id: 's_1', setNumber: 1, reps: 5, weight: 100, isCompleted: true),
          ],
        )
      ],
    );

    test('insert and get session', () async {
      await datasource.insertSession(session);
      final list = await datasource.getAllSessions();

      expect(list.length, 1);
      final fetched = list.first;
      expect(fetched.id, 'sess_1');
      expect(fetched.workoutName, 'Evening Workout');
      expect(fetched.durationSeconds, 3600);
      expect(fetched.totalVolume, 2400.0);
      expect(fetched.totalSets, 12);
      expect(fetched.notes, 'Felt strong today');
      expect(fetched.exercises.first.exerciseId, 'ex_1');
    });

    test('getSessionsInRange filtering', () async {
      await datasource.insertSession(session);

      final beforeRange = await datasource.getSessionsInRange(
        DateTime(2026, 6, 1),
        DateTime(2026, 6, 3),
      );
      expect(beforeRange, isEmpty);

      final inRange = await datasource.getSessionsInRange(
        DateTime(2026, 6, 4),
        DateTime(2026, 6, 5),
      );
      expect(inRange.length, 1);
    });

    test('getLastSessionForExercise prefill data', () async {
      await datasource.insertSession(session);

      final lastWe = await datasource.getLastSessionForExercise('ex_1');
      expect(lastWe, isNotNull);
      expect(lastWe!.exerciseName, 'Deadlift');
      expect(lastWe.sets.first.weight, 100);

      // Verify returning null for non-existing exercise id
      final none = await datasource.getLastSessionForExercise('non_existent');
      expect(none, isNull);
    });

    test('linkActivityToSession and deleteSession restore activity state', () async {
      // First insert an activity in DB using LocalActivityDatasource to match schema
      final activityDatasource = LocalActivityDatasource(database: database);
      await activityDatasource.saveActivity(
        Activity(
          id: 'act_99',
          stravaId: '',
          type: ActivityType.strength,
          name: 'Strength Activity',
          startDate: DateTime.fromMillisecondsSinceEpoch(1770000000 * 1000),
          distance: 0.0,
          movingTime: 3600,
          averageSpeed: 0.0,
          averageHr: null,
          maxHr: null,
          averageCadence: 0.0,
          hasHeartrate: false,
          totalElevation: 0.0,
          trimp: 0.0,
          runningTss: 0.0,
          estimatedVdot: 0.0,
          trainingType: null,
          calories: null,
        ),
        'act_99',
      );

      await datasource.insertSession(session);

      // Link activity
      await datasource.linkActivityToSession('sess_1', 'act_99', 145.0, 175, 450.0);

      // Check session updated
      final list = await datasource.getAllSessions();
      expect(list.first.linkedActivityId, 'act_99');
      expect(list.first.averageHr, 145.0);
      expect(list.first.maxHr, 175);
      expect(list.first.calories, 450.0);

      // Check activity flag
      final db = await database.database;
      final actRow = db.select('SELECT is_linked_to_strength FROM activities WHERE id = ?', ['act_99']);
      expect(actRow.first['is_linked_to_strength'], 1);

      // Delete session and check activity restored
      await datasource.deleteSession('sess_1');
      final actRowAfter = db.select('SELECT is_linked_to_strength FROM activities WHERE id = ?', ['act_99']);
      expect(actRowAfter.first['is_linked_to_strength'], 0);
    });
  });
}
