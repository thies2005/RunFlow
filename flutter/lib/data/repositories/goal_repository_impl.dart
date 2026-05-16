import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/constants/cache_keys.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';

class GoalRepositoryImpl implements GoalRepository {
  GoalRepositoryImpl({required this.dio, required this.cacheDatasource});

  final Dio dio;
  final CacheDatasource cacheDatasource;

  @override
  Future<domain.GoalsResponse> listGoals() async {
    return _cacheFirst<domain.GoalsResponse>(
      cacheKey: CacheKeys.goals,
      fetch: _fetchGoalsFromApi,
      decode: (json) => GoalsResponse.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      ).toDomain(),
      encode: (resp) => jsonEncode(resp.toData().toJson()),
      maxAge: const Duration(minutes: 15),
    );
  }

  Future<domain.GoalsResponse> _fetchGoalsFromApi() async {
    final response = await dio.get(ApiConstants.plansUrl);
    return GoalsResponse.fromJson(
      response.data as Map<String, dynamic>,
    ).toDomain();
  }

  @override
  Future<domain.Goal> createGoal(domain.CreateGoalRequest request) async {
    try {
      final response = await dio.post(
        ApiConstants.plansUrl,
        data: request.toData().toJson(),
      );
      await cacheDatasource.remove(CacheKeys.goals);
      return Goal.fromJson(
        unwrapPayload(
          Map<String, dynamic>.from(response.data as Map),
          const ['goal'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      final data = e.response?.data;
      String message = 'Failed to create goal.';
      if (data is Map<String, dynamic>) {
        final error = data['error'];
        final details = data['details'];
        if (error is String && error.isNotEmpty) {
          message = error;
          if (details != null) {
            message = '$error: $details';
          }
        }
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: message,
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Goal> getGoal(String id) async {
    return _cacheFirst<domain.Goal>(
      cacheKey: '${CacheKeys.goalPrefix}$id',
      fetch: () => _fetchGoalFromApi(id),
      decode: (json) => Goal.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      ).toDomain(),
      encode: (goal) => jsonEncode(goal.toData().toJson()),
      maxAge: const Duration(minutes: 15),
    );
  }

  Future<domain.Goal> _fetchGoalFromApi(String id) async {
    final response = await dio.get(ApiConstants.planUrl(id));
    return Goal.fromJson(
      unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['goal'],
      ),
    ).toDomain();
  }

  @override
  Future<domain.Goal> updateGoal(String id, domain.UpdateGoalRequest request) async {
    try {
      final response = await dio.put(
        ApiConstants.planUrl(id),
        data: request.toData().toJson(),
      );
      await cacheDatasource.remove(CacheKeys.goals);
      await cacheDatasource.remove('${CacheKeys.goalPrefix}$id');
      return Goal.fromJson(
        unwrapPayload(
          Map<String, dynamic>.from(response.data as Map),
          const ['goal'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<bool> deleteGoal(String id) async {
    try {
      final response = await dio.delete(ApiConstants.planUrl(id));
      final data = response.data as Map<String, dynamic>;
      await cacheDatasource.remove(CacheKeys.goals);
      await cacheDatasource.remove('${CacheKeys.goalPrefix}$id');
      return data['success'] as bool? ?? true;
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to delete goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.WorkoutsResponse> listWorkouts({
    String? goalId,
    DateTime? weekStart,
    DateTime? weekEnd,
  }) async {
    try {
      final queryParameters = <String, String>{};
      if (goalId != null) queryParameters['goalId'] = goalId;
      if (weekStart != null) {
        queryParameters['weekStart'] = weekStart.toUtc().toIso8601String();
      }
      if (weekEnd != null) {
        queryParameters['weekEnd'] = weekEnd.toUtc().toIso8601String();
      }

      final response = await dio.get(
        ApiConstants.workoutsPath,
        queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
      );
      return WorkoutsResponse.fromJson(
        response.data as Map<String, dynamic>,
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load workouts.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Workout> updateWorkout(String id, domain.UpdateWorkoutRequest request) async {
    try {
      final response = await dio.patch(
        '${ApiConstants.workoutsPath}/$id',
        data: request.toData().toJson(),
      );
      return Workout.fromJson(
        response.data as Map<String, dynamic>,
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update workout.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> reorderWorkout(String workoutId, DateTime newDate) async {
    try {
      await dio.patch(
        ApiConstants.workoutReorderPath,
        data: {
          'workoutId': workoutId,
          'newDate': newDate.toIso8601String(),
        },
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to reorder workout.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.SubGoal> createSubGoal(
    String goalId, {
    required String name,
    String? raceType,
    DateTime? raceDate,
    String? priority,
    String? sport,
    int? targetTime,
    bool generateWorkouts = false,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.subGoalsUrl(goalId),
        data: {
          'name': name,
          'raceType': ?raceType,
          'raceDate': ?raceDate?.toIso8601String(),
          'priority': ?priority,
          'sport': ?sport,
          'targetTime': ?targetTime,
          'generateWorkouts': generateWorkouts,
        },
      );
      await cacheDatasource.remove(CacheKeys.goals);
      await cacheDatasource.remove('${CacheKeys.goalPrefix}$goalId');
      final data = response.data as Map<String, dynamic>;
      final subGoalData = data['subGoal'] as Map<String, dynamic>;
      return SubGoal.fromJson(subGoalData).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create sub goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> deleteSubGoal(String goalId, String subGoalId) async {
    try {
      await dio.delete(
        '${ApiConstants.subGoalsUrl(goalId)}/$subGoalId',
      );
      await cacheDatasource.remove(CacheKeys.goals);
      await cacheDatasource.remove('${CacheKeys.goalPrefix}$goalId');
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to delete sub goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<T> _cacheFirst<T>({
    required String cacheKey,
    required Future<T> Function() fetch,
    required T Function(String) decode,
    required String Function(T) encode,
    Duration maxAge = const Duration(minutes: 15),
  }) async {
    final cached = await cacheDatasource.get(cacheKey);
    if (cached != null && !cacheDatasource.isExpired(cached, maxAge)) {
      unawaited(_refreshInBackground(cacheKey, fetch, encode));
      return decode(cached.data);
    }

    try {
      final result = await fetch();
      await cacheDatasource.set(cacheKey, encode(result));
      return result;
    } on DioException catch (_) {
      if (cached != null) return decode(cached.data);
      rethrow;
    }
  }

  Future<void> _refreshInBackground<T>(
    String key,
    Future<T> Function() fetch,
    String Function(T) encode,
  ) async {
    try {
      final result = await fetch();
      await cacheDatasource.set(key, encode(result));
    } catch (_) {}
  }
}
