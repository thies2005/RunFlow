import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';

class GoalRepositoryImpl implements GoalRepository {
  GoalRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<GoalsResponse> listGoals() async {
    try {
      final response = await dio.get(ApiConstants.goalsPath);
      return GoalsResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
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
  Future<Goal> createGoal(CreateGoalRequest request) async {
    try {
      final response = await dio.post(
        ApiConstants.goalsPath,
        data: request.toJson(),
      );
      return Goal.fromJson(
        unwrapPayload(
          Map<String, dynamic>.from(response.data as Map),
          const ['goal'],
        ),
      );
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
  Future<Goal> getGoal(String id) async {
    try {
      final response = await dio.get('${ApiConstants.goalsPath}/$id');
      return Goal.fromJson(
        unwrapPayload(
          Map<String, dynamic>.from(response.data as Map),
          const ['goal'],
        ),
      );
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
  Future<Goal> updateGoal(String id, UpdateGoalRequest request) async {
    try {
      final response = await dio.put(
        '${ApiConstants.goalsPath}/$id',
        data: request.toJson(),
      );
      return Goal.fromJson(
        unwrapPayload(
          Map<String, dynamic>.from(response.data as Map),
          const ['goal'],
        ),
      );
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
  Future<WorkoutsResponse> listWorkouts({
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
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load workouts.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
