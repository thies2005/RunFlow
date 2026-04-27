import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/repositories/analytics_repository_impl.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late AnalyticsRepositoryImpl repository;

  setUp(() {
    mockDio = MockDio();
    repository = AnalyticsRepositoryImpl(dio: mockDio);
  });

  group('AnalyticsRepositoryImpl', () {
    group('getStats', () {
      test('success - returns AnalyticsStats from envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'analyticsStats': {
                  'currentWeekMileage': 42.5,
                  'effectiveVO2max': 48.0,
                  'rawVO2max': 47.0,
                  'vdotCorrectionFactor': 1.02,
                  'marathonShape': 78.5,
                  'currentVdot': 48.0,
                  'ctl': 45.0,
                  'atl': 35.0,
                  'tsb': 10.0,
                  'workloadRatio': 1.28,
                  'easyTrimp': 120.0,
                  'hrMax': 185,
                },
              },
            ));

        final result = await repository.getStats();
        expect(result.currentWeekMileage, 42.5);
        expect(result.effectiveVO2max, 48.0);
        expect(result.marathonShape, 78.5);
        expect(result.hrMax, 185);
      });

      test('success - returns AnalyticsStats from stats envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'stats': {
                  'currentWeekMileage': 30.0,
                  'effectiveVO2max': 50.0,
                  'rawVO2max': 49.0,
                  'vdotCorrectionFactor': 1.0,
                  'marathonShape': 60.0,
                  'currentVdot': 50.0,
                  'ctl': 40.0,
                  'atl': 30.0,
                  'tsb': 10.0,
                  'workloadRatio': 1.33,
                  'easyTrimp': 100.0,
                  'hrMax': 180,
                },
              },
            ));

        final result = await repository.getStats();
        expect(result.currentWeekMileage, 30.0);
        expect(result.hrMax, 180);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.getStats(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getHistory', () {
      test('success - returns FitnessHistory list from array response', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {
                    'ctl': [
                      {'date': '2024-06-15', 'value': 45.0},
                      {'date': '2024-06-14', 'value': 44.0},
                    ],
                    'atl': [
                      {'date': '2024-06-15', 'value': 35.0},
                      {'date': '2024-06-14', 'value': 34.0},
                    ],
                    'tsb': [
                      {'date': '2024-06-15', 'value': 10.0},
                      {'date': '2024-06-14', 'value': 10.0},
                    ],
                  },
                ));

        final result = await repository.getHistory(
          startDate: DateTime(2024, 6, 14),
          endDate: DateTime(2024, 6, 15),
        );

        expect(result.length, 2);
        expect(result.first.metrics.ctl, 45.0);
        expect(result.last.metrics.atl, 34.0);
      });

      test('success - sends startDate and endDate query params', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: [],
                ));

        final start = DateTime(2024, 6, 1);
        final end = DateTime(2024, 6, 30);
        await repository.getHistory(startDate: start, endDate: end);

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, dynamic>;

        expect(captured.containsKey('startDate'), true);
        expect(captured.containsKey('endDate'), true);
      });

      test('success - handles empty list response', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: [],
                ));

        final result = await repository.getHistory(
          startDate: DateTime(2024, 1, 1),
          endDate: DateTime(2024, 1, 31),
        );

        expect(result, isEmpty);
      });

      test('success - handles map response with fitnessHistory key', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {
                    'ctl': [
                      {'date': '2024-06-15', 'value': 45.0},
                    ],
                    'atl': [
                      {'date': '2024-06-15', 'value': 35.0},
                    ],
                    'tsb': [
                      {'date': '2024-06-15', 'value': 10.0},
                    ],
                  },
                ));

        final result = await repository.getHistory(
          startDate: DateTime(2024, 6, 1),
          endDate: DateTime(2024, 6, 30),
        );

        expect(result.length, 1);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.getHistory(
            startDate: DateTime(2024, 1, 1),
            endDate: DateTime(2024, 1, 31),
          ),
          throwsA(isA<ServerException>()),
        );
      });
    });
  });
}
