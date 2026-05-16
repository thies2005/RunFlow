import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class _FakeGoalRepository implements GoalRepository {
  _FakeGoalRepository({required this.goal});

  final Goal goal;

  @override
  Future<Goal> getGoal(String id) async => goal;

  @override
  Future<GoalsResponse> listGoals() async {
    return GoalsResponse(goals: [goal]);
  }

  @override
  Future<Goal> createGoal(CreateGoalRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<Goal> updateGoal(String id, UpdateGoalRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<bool> deleteGoal(String id) async {
    throw UnimplementedError();
  }

  @override
  Future<WorkoutsResponse> listWorkouts({
    String? goalId,
    DateTime? weekStart,
    DateTime? weekEnd,
  }) async {
    return WorkoutsResponse(workouts: goal.workouts);
  }

  @override
  Future<Workout> updateWorkout(String id, UpdateWorkoutRequest request) async {
    return goal.workouts.firstWhere((w) => w.id == id).copyWith(
          isCompleted: request.isCompleted ?? false,
        );
  }

  @override
  Future<void> reorderWorkout(String workoutId, DateTime newDate) async {
    throw UnimplementedError();
  }

  @override
  Future<SubGoal> createSubGoal(
    String goalId, {
    required String name,
    String? raceType,
    DateTime? raceDate,
    String? priority,
    String? sport,
    int? targetTime,
    bool generateWorkouts = false,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteSubGoal(String goalId, String subGoalId) async {
    throw UnimplementedError();
  }
}

Goal _createTestGoal({required bool workoutCompleted}) {
  return Goal(
    id: 'g1',
    userId: 'u1',
    name: 'Test Goal',
    raceType: RaceType.marathon,
    raceDate: DateTime(2025, 9, 28),
    targetTime: 10800,
    weeklyMileageGoal: 60.0,
    planWeeks: 16,
    runsPerWeek: 4,
    longRunDay: 6,
    workoutDay: 2,
    currentVdot: 52.0,
    predictedTime: 11200,
    isActive: true,
    createdAt: DateTime(2024, 6, 1),
    updatedAt: DateTime(2024, 6, 15),
    completedAt: null,
    workouts: [
      Workout(
        id: 'w1',
        goalId: 'g1',
        scheduledDate: DateTime(2024, 6, 16),
        workoutType: WorkoutType.easy,
        description: 'Easy 5K',
        targetDistance: 5000.0,
        targetPace: 360.0,
        targetDuration: 1800,
        isCompleted: workoutCompleted,
        completedAt: null,
        activityId: null,
      ),
    ],
  );
}

void main() {
  group('GoalDetail provider', () {
    test('loads goal detail from repository', () async {
      final fakeRepo = _FakeGoalRepository(
        goal: _createTestGoal(workoutCompleted: false),
      );
      final container = ProviderContainer(
        overrides: [
          goalRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );

      final goal = await container.read(goalDetailProvider('g1').future);
      expect(goal.workouts.first.isCompleted, false);
      expect(goal.name, 'Test Goal');

      container.dispose();
    });
  });
}
