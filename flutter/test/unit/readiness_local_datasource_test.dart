import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase database;
  late ReadinessLocalDatasource datasource;

  setUp(() async {
    database = AppDatabase.forTesting();
    final db = await database.database;
    datasource = ReadinessLocalDatasource(db: db);
  });

  tearDown(() {
    database.close();
  });

  group('DailyReadinessRecord CRUD', () {
    test('getDailyRecord returns null when not found', () async {
      final result = await datasource.getDailyRecord('2024-06-15');
      expect(result, isNull);
    });

    test('upsert and get round-trip', () async {
      const record = DailyReadinessRecordModel(
        date: '2024-06-15',
        rhr: RhrMetricsModel(todayRhr: 52.0, baselineRhr: 55.0),
        sleep: SleepMetricsModel(totalDurationMinutes: 420.0),
        load: LoadMetricsModel(atl: 45.0, ctl: 55.0),
        subjective: SubjectiveInputModel(exhaustionLevel: 3),
        componentScores: [
          ComponentScoreModel(
              component: 'hrr', score: 85.0, isAvailable: true),
        ],
        compositeScore: 77.5,
        state: 'good',
        confidence: 'full',
        reasons: ['RHR below baseline'],
        computedAt: '2024-06-15T08:00:00.000',
        maxHr: 190,
        restingHr: 55,
      );

      await datasource.upsertDailyRecord(record);
      final fetched = await datasource.getDailyRecord('2024-06-15');

      expect(fetched, isNotNull);
      expect(fetched!.date, '2024-06-15');
      expect(fetched.rhr?.todayRhr, 52.0);
      expect(fetched.sleep?.totalDurationMinutes, 420.0);
      expect(fetched.load?.atl, 45.0);
      expect(fetched.subjective?.exhaustionLevel, 3);
      expect(fetched.componentScores.length, 1);
      expect(fetched.compositeScore, 77.5);
      expect(fetched.state, 'good');
      expect(fetched.reasons, ['RHR below baseline']);
      expect(fetched.maxHr, 190);
    });

    test('upsert replaces existing record', () async {
      const record = DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: [],
        compositeScore: 50.0,
        state: 'moderate',
        confidence: 'partial',
        reasons: [],
      );
      await datasource.upsertDailyRecord(record);

      const updated = DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: [],
        compositeScore: 80.0,
        state: 'excellent',
        confidence: 'full',
        reasons: ['All metrics great'],
      );
      await datasource.upsertDailyRecord(updated);

      final fetched = await datasource.getDailyRecord('2024-06-15');
      expect(fetched!.compositeScore, 80.0);
      expect(fetched.state, 'excellent');
    });

    test('getHistory returns records in date range', () async {
      for (int i = 1; i <= 5; i++) {
        final day = i.toString().padLeft(2, '0');
        await datasource.upsertDailyRecord(DailyReadinessRecordModel(
          date: '2024-06-$day',
          componentScores: const [],
          compositeScore: i * 10.0,
          state: 'good',
          confidence: 'full',
          reasons: [],
        ));
      }

      final history =
          await datasource.getHistory('2024-06-02', '2024-06-04');
      expect(history.length, 3);
      expect(history[0].date, '2024-06-02');
      expect(history[2].date, '2024-06-04');
    });
  });

  group('ReadinessBaseline CRUD', () {
    test('getBaseline returns null when not found', () async {
      final result = await datasource.getBaseline();
      expect(result, isNull);
    });

    test('upsert and get round-trip', () async {
      const baseline = ReadinessBaselineModel(
        rhrMedian30Day: 54.0,
        sleepAverage28Day: 410.0,
        lastUpdated: '2024-06-15T08:00:00.000',
      );

      await datasource.upsertBaseline(baseline);
      final fetched = await datasource.getBaseline();

      expect(fetched, isNotNull);
      expect(fetched!.rhrMedian30Day, 54.0);
      expect(fetched.sleepAverage28Day, 410.0);
    });

    test('upsert replaces existing baseline', () async {
      const baseline1 = ReadinessBaselineModel(
        rhrMedian30Day: 54.0,
        sleepAverage28Day: 410.0,
        lastUpdated: '2024-06-15T08:00:00.000',
      );
      await datasource.upsertBaseline(baseline1);

      const baseline2 = ReadinessBaselineModel(
        rhrMedian30Day: 52.0,
        sleepAverage28Day: 430.0,
        lastUpdated: '2024-06-16T08:00:00.000',
      );
      await datasource.upsertBaseline(baseline2);

      final fetched = await datasource.getBaseline();
      expect(fetched!.rhrMedian30Day, 52.0);
      expect(fetched.sleepAverage28Day, 430.0);
    });
  });

  group('AdaptedWorkout CRUD', () {
    test('getAdaptedWorkout returns null when not found', () async {
      final result = await datasource.getAdaptedWorkout('w-999');
      expect(result, isNull);
    });

    test('upsert and get round-trip', () async {
      const adapted = AdaptedWorkoutModel(
        id: 'aw-1',
        originalWorkoutId: 'w-1',
        date: '2024-06-15',
        originalType: 'tempo',
        adaptedType: 'easy',
        adaptationType: 'swapToEasy',
        originalTargetDistance: 10.0,
        adaptedTargetDistance: 6.0,
        originalTargetDuration: 50,
        adaptedTargetDuration: 35,
        originalTargetPace: 300.0,
        adaptedTargetPace: 360.0,
        reason: 'Reduced readiness',
        readinessScore: 35.0,
        readinessState: 'reduced',
        isAccepted: true,
        createdAt: '2024-06-15T08:00:00.000',
      );

      await datasource.upsertAdaptedWorkout(adapted);
      final fetched = await datasource.getAdaptedWorkout('w-1');

      expect(fetched, isNotNull);
      expect(fetched!.id, 'aw-1');
      expect(fetched.adaptedType, 'easy');
      expect(fetched.adaptedTargetDistance, 6.0);
      expect(fetched.isAccepted, true);
    });
  });

  group('WeeklyReconciliationRecord CRUD', () {
    test('getWeeklyRecord returns null when not found', () async {
      final result = await datasource.getWeeklyRecord('2024-06-10');
      expect(result, isNull);
    });

    test('upsert and get round-trip', () async {
      const record = WeeklyReconciliationRecordModel(
        weekStartDate: '2024-06-10',
        plannedLoad: 350.0,
        actualLoad: 280.0,
        adaptedLoad: 300.0,
        deficitPercent: 20.0,
        surplusPercent: 0.0,
        adjustmentDescription: 'Reduced due to fatigue',
        isApplied: false,
        raceWeeksRemaining: 4,
        requiresReview: true,
        createdAt: '2024-06-16T08:00:00.000',
      );

      await datasource.upsertWeeklyRecord(record);
      final fetched = await datasource.getWeeklyRecord('2024-06-10');

      expect(fetched, isNotNull);
      expect(fetched!.plannedLoad, 350.0);
      expect(fetched.actualLoad, 280.0);
      expect(fetched.deficitPercent, 20.0);
      expect(fetched.adjustmentDescription, 'Reduced due to fatigue');
      expect(fetched.raceWeeksRemaining, 4);
      expect(fetched.requiresReview, true);
    });
  });

  group('Sync queue', () {
    test('enqueue and retrieve pending items', () async {
      await datasource.enqueueSync(
        entityType: 'readiness_daily_record',
        localId: '2024-06-15',
        payload: {'date': '2024-06-15', 'state': 'good'},
      );

      final items = await datasource.getPendingReadinessSyncItems();
      expect(items.length, 1);
      expect(items.first.entityType, 'readiness_daily_record');
      expect(items.first.localId, '2024-06-15');
      expect(items.first.retryCount, 0);
    });

    test('markSyncCompleted removes item', () async {
      await datasource.enqueueSync(
        entityType: 'readiness_daily_record',
        localId: '2024-06-15',
        payload: {'date': '2024-06-15'},
      );

      final items = await datasource.getPendingReadinessSyncItems();
      expect(items.length, 1);

      await datasource.markSyncCompleted(items.first.id);

      final remaining = await datasource.getPendingReadinessSyncItems();
      expect(remaining, isEmpty);
    });

    test('incrementSyncRetry increments retry count', () async {
      await datasource.enqueueSync(
        entityType: 'readiness_baseline',
        localId: 'baseline-1',
        payload: {'rhrMedian30Day': 54.0},
      );

      final items = await datasource.getPendingReadinessSyncItems();
      expect(items.first.retryCount, 0);

      await datasource.incrementSyncRetry(items.first.id);

      final updated = await datasource.getPendingReadinessSyncItems();
      expect(updated.first.retryCount, 1);
    });

    test('filters only readiness entity types', () async {
      await datasource.enqueueSync(
        entityType: 'readiness_daily_record',
        localId: '2024-06-15',
        payload: {},
      );
      await datasource.enqueueSync(
        entityType: 'activity',
        localId: 'act-1',
        payload: {},
      );

      final items = await datasource.getPendingReadinessSyncItems();
      expect(items.length, 1);
      expect(items.first.entityType, 'readiness_daily_record');
    });
  });

  group('isRecordStale', () {
    test('returns true when record not found', () async {
      final stale = await datasource.isRecordStale('2024-06-15');
      expect(stale, true);
    });

    test('returns true when computedAt is null', () async {
      await datasource.upsertDailyRecord(const DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: [],
        compositeScore: 50.0,
        state: 'good',
        confidence: 'full',
        reasons: [],
      ));

      final stale = await datasource.isRecordStale('2024-06-15');
      expect(stale, true);
    });

    test('returns false for recently computed record', () async {
      await datasource.upsertDailyRecord(DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: const [],
        compositeScore: 50.0,
        state: 'good',
        confidence: 'full',
        reasons: [],
        computedAt: DateTime.now().toIso8601String(),
      ));

      final stale = await datasource.isRecordStale('2024-06-15');
      expect(stale, false);
    });

    test('returns true for old record with custom maxAge', () async {
      final oldTime = DateTime.now()
          .subtract(const Duration(minutes: 10))
          .toIso8601String();
      await datasource.upsertDailyRecord(DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: const [],
        compositeScore: 50.0,
        state: 'good',
        confidence: 'full',
        reasons: [],
        computedAt: oldTime,
      ));

      final stale = await datasource.isRecordStale(
        '2024-06-15',
        maxAge: const Duration(minutes: 5),
      );
      expect(stale, true);
    });
  });
}
