import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/remote/readiness_remote_datasource.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late ReadinessRemoteDatasource datasource;

  final testDailyRecord = DailyReadinessRecordModel(
    date: '2024-06-15',
    compositeScore: 75.0,
    state: 'good',
    confidence: 'full',
    componentScores: [],
    reasons: [],
  );

  final testBaseline = ReadinessBaselineModel(
    rhrMedian30Day: 52.0,
    sleepAverage28Day: 7.5,
    lastUpdated: '2024-06-15T00:00:00.000Z',
  );

  final testAdaptedWorkout = AdaptedWorkoutModel(
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

  final testWeeklyRecord = WeeklyReconciliationRecordModel(
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

  setUp(() {
    mockDio = MockDio();
    datasource = ReadinessRemoteDatasource(dio: mockDio);
  });

  group('ReadinessRemoteDatasource', () {
    group('upsertDailyRecord', () {
      test('success - posts to readiness daily path and returns model',
          () async {
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testDailyRecord.toJson(),
                ));

        final result =
            await datasource.upsertDailyRecord(testDailyRecord);

        expect(result.date, '2024-06-15');
        expect(result.compositeScore, 75.0);
        verify(() => mockDio.post(any(), data: any(named: 'data')))
            .called(1);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => datasource.upsertDailyRecord(testDailyRecord),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getDailyRecord', () {
      test('success - returns model when found', () async {
        when(() => mockDio.get(any(),
                queryParameters: any(named: 'queryParameters')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testDailyRecord.toJson(),
                ));

        final result =
            await datasource.getDailyRecord('2024-06-15');

        expect(result, isNotNull);
        expect(result!.date, '2024-06-15');
      });

      test('returns null on 404', () async {
        when(() => mockDio.get(any(),
                queryParameters: any(named: 'queryParameters')))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 404,
          ),
          type: DioExceptionType.badResponse,
        ));

        final result =
            await datasource.getDailyRecord('2024-06-15');
        expect(result, isNull);
      });
    });

    group('patchOverride', () {
      test('success - patches to readiness daily/[date]', () async {
        final overrideData = {
          'readinessOverride': {'state': 'harder', 'note': 'test'}
        };
        when(() => mockDio.patch(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testDailyRecord.toJson(),
                ));

        final result = await datasource.patchOverride(
            '2024-06-15', overrideData);

        expect(result.date, '2024-06-15');
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.patch(any(), data: any(named: 'data')))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => datasource.patchOverride('2024-06-15', {}),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getHistory', () {
      test('success - returns list of records', () async {
        when(() => mockDio.get(any(),
                queryParameters: any(named: 'queryParameters')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: [testDailyRecord.toJson()],
                ));

        final result =
            await datasource.getHistory('2024-06-10', '2024-06-15');

        expect(result.length, 1);
        expect(result.first.date, '2024-06-15');
      });

      test('returns empty list when response is not a list', () async {
        when(() => mockDio.get(any(),
                queryParameters: any(named: 'queryParameters')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: null,
                ));

        final result =
            await datasource.getHistory('2024-06-10', '2024-06-15');
        expect(result, isEmpty);
      });
    });

    group('upsertBaseline', () {
      test('success - puts to readiness baseline path', () async {
        when(() => mockDio.put(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testBaseline.toJson(),
                ));

        final result =
            await datasource.upsertBaseline(testBaseline);

        expect(result.rhrMedian30Day, 52.0);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.put(any(), data: any(named: 'data')))
            .thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => datasource.upsertBaseline(testBaseline),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getBaseline', () {
      test('success - returns baseline', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async =>
            Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 200,
                data: testBaseline.toJson()));

        final result = await datasource.getBaseline();

        expect(result, isNotNull);
        expect(result!.rhrMedian30Day, 52.0);
      });

      test('returns null on 404', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 404,
          ),
          type: DioExceptionType.badResponse,
        ));

        final result = await datasource.getBaseline();
        expect(result, isNull);
      });
    });

    group('upsertAdaptedWorkout', () {
      test('success - posts to adapted-workout endpoint', () async {
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testAdaptedWorkout.toJson(),
                ));

        final result =
            await datasource.upsertAdaptedWorkout(testAdaptedWorkout);

        expect(result.id, 'aw1');
        expect(result.adaptationType, 'volumeReduction');
      });
    });

    group('upsertWeeklyRecord', () {
      test('success - posts to weekly path', () async {
        when(() => mockDio.post(any(), data: any(named: 'data')))
            .thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testWeeklyRecord.toJson(),
                ));

        final result =
            await datasource.upsertWeeklyRecord(testWeeklyRecord);

        expect(result.weekStartDate, '2024-06-10');
        expect(result.plannedLoad, 300.0);
      });
    });

    group('getWeeklyRecord', () {
      test('success - returns weekly record', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async =>
            Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 200,
                data: testWeeklyRecord.toJson()));

        final result =
            await datasource.getWeeklyRecord('2024-06-10');

        expect(result, isNotNull);
        expect(result!.weekStartDate, '2024-06-10');
      });

      test('returns null on 404', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 404,
          ),
          type: DioExceptionType.badResponse,
        ));

        final result =
            await datasource.getWeeklyRecord('2024-06-10');
        expect(result, isNull);
      });
    });
  });
}
