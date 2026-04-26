import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/repositories/dashboard_repository_impl.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late AppDatabase database;
  late DashboardRepositoryImpl repository;

  final Map<String, dynamic> testDashboard = <String, dynamic>{
    'stats': <String, dynamic>{
      'currentWeekMileage': 42.5,
      'effectiveVO2max': 52.3,
      'rawVO2max': 51.0,
      'vdotCorrectionFactor': 1.02,
      'marathonShape': 6.5,
      'currentVdot': 52.1,
      'ctl': 45.0,
      'atl': 30.0,
      'tsb': 15.0,
      'workloadRatio': 1.2,
      'easyTrimp': 100.0,
      'hrMax': 190,
    },
    'recentActivities': <Map<String, dynamic>>[],
    'goals': <Map<String, dynamic>>[],
    'syncStatus': <String, dynamic>{
      'syncInProgress': false,
      'lastSyncAt': '2024-06-15T00:00:00.000',
      'totalActivities': 42,
    },
    'user': <String, dynamic>{
      'id': 'u1',
      'email': 'test@test.com',
      'name': 'Test',
    },
  };

  setUp(() {
    mockDio = MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
    repository = DashboardRepositoryImpl(dio: mockDio, database: database);
  });

  Map<String, dynamic> dashboardJsonEnvelope() {
    return <String, dynamic>{
      'dashboard': testDashboard,
    };
  }

  Map<String, dynamic> dashboardJsonFlat() {
    return testDashboard;
  }

  tearDown(() async {
    await database.close();
  });

  group('DashboardRepositoryImpl', () {
    group('fetchDashboard', () {
      test('success - returns DashboardResponse and caches it', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: dashboardJsonEnvelope(),
            ));

        final result = await repository.fetchDashboard();
        expect(result.stats.marathonShape, 6.5);
        expect(result.stats.hrMax, 190);
        expect(result.user.id, 'u1');

        final cached = await database.cacheDao.getCachedDashboard();
        expect(cached, isNotNull);
        final cachedDashboard = DashboardResponse.fromJson(
          jsonDecode(cached!.jsonData) as Map<String, dynamic>,
        );
        expect(cachedDashboard.stats.marathonShape, 6.5);
      });

      test('success - parses flat response without envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: dashboardJsonFlat(),
            ));

        final result = await repository.fetchDashboard();
        expect(result.stats.marathonShape, 6.5);
      });

      test('offline fallback - returns cached dashboard on DioException', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: dashboardJsonFlat(),
            ));

        await repository.fetchDashboard();

        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        final result = await repository.fetchDashboard();
        expect(result.stats.marathonShape, 6.5);
      });

      test('failure - throws ServerException when no cache and DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.fetchDashboard(),
          throwsA(isA<ServerException>()),
        );
      });

      test('failure - re-throws wrapped AppException', () async {
        const ServerException appException =
            ServerException(message: 'custom error');
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          error: appException,
        ));

        expect(
          () => repository.fetchDashboard(),
          throwsA(same(appException)),
        );
      });
    });

    group('triggerSync', () {
      test('success - returns SyncResult from envelope', () async {
        when(() => mockDio.post(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'syncResult': {
                  'success': true,
                  'activitiesSynced': 5,
                  'lastSyncAt': '2024-06-15T12:00:00Z',
                },
              },
            ));

        final result = await repository.triggerSync();
        expect(result.success, true);
        expect(result.activitiesSynced, 5);
        expect(result.lastSyncAt, isNotNull);
      });

      test('success - returns SyncResult from sync envelope', () async {
        when(() => mockDio.post(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'sync': {
                  'success': true,
                  'activitiesSynced': 3,
                  'lastSyncAt': null,
                },
              },
            ));

        final result = await repository.triggerSync();
        expect(result.success, true);
        expect(result.activitiesSynced, 3);
        expect(result.lastSyncAt, isNull);
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.post(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.triggerSync(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getSyncStatus', () {
      test('success - returns SyncStatus', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'syncStatus': {
                  'syncInProgress': false,
                  'lastSyncAt': '2024-06-15T08:00:00Z',
                  'totalActivities': 100,
                },
              },
            ));

        final result = await repository.getSyncStatus();
        expect(result.syncInProgress, false);
        expect(result.totalActivities, 100);
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 500,
          ),
          type: DioExceptionType.badResponse,
        ));

        expect(
          () => repository.getSyncStatus(),
          throwsA(isA<ServerException>()),
        );
      });
    });
  });
}
