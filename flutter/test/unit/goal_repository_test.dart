import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart' as data;
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/data/repositories/goal_repository_impl.dart';

import '../helpers/fake_cache_datasource.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late FakeCacheDatasource fakeCacheDs;
  late GoalRepositoryImpl repository;

  final testGoal = data.Goal(
    id: 'goal-1',
    userId: 'user-1',
    name: 'Marathon PR',
    raceType: data.RaceType.marathon,
    raceDate: DateTime(2024, 10, 15),
    targetTime: 10800,
    weeklyMileageGoal: 60.0,
    planWeeks: 16,
    runsPerWeek: 5,
    longRunDay: 6,
    workoutDay: 3,
    currentVdot: 48.5,
    predictedTime: 10500,
    isActive: true,
    createdAt: DateTime(2024, 6, 15),
    updatedAt: DateTime(2024, 6, 15),
    completedAt: null,
    workouts: [],
  );

  setUp(() {
    mockDio = MockDio();
    fakeCacheDs = FakeCacheDatasource();
    repository = GoalRepositoryImpl(dio: mockDio, cacheDatasource: fakeCacheDs);
  });

  group('GoalRepositoryImpl', () {
    group('listGoals', () {
      test('success - returns GoalsResponse', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'goals': [testGoal.toJson()]},
            ));

        final result = await repository.listGoals();
        expect(result.goals.length, 1);
        expect(result.goals.first.id, 'goal-1');
        expect(result.goals.first.raceType, RaceType.marathon);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.listGoals(),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('createGoal', () {
      test('success - sends request and returns created Goal', () async {
        final request = CreateGoalRequest(
          name: '5K Race',
          raceType: RaceType.fiveK,
          raceDate: DateTime(2024, 12, 1),
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 201,
                  data: {'goal': testGoal.toJson()},
                ));

        final result = await repository.createGoal(request);
        expect(result.id, 'goal-1');
        verify(() => mockDio.post(any(), data: any(named: 'data'))).called(1);
      });

      test('failure - throws ServerException', () async {
        final request = CreateGoalRequest(
          name: '5K',
          raceType: RaceType.fiveK,
          raceDate: DateTime(2024, 12, 1),
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              response: Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 500,
              ),
              type: DioExceptionType.badResponse,
            ));

        expect(
          () => repository.createGoal(request),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getGoal', () {
      test('success - returns Goal from envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'goal': testGoal.toJson()},
            ));

        final result = await repository.getGoal('goal-1');
        expect(result.id, 'goal-1');
        expect(result.name, 'Marathon PR');
      });

      test('success - returns Goal from flat response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: testGoal.toJson(),
            ));

        final result = await repository.getGoal('goal-1');
        expect(result.id, 'goal-1');
      });

      test('failure - throws ServerException on 404', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 404,
          ),
          type: DioExceptionType.badResponse,
        ));

        expect(
          () => repository.getGoal('nonexistent'),
          throwsA(isA<DioException>()),
        );
      });
    });

    group('updateGoal', () {
      test('success - sends PUT and returns updated Goal', () async {
        const UpdateGoalRequest request = UpdateGoalRequest(
          name: 'Updated Goal',
          targetTime: 10200,
          isActive: true,
        );

        final updatedGoal = testGoal.copyWith(
          name: 'Updated Goal',
          targetTime: 10200,
        );

        when(() => mockDio.put(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'goal': updatedGoal.toJson()},
                ));

        final result = await repository.updateGoal('goal-1', request);
        expect(result.name, 'Updated Goal');
        expect(result.targetTime, 10200);
      });

      test('failure - throws ServerException', () async {
        const UpdateGoalRequest request = UpdateGoalRequest(name: 'X');
        when(() => mockDio.put(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.updateGoal('goal-1', request),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('deleteGoal', () {
      test('success - returns true when success field is true', () async {
        when(() => mockDio.delete(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'success': true},
            ));

        final result = await repository.deleteGoal('goal-1');
        expect(result, true);
      });

      test('success - returns true when success field is missing', () async {
        when(() => mockDio.delete(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: <String, dynamic>{},
            ));

        final result = await repository.deleteGoal('goal-1');
        expect(result, true);
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.delete(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.deleteGoal('goal-1'),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('listWorkouts', () {
      test('success - returns WorkoutsResponse', () async {
        final workout = data.Workout(
          id: 'w1',
          goalId: 'goal-1',
          scheduledDate: DateTime(2024, 6, 16),
          workoutType: data.WorkoutType.long,
          description: 'Long Run',
          targetDistance: 18000.0,
          targetPace: 360.0,
          targetDuration: 6480,
          isCompleted: false,
          completedAt: null,
          activityId: null,
        );

        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'workouts': [workout.toJson()]},
                ));

        final result = await repository.listWorkouts(goalId: 'goal-1');
        expect(result.workouts.length, 1);
        expect(result.workouts.first.id, 'w1');
      });

      test('success - sends date range parameters', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'workouts': []},
                ));

        final start = DateTime(2024, 6, 10);
        final end = DateTime(2024, 6, 16);
        await repository.listWorkouts(weekStart: start, weekEnd: end);

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, String>;

        expect(captured.containsKey('weekStart'), true);
        expect(captured.containsKey('weekEnd'), true);
      });

      test('success - no query params when filters are null', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'workouts': []},
                ));

        await repository.listWorkouts();

        verify(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).called(1);
      });
    });

    group('updateWorkout', () {
      test('success - sends UpdateWorkoutRequest and returns Workout', () async {
        final workout = data.Workout(
          id: 'w1',
          goalId: 'goal-1',
          scheduledDate: DateTime(2024, 6, 16),
          workoutType: data.WorkoutType.long,
          description: 'Long Run',
          targetDistance: 18000.0,
          targetPace: 360.0,
          targetDuration: 6480,
          isCompleted: true,
          completedAt: DateTime(2024, 6, 16, 8, 0),
          activityId: null,
        );

        when(() => mockDio.patch(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: workout.toJson(),
                ));

        final result = await repository.updateWorkout(
          'w1',
          const UpdateWorkoutRequest(isCompleted: true),
        );
        expect(result.isCompleted, true);
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.patch(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.updateWorkout(
            'w1',
            const UpdateWorkoutRequest(isCompleted: true),
          ),
          throwsA(isA<ServerException>()),
        );
      });
    });
  });
}
