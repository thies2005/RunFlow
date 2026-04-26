import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class _FakeGoalRepository implements GoalRepository {
  _FakeGoalRepository({required this.goal});

  final Goal goal;
  bool toggleCallSucceeds = true;
  int toggleCallCount = 0;

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
  Future<Workout> toggleWorkoutCompletion(
    String workoutId,
    bool isCompleted,
  ) async {
    toggleCallCount++;
    if (!toggleCallSucceeds) {
      throw Exception('Server error');
    }
    return goal.workouts.firstWhere((w) => w.id == workoutId).copyWith(
          isCompleted: isCompleted,
        );
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
  group('GoalDetail notifier', () {
    test('optimistically toggles workout completion', () async {
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

      await container
          .read(goalDetailProvider('g1').notifier)
          .toggleWorkoutCompletion('w1', true);

      final updated = container.read(goalDetailProvider('g1'));
      updated.whenData((g) {
        expect(g.workouts.first.isCompleted, true);
      });

      expect(fakeRepo.toggleCallCount, 1);
      container.dispose();
    });

    test('reverts optimistic toggle on server error', () async {
      final fakeRepo = _FakeGoalRepository(
        goal: _createTestGoal(workoutCompleted: false),
      );
      fakeRepo.toggleCallSucceeds = false;
      final container = ProviderContainer(
        overrides: [
          goalRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );

      await container.read(goalDetailProvider('g1').future);

      try {
        await container
            .read(goalDetailProvider('g1').notifier)
            .toggleWorkoutCompletion('w1', true);
        fail('Should have thrown');
      } catch (_) {}

      final reverted = container.read(goalDetailProvider('g1'));
      reverted.whenData((g) {
        expect(g.workouts.first.isCompleted, false);
      });

      expect(fakeRepo.toggleCallCount, 1);
      container.dispose();
    });
  });
}
