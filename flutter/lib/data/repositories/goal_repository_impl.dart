import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';

class GoalRepositoryImpl implements GoalRepository {
  GoalRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<domain.GoalsResponse> listGoals() async {
    try {
      final response = await dio.get(ApiConstants.goalsPath);
      return GoalsResponse.fromJson(
        response.data as Map<String, dynamic>,
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load goals.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Goal> createGoal(domain.CreateGoalRequest request) async {
    try {
      final response = await dio.post(
        ApiConstants.goalsPath,
        data: request.toData().toJson(),
      );
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
              message: 'Failed to create goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Goal> getGoal(String id) async {
    try {
      final response = await dio.get('${ApiConstants.goalsPath}/$id');
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
              message: 'Failed to load goal.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Goal> updateGoal(String id, domain.UpdateGoalRequest request) async {
    try {
      final response = await dio.put(
        '${ApiConstants.goalsPath}/$id',
        data: request.toData().toJson(),
      );
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
      final response = await dio.delete('${ApiConstants.goalsPath}/$id');
      final data = response.data as Map<String, dynamic>;
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
}
