import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/strength_local_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/services/workout_merge_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase database;
  late StrengthLocalDatasource strengthDatasource;
  late LocalActivityDatasource activityDatasource;
  late WorkoutMergeService mergeService;

  setUp(() async {
    database = AppDatabase.forTesting();
    strengthDatasource = StrengthLocalDatasource(database: database);
    activityDatasource = LocalActivityDatasource(database: database);
    mergeService = WorkoutMergeService(
      strengthDatasource: strengthDatasource,
      activityDatasource: activityDatasource,
    );
  });

  tearDown(() {
    database.close();
  });

  group('WorkoutMergeService Tests', () {
    final baseSession = StrengthSession(
      id: 'sess_1',
      workoutName: 'Strength Session',
      startTime: DateTime(2026, 6, 4, 10, 0), // 10:00 AM
      endTime: DateTime(2026, 6, 4, 11, 0),   // 11:00 AM
      durationSeconds: 3600,
      totalVolume: 1000.0,
      totalSets: 5,
      exercises: const [],
    );

    test('should merge when overlap ratio is 100%', () async {
      // 1. Insert session
      await strengthDatasource.insertSession(baseSession);

      // 2. Create the activity entity
      final activity = Activity(
        id: 'act_1',
        stravaId: 'str_1',
        type: ActivityType.strength,
        name: 'Gym Workout',
        startDate: DateTime(2026, 6, 4, 10, 0),
        distance: 0.0,
        movingTime: 3600,
        averageSpeed: 0.0,
        averageHr: 135.0,
        maxHr: 160,
        averageCadence: 0.0,
        hasHeartrate: true,
        totalElevation: 0.0,
        trimp: 0.0,
        runningTss: 0.0,
        estimatedVdot: 0.0,
        trainingType: null,
        calories: 400.0,
      );

      // 3. Save activity inside the activities table
      await activityDatasource.saveActivity(activity, 'act_1');

      // 4. Run merge service
      await mergeService.checkAndMergeOverlappingWorkouts(activity);

      // 5. Verify session enriched
      final sessions = await strengthDatasource.getAllSessions();
      expect(sessions.first.linkedActivityId, 'act_1');
      expect(sessions.first.averageHr, 135.0);
      expect(sessions.first.maxHr, 160);
      expect(sessions.first.calories, 400.0);

      // 6. Verify activity flagged
      final db = await database.database;
      final actRow = db.select('SELECT is_linked_to_strength FROM activities WHERE id = ?', ['act_1']);
      expect(actRow.first['is_linked_to_strength'], 1);
    });

    test('should merge when overlap ratio is exactly 50%', () async {
      await strengthDatasource.insertSession(baseSession);

      // Activity: 10:30 to 11:30 (3600s). Overlap is 10:30 to 11:00 (1800s).
      // Shorter duration is min(3600, 3600) = 3600. Ratio = 1800 / 3600 = 0.5.
      final activity = Activity(
        id: 'act_2',
        stravaId: 'str_2',
        type: ActivityType.strength,
        name: 'Gym Workout',
        startDate: DateTime(2026, 6, 4, 10, 30),
        distance: 0.0,
        movingTime: 3600,
        averageSpeed: 0.0,
        averageHr: 140.0,
        maxHr: 170,
        averageCadence: 0.0,
        hasHeartrate: true,
        totalElevation: 0.0,
        trimp: 0.0,
        runningTss: 0.0,
        estimatedVdot: 0.0,
        trainingType: null,
        calories: 450.0,
      );

      await activityDatasource.saveActivity(activity, 'act_2');

      await mergeService.checkAndMergeOverlappingWorkouts(activity);

      final sessions = await strengthDatasource.getAllSessions();
      expect(sessions.first.linkedActivityId, 'act_2');
      expect(sessions.first.averageHr, 140.0);
    });

    test('should NOT merge when overlap ratio is 49% (< 50%)', () async {
      await strengthDatasource.insertSession(baseSession);

      // Activity: 10:30:36 to 11:30:36 (3600s). Overlap is 10:30:36 to 11:00 (1764s).
      // Ratio = 1764 / 3600 = 0.49.
      final activity = Activity(
        id: 'act_3',
        stravaId: 'str_3',
        type: ActivityType.strength,
        name: 'Gym Workout',
        startDate: DateTime(2026, 6, 4, 10, 30, 36),
        distance: 0.0,
        movingTime: 3600,
        averageSpeed: 0.0,
        averageHr: 140.0,
        maxHr: 170,
        averageCadence: 0.0,
        hasHeartrate: true,
        totalElevation: 0.0,
        trimp: 0.0,
        runningTss: 0.0,
        estimatedVdot: 0.0,
        trainingType: null,
        calories: 450.0,
      );

      await activityDatasource.saveActivity(activity, 'act_3');

      await mergeService.checkAndMergeOverlappingWorkouts(activity);

      final sessions = await strengthDatasource.getAllSessions();
      expect(sessions.first.linkedActivityId, isNull);

      final db = await database.database;
      final actRow = db.select('SELECT is_linked_to_strength FROM activities WHERE id = ?', ['act_3']);
      expect(actRow.first['is_linked_to_strength'], 0);
    });

    test('should NOT merge if session is already linked', () async {
      final alreadyLinkedSession = baseSession.copyWith(linkedActivityId: 'act_existing');
      await strengthDatasource.insertSession(alreadyLinkedSession);

      final activity = Activity(
        id: 'act_4',
        stravaId: 'str_4',
        type: ActivityType.strength,
        name: 'Gym Workout',
        startDate: DateTime(2026, 6, 4, 10, 0),
        distance: 0.0,
        movingTime: 3600,
        averageSpeed: 0.0,
        averageHr: 140.0,
        maxHr: 170,
        averageCadence: 0.0,
        hasHeartrate: true,
        totalElevation: 0.0,
        trimp: 0.0,
        runningTss: 0.0,
        estimatedVdot: 0.0,
        trainingType: null,
        calories: 450.0,
      );

      await activityDatasource.saveActivity(activity, 'act_4');

      await mergeService.checkAndMergeOverlappingWorkouts(activity);

      final sessions = await strengthDatasource.getAllSessions();
      expect(sessions.first.linkedActivityId, 'act_existing'); // Unchanged
    });
  });
}
