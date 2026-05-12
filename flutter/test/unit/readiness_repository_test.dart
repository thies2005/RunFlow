import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/datasources/remote/readiness_remote_datasource.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';
import 'package:runflow_flutter/data/repositories/readiness_repository_impl.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/repositories/readiness_repository.dart';

class MockReadinessLocalDatasource extends Mock
    implements ReadinessLocalDatasource {}

class MockReadinessRemoteDatasource extends Mock
    implements ReadinessRemoteDatasource {}

void main() {
  late MockReadinessLocalDatasource mockLocal;
  late MockReadinessRemoteDatasource mockRemote;
  late ReadinessRepository repository;

  final testDate = DateTime(2024, 6, 15);

  const testDailyModel = DailyReadinessRecordModel(
    date: '2024-06-15',
    compositeScore: 75.0,
    state: 'good',
    confidence: 'full',
    componentScores: [],
    reasons: [],
  );

  final testDailyEntity = DailyReadinessRecord(
    date: testDate,
    compositeScore: 75.0,
    state: ReadinessState.good,
    confidence: DataConfidence.full,
    componentScores: [],
    reasons: [],
  );

  const testBaselineModel = ReadinessBaselineModel(
    rhrMedian30Day: 52.0,
    sleepAverage28Day: 7.5,
    lastUpdated: '2024-06-15T00:00:00.000Z',
  );

  final testBaselineEntity = ReadinessBaseline(
    rhrMedian30Day: 52.0,
    sleepAverage28Day: 7.5,
    lastUpdated: DateTime(2024, 6, 15),
  );

  const testAdaptedModel = AdaptedWorkoutModel(
    id: 'aw1',
    originalWorkoutId: 'w1',
    date: '2024-06-15',
    originalType: 'interval',
    adaptedType: 'easy',
    adaptationType: 'volumeReduction',
    originalTargetDistance: 8000.0,
    originalTargetDuration: 3600,
    originalTargetPace: 300.0,
    reason: 'Reduced readiness',
    readinessScore: 45.0,
    readinessState: 'reduced',
    isAccepted: true,
    createdAt: '2024-06-15T08:00:00.000Z',
  );

  final testAdaptedEntity = AdaptedWorkout(
    id: 'aw1',
    originalWorkoutId: 'w1',
    date: testDate,
    originalType: 'interval',
    adaptedType: 'easy',
    adaptationType: AdaptationType.volumeReduction,
    originalTargetDistance: 8000.0,
    originalTargetDuration: 3600,
    originalTargetPace: 300.0,
    reason: 'Reduced readiness',
    readinessScore: 45.0,
    readinessState: ReadinessState.reduced,
    isAccepted: true,
    createdAt: DateTime(2024, 6, 15, 8),
  );

  const testWeeklyModel = WeeklyReconciliationRecordModel(
    weekStartDate: '2024-06-10',
    plannedLoad: 300.0,
    actualLoad: 250.0,
    adaptedLoad: 260.0,
    deficitPercent: 16.7,
    surplusPercent: 0.0,
    isApplied: false,
    requiresReview: false,
    createdAt: '2024-06-16T00:00:00.000Z',
  );

  final testWeeklyEntity = WeeklyReconciliationRecord(
    weekStartDate: DateTime(2024, 6, 10),
    plannedLoad: 300.0,
    actualLoad: 250.0,
    adaptedLoad: 260.0,
    deficitPercent: 16.7,
    surplusPercent: 0.0,
    isApplied: false,
    requiresReview: false,
    createdAt: DateTime(2024, 6, 16),
  );

  setUp(() {
    mockLocal = MockReadinessLocalDatasource();
    mockRemote = MockReadinessRemoteDatasource();
    repository = ReadinessRepositoryImpl(
      localDatasource: mockLocal,
      remoteDatasource: mockRemote,
    );

    registerFallbackValue(const DailyReadinessRecordModel(
      date: '',
      componentScores: [],
      reasons: [],
    ));
    registerFallbackValue(const ReadinessBaselineModel(lastUpdated: ''));
    registerFallbackValue(const AdaptedWorkoutModel(
      id: '',
      originalWorkoutId: '',
      date: '',
      originalType: '',
      adaptedType: '',
      adaptationType: '',
      originalTargetDistance: 0,
      originalTargetDuration: 0,
      originalTargetPace: 0,
      reason: '',
      readinessScore: 0,
      readinessState: '',
      isAccepted: false,
      createdAt: '',
    ));
    registerFallbackValue(const WeeklyReconciliationRecordModel(
      weekStartDate: '',
      createdAt: '',
    ));
  });

  group('ReadinessRepositoryImpl', () {
    group('getDailyRecord', () {
      test('returns null when local has no record', () async {
        when(() => mockLocal.getDailyRecord('2024-06-15'))
            .thenAnswer((_) async => null);

        final result = await repository.getDailyRecord(testDate);
        expect(result, isNull);
      });

      test('returns domain entity from local', () async {
        when(() => mockLocal.getDailyRecord('2024-06-15'))
            .thenAnswer((_) async => testDailyModel);

        final result = await repository.getDailyRecord(testDate);
        expect(result, isNotNull);
        expect(result!.compositeScore, 75.0);
      });
    });

    group('saveDailyRecord', () {
      test('saves to local and remote; updates syncedAt on success',
          () async {
        when(() => mockLocal.upsertDailyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertDailyRecord(any()))
            .thenAnswer((_) async => testDailyModel);

        final result =
            await repository.saveDailyRecord(testDailyEntity);

        expect(result.compositeScore, 75.0);
        verify(() => mockLocal.upsertDailyRecord(any())).called(2);
        verify(() => mockRemote.upsertDailyRecord(any())).called(1);
        verifyNever(() => mockLocal.enqueueSync(
            entityType: any(named: 'entityType'),
            localId: any(named: 'localId'),
            payload: any(named: 'payload')));
      });

      test('saves to local and enqueues sync on remote failure',
          () async {
        when(() => mockLocal.upsertDailyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertDailyRecord(any()))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));
        when(() => mockLocal.enqueueSync(
              entityType: any(named: 'entityType'),
              localId: any(named: 'localId'),
              payload: any(named: 'payload'),
            )).thenAnswer((_) async {});

        final result =
            await repository.saveDailyRecord(testDailyEntity);

        expect(result.compositeScore, 75.0);
        verify(() => mockLocal.enqueueSync(
              entityType: 'readiness_daily_record',
              localId: '2024-06-15',
              payload: any(named: 'payload'),
            )).called(1);
      });
    });

    group('updateOverride', () {
      test('updates local and remote', () async {
        final override = ReadinessOverride(
          state: OverrideState.harder,
          overriddenAt: DateTime(2024, 6, 15),
        );

        when(() => mockLocal.getDailyRecord('2024-06-15'))
            .thenAnswer((_) async => testDailyModel);
        when(() => mockLocal.upsertDailyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.patchOverride(any(), any()))
            .thenAnswer((_) async => testDailyModel);

        final result =
            await repository.updateOverride(testDate, override);

        expect(result.compositeScore, 75.0);
        verify(() => mockRemote.patchOverride('2024-06-15', any()))
            .called(1);
      });

      test('enqueues sync on remote failure', () async {
        final override = ReadinessOverride(
          state: OverrideState.harder,
          overriddenAt: DateTime(2024, 6, 15),
        );

        when(() => mockLocal.getDailyRecord('2024-06-15'))
            .thenAnswer((_) async => testDailyModel);
        when(() => mockLocal.upsertDailyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.patchOverride(any(), any()))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));
        when(() => mockLocal.enqueueSync(
              entityType: any(named: 'entityType'),
              localId: any(named: 'localId'),
              payload: any(named: 'payload'),
            )).thenAnswer((_) async {});

        await repository.updateOverride(testDate, override);

        verify(() => mockLocal.enqueueSync(
              entityType: 'readiness_daily_record',
              localId: '2024-06-15',
              payload: any(named: 'payload'),
            )).called(1);
      });
    });

    group('getHistory', () {
      test('returns domain entities from local range', () async {
        when(() => mockLocal.getHistory('2024-06-10', '2024-06-15'))
            .thenAnswer((_) async => [testDailyModel]);

        final result = await repository.getHistory(
          DateTime(2024, 6, 10),
          DateTime(2024, 6, 15),
        );

        expect(result.length, 1);
        expect(result.first.compositeScore, 75.0);
      });
    });

    group('getBaseline', () {
      test('returns null when no baseline', () async {
        when(() => mockLocal.getBaseline()).thenAnswer((_) async => null);

        final result = await repository.getBaseline();
        expect(result, isNull);
      });

      test('returns baseline from local', () async {
        when(() => mockLocal.getBaseline())
            .thenAnswer((_) async => testBaselineModel);

        final result = await repository.getBaseline();
        expect(result, isNotNull);
        expect(result!.rhrMedian30Day, 52.0);
      });
    });

    group('saveBaseline', () {
      test('saves to local and remote', () async {
        when(() => mockLocal.upsertBaseline(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertBaseline(any()))
            .thenAnswer((_) async => testBaselineModel);

        final result = await repository.saveBaseline(testBaselineEntity);

        expect(result.rhrMedian30Day, 52.0);
        verify(() => mockRemote.upsertBaseline(any())).called(1);
      });

      test('enqueues sync on remote failure', () async {
        when(() => mockLocal.upsertBaseline(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertBaseline(any())).thenThrow(
            DioException(
                requestOptions: RequestOptions(path: ''),
                type: DioExceptionType.connectionError));
        when(() => mockLocal.enqueueSync(
              entityType: any(named: 'entityType'),
              localId: any(named: 'localId'),
              payload: any(named: 'payload'),
            )).thenAnswer((_) async {});

        await repository.saveBaseline(testBaselineEntity);

        verify(() => mockLocal.enqueueSync(
              entityType: 'readiness_baseline',
              localId: 'baseline',
              payload: any(named: 'payload'),
            )).called(1);
      });
    });

    group('getAdaptedWorkout', () {
      test('returns null when not found', () async {
        when(() => mockLocal.getAdaptedWorkout('w1'))
            .thenAnswer((_) async => null);

        final result = await repository.getAdaptedWorkout('w1');
        expect(result, isNull);
      });

      test('returns entity from local', () async {
        when(() => mockLocal.getAdaptedWorkout('w1'))
            .thenAnswer((_) async => testAdaptedModel);

        final result = await repository.getAdaptedWorkout('w1');
        expect(result, isNotNull);
        expect(result!.id, 'aw1');
      });
    });

    group('saveAdaptedWorkout', () {
      test('saves to local and remote', () async {
        when(() => mockLocal.upsertAdaptedWorkout(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertAdaptedWorkout(any()))
            .thenAnswer((_) async => testAdaptedModel);

        final result =
            await repository.saveAdaptedWorkout(testAdaptedEntity);

        expect(result.id, 'aw1');
        verify(() => mockRemote.upsertAdaptedWorkout(any())).called(1);
      });

      test('enqueues sync on remote failure', () async {
        when(() => mockLocal.upsertAdaptedWorkout(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertAdaptedWorkout(any())).thenThrow(
            DioException(
                requestOptions: RequestOptions(path: ''),
                type: DioExceptionType.connectionError));
        when(() => mockLocal.enqueueSync(
              entityType: any(named: 'entityType'),
              localId: any(named: 'localId'),
              payload: any(named: 'payload'),
            )).thenAnswer((_) async {});

        await repository.saveAdaptedWorkout(testAdaptedEntity);

        verify(() => mockLocal.enqueueSync(
              entityType: 'adapted_workout',
              localId: 'aw1',
              payload: any(named: 'payload'),
            )).called(1);
      });
    });

    group('getWeeklyRecord', () {
      test('returns null when not found', () async {
        when(() => mockLocal.getWeeklyRecord('2024-06-10'))
            .thenAnswer((_) async => null);

        final result =
            await repository.getWeeklyRecord(DateTime(2024, 6, 10));
        expect(result, isNull);
      });

      test('returns entity from local', () async {
        when(() => mockLocal.getWeeklyRecord('2024-06-10'))
            .thenAnswer((_) async => testWeeklyModel);

        final result =
            await repository.getWeeklyRecord(DateTime(2024, 6, 10));
        expect(result, isNotNull);
        expect(result!.plannedLoad, 300.0);
      });
    });

    group('saveWeeklyRecord', () {
      test('saves to local and remote', () async {
        when(() => mockLocal.upsertWeeklyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertWeeklyRecord(any()))
            .thenAnswer((_) async => testWeeklyModel);

        final result =
            await repository.saveWeeklyRecord(testWeeklyEntity);

        expect(result.plannedLoad, 300.0);
        verify(() => mockRemote.upsertWeeklyRecord(any())).called(1);
      });

      test('enqueues sync on remote failure', () async {
        when(() => mockLocal.upsertWeeklyRecord(any()))
            .thenAnswer((_) async {});
        when(() => mockRemote.upsertWeeklyRecord(any())).thenThrow(
            DioException(
                requestOptions: RequestOptions(path: ''),
                type: DioExceptionType.connectionError));
        when(() => mockLocal.enqueueSync(
              entityType: any(named: 'entityType'),
              localId: any(named: 'localId'),
              payload: any(named: 'payload'),
            )).thenAnswer((_) async {});

        await repository.saveWeeklyRecord(testWeeklyEntity);

        verify(() => mockLocal.enqueueSync(
              entityType: 'weekly_reconciliation',
              localId: '2024-06-10',
              payload: any(named: 'payload'),
            )).called(1);
      });
    });

    group('syncPendingRecords', () {
      test('does nothing when no pending items', () async {
        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => []);

        await repository.syncPendingRecords();

        verifyNever(() => mockLocal.markSyncCompleted(any()));
        verifyNever(() => mockLocal.incrementSyncRetry(any()));
      });

      test('syncs pending daily record and marks completed', () async {
        const item = SyncQueueItem(
          id: 1,
          entityType: 'readiness_daily_record',
          localId: '2024-06-15',
          payloadJson:
              '{"date":"2024-06-15","compositeScore":75.0,"state":"good","confidence":"full","componentScores":[],"reasons":[]}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockRemote.upsertDailyRecord(any()))
            .thenAnswer((_) async => testDailyModel);
        when(() => mockLocal.markSyncCompleted(1))
            .thenAnswer((_) async {});

        await repository.syncPendingRecords();

        verify(() => mockRemote.upsertDailyRecord(any())).called(1);
        verify(() => mockLocal.markSyncCompleted(1)).called(1);
      });

      test('increments retry on sync failure', () async {
        const item = SyncQueueItem(
          id: 2,
          entityType: 'readiness_baseline',
          localId: 'baseline',
          payloadJson:
              '{"rhrMedian30Day":52.0,"sleepAverage28Day":7.5,"lastUpdated":"2024-06-15T00:00:00.000Z"}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockRemote.upsertBaseline(any())).thenThrow(Exception());
        when(() => mockLocal.incrementSyncRetry(2))
            .thenAnswer((_) async {});

        await repository.syncPendingRecords();

        verify(() => mockLocal.incrementSyncRetry(2)).called(1);
        verifyNever(() => mockLocal.markSyncCompleted(2));
      });

      test('skips items at max retries', () async {
        const item = SyncQueueItem(
          id: 3,
          entityType: 'readiness_daily_record',
          localId: '2024-06-15',
          payloadJson: '{}',
          retryCount: 5,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockLocal.markSyncCompleted(3))
            .thenAnswer((_) async {});

        await repository.syncPendingRecords();

        verifyNever(() => mockRemote.upsertDailyRecord(any()));
        verify(() => mockLocal.markSyncCompleted(3)).called(1);
      });

      test('syncs adapted workout entity type', () async {
        const item = SyncQueueItem(
          id: 4,
          entityType: 'adapted_workout',
          localId: 'aw1',
          payloadJson:
              '{"id":"aw1","originalWorkoutId":"w1","date":"2024-06-15","originalType":"interval","adaptedType":"easy","adaptationType":"volumeReduction","originalTargetDistance":8000.0,"originalTargetDuration":3600,"originalTargetPace":300.0,"reason":"Reduced readiness","readinessScore":45.0,"readinessState":"reduced","isAccepted":true,"createdAt":"2024-06-15T08:00:00.000Z"}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockRemote.upsertAdaptedWorkout(any()))
            .thenAnswer((_) async => testAdaptedModel);
        when(() => mockLocal.markSyncCompleted(4))
            .thenAnswer((_) async {});

        await repository.syncPendingRecords();

        verify(() => mockRemote.upsertAdaptedWorkout(any())).called(1);
        verify(() => mockLocal.markSyncCompleted(4)).called(1);
      });

      test('syncs weekly reconciliation entity type', () async {
        const item = SyncQueueItem(
          id: 5,
          entityType: 'weekly_reconciliation',
          localId: '2024-06-10',
          payloadJson:
              '{"weekStartDate":"2024-06-10","plannedLoad":300.0,"actualLoad":250.0,"adaptedLoad":260.0,"deficitPercent":16.7,"surplusPercent":0.0,"isApplied":false,"requiresReview":false,"createdAt":"2024-06-16T00:00:00.000Z"}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockRemote.upsertWeeklyRecord(any()))
            .thenAnswer((_) async => testWeeklyModel);
        when(() => mockLocal.markSyncCompleted(5))
            .thenAnswer((_) async {});

        await repository.syncPendingRecords();

        verify(() => mockRemote.upsertWeeklyRecord(any())).called(1);
        verify(() => mockLocal.markSyncCompleted(5)).called(1);
      });
    });
  });
}
