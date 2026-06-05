import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/services/readiness_sync_service.dart';

class MockReadinessLocalDatasource extends Mock
    implements ReadinessLocalDatasource {}

class MockDio extends Mock implements Dio {}

void main() {
  late MockReadinessLocalDatasource mockLocal;
  late MockDio mockDio;
  late ReadinessSyncService service;

  setUp(() {
    mockLocal = MockReadinessLocalDatasource();
    mockDio = MockDio();
    service = ReadinessSyncService(
      localDatasource: mockLocal,
      dio: mockDio,
    );
  });

  group('ReadinessSyncService', () {
    group('flushPendingSync', () {
      test('returns 0 when no pending items', () async {
        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => []);

        final result = await service.flushPendingSync();
        expect(result, 0);
      });

      test('syncs readiness daily record and returns count', () async {
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
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {},
                ));
        when(() => mockLocal.markSyncCompleted(1))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 1);
        verify(() => mockLocal.markSyncCompleted(1)).called(1);
      });

      test('syncs baseline via PUT', () async {
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
        when(() => mockDio.put(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {},
                ));
        when(() => mockLocal.markSyncCompleted(2))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 1);
        verify(() => mockDio.put(any(), data: any(named: 'data'))).called(1);
      });

      test('syncs adapted workout via POST', () async {
        const item = SyncQueueItem(
          id: 3,
          entityType: 'adapted_workout',
          localId: 'aw1',
          payloadJson:
              '{"id":"aw1","originalWorkoutId":"w1","date":"2024-06-15","originalType":"interval","adaptedType":"easy","adaptationType":"volumeReduction","originalTargetDistance":8000.0,"originalTargetDuration":3600,"originalTargetPace":300.0,"reason":"Reduced readiness","readinessScore":45.0,"readinessState":"reduced","isAccepted":true,"createdAt":"2024-06-15T08:00:00.000Z"}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {},
                ));
        when(() => mockLocal.markSyncCompleted(3))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 1);
        verify(() => mockLocal.markSyncCompleted(3)).called(1);
      });

      test('syncs weekly reconciliation via POST', () async {
        const item = SyncQueueItem(
          id: 4,
          entityType: 'weekly_reconciliation',
          localId: '2024-06-10',
          payloadJson:
              '{"weekStartDate":"2024-06-10","plannedLoad":300.0,"actualLoad":250.0,"adaptedLoad":260.0,"deficitPercent":16.7,"surplusPercent":0.0,"isApplied":false,"requiresReview":false,"createdAt":"2024-06-16T00:00:00.000Z"}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {},
                ));
        when(() => mockLocal.markSyncCompleted(4))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 1);
        verify(() => mockLocal.markSyncCompleted(4)).called(1);
      });

      test('increments retry on sync failure', () async {
        const item = SyncQueueItem(
          id: 5,
          entityType: 'readiness_daily_record',
          localId: '2024-06-15',
          payloadJson:
              '{"date":"2024-06-15","compositeScore":75.0,"state":"good","confidence":"full","componentScores":[],"reasons":[]}',
          retryCount: 0,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenThrow(Exception('Network error'));
        when(() => mockLocal.incrementSyncRetry(5))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 0);
        verify(() => mockLocal.incrementSyncRetry(5)).called(1);
        verifyNever(() => mockLocal.markSyncCompleted(5));
      });

      test('removes items at max retries', () async {
        const item = SyncQueueItem(
          id: 6,
          entityType: 'readiness_daily_record',
          localId: '2024-06-15',
          payloadJson: '{}',
          retryCount: 5,
          maxRetries: 5,
        );

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => [item]);
        when(() => mockLocal.markSyncCompleted(6))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 0);
        verifyNever(() => mockDio.post(any(), data: any(named: 'data')));
        verify(() => mockLocal.markSyncCompleted(6)).called(1);
      });

      test('syncs multiple items and returns total count', () async {
        final items = [
          const SyncQueueItem(
            id: 10,
            entityType: 'readiness_daily_record',
            localId: '2024-06-14',
            payloadJson:
                '{"date":"2024-06-14","compositeScore":60.0,"state":"moderate","confidence":"partial","componentScores":[],"reasons":[]}',
            retryCount: 0,
            maxRetries: 5,
          ),
          const SyncQueueItem(
            id: 11,
            entityType: 'readiness_daily_record',
            localId: '2024-06-15',
            payloadJson:
                '{"date":"2024-06-15","compositeScore":75.0,"state":"good","confidence":"full","componentScores":[],"reasons":[]}',
            retryCount: 0,
            maxRetries: 5,
          ),
        ];

        when(() => mockLocal.getPendingReadinessSyncItems())
            .thenAnswer((_) async => items);
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {},
                ));
        when(() => mockLocal.markSyncCompleted(any()))
            .thenAnswer((_) async {});

        final result = await service.flushPendingSync();

        expect(result, 2);
        verify(() => mockLocal.markSyncCompleted(any())).called(2);
      });
    });
  });
}
