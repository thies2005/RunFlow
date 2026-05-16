import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';

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

  Future<Workout> updateWorkout(String id, UpdateWorkoutRequest request);

  Future<void> reorderWorkout(String workoutId, DateTime newDate);

  Future<SubGoal> createSubGoal(String goalId, {
    required String name,
    String? raceType,
    DateTime? raceDate,
    String? priority,
    String? sport,
    int? targetTime,
    bool generateWorkouts = false,
  });

  Future<void> deleteSubGoal(String goalId, String subGoalId);
}
