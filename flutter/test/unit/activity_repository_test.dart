import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart' as data;
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/data/repositories/activity_repository_impl.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late ActivityRepositoryImpl repository;

  final testActivity = data.Activity(
    id: 'act1',
    stravaId: '12345',
    type: data.ActivityType.run,
    name: 'Morning Run',
    startDate: DateTime(2024, 6, 15, 7, 30),
    distance: 8500.0,
    movingTime: 2700,
    averageSpeed: 3.15,
    averageHr: 145.0,
    maxHr: 175,
    averageCadence: 180.0,
    hasHeartrate: true,
    totalElevation: 120.0,
    trimp: 85.0,
    runningTss: 75.0,
    estimatedVdot: 51.2,
    trainingType: 'EASY',
  );

  final Map<String, dynamic> testResponse = <String, dynamic>{
    'activities': <Map<String, dynamic>>[testActivity.toJson()],
    'total': 1,
    'limit': 50,
    'offset': 0,
    'hasMore': false,
  };

  setUp(() {
    mockDio = MockDio();
    repository = ActivityRepositoryImpl(dio: mockDio);
  });

  group('ActivityRepositoryImpl', () {
    group('listActivities', () {
      test('success - returns parsed ActivitiesResponse', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testResponse,
                ));

        final result = await repository.listActivities();

        expect(result.activities.length, 1);
        expect(result.activities.first.id, 'act1');
        expect(result.total, 1);
      });

      test('success - sends limit and offset params', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testResponse,
                ));

        await repository.listActivities(limit: 10, offset: 20);

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, dynamic>;

        expect(captured['limit'], 10);
        expect(captured['offset'], 20);
      });

      test('success - sends type filter when provided', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testResponse,
                ));

        await repository.listActivities(type: ActivityType.run);

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, dynamic>;

        expect(captured['type'], 'RUN');
      });

      test('success - does not send type when null', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testResponse,
                ));

        await repository.listActivities();

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, dynamic>;

        expect(captured.containsKey('type'), false);
      });

      test('pagination - returns hasMore correctly', () async {
        final Map<String, dynamic> multiResponse = <String, dynamic>{
          'activities': <Map<String, dynamic>>[testActivity.toJson()],
          'total': 100,
          'limit': 50,
          'offset': 0,
          'hasMore': true,
        };
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: multiResponse,
                ));

        final result = await repository.listActivities();
        expect(result.hasMore, true);
        expect(result.total, 100);
      });
    });

    group('getActivity', () {
      test('success - returns parsed Activity from envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'activity': testActivity.toJson()},
            ));

        final result = await repository.getActivity('act1');
        expect(result.id, 'act1');
        expect(result.type, ActivityType.run);
        expect(result.distance, 8500.0);
      });

      test('success - returns Activity from flat response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: testActivity.toJson(),
            ));

        final result = await repository.getActivity('act1');
        expect(result.id, 'act1');
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.getActivity('act1'),
          throwsA(isA<ServerException>()),
        );
      });

      test('failure - re-throws wrapped AppException', () async {
        const ServerException appException =
            ServerException(message: 'custom');
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          error: appException,
        ));

        expect(
          () => repository.getActivity('act1'),
          throwsA(same(appException)),
        );
      });
    });
  });
}
