import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';

abstract class GoalRepository {
  Future<GoalsResponse> listGoals();

  Future<Goal> createGoal(CreateGoalRequest request);

  Future<Goal> getGoal(String id);

  Future<Goal> updateGoal(String id, UpdateGoalRequest request);

  Future<bool> deleteGoal(String id);

  Future<WorkoutsResponse> listWorkouts({
    String? goalId,
    DateTime? weekStart,
    DateTime? weekEnd,
  });
}
