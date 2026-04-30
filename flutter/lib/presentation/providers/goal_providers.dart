import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/data/repositories/goal_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/goal_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

part 'goal_providers.g.dart';

@Riverpod(keepAlive: true)
GoalRepository goalRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  return GoalRepositoryImpl(dio: client.dio);
}

@riverpod
class Goals extends _$Goals {
  @override
  Future<GoalsResponse> build() async {
    final repo = ref.read(goalRepositoryProvider);
    return repo.listGoals();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final repo = ref.read(goalRepositoryProvider);
    state = await AsyncValue.guard(repo.listGoals);
  }

  Future<Goal> createGoal(CreateGoalRequest request) async {
    final repo = ref.read(goalRepositoryProvider);
    final goal = await repo.createGoal(request);
    await refresh();
    return goal;
  }

  Future<void> deleteGoal(String id) async {
    final repo = ref.read(goalRepositoryProvider);
    await repo.deleteGoal(id);
    await refresh();
  }

  Future<void> reorderWorkout(String workoutId, DateTime newDate) async {
    final repo = ref.read(goalRepositoryProvider);
    await repo.reorderWorkout(workoutId, newDate);
    await refresh();
  }
}

@riverpod
Future<Goal> goalDetail(Ref ref, String id) async {
  final repo = ref.read(goalRepositoryProvider);
  return repo.getGoal(id);
}

@riverpod
Future<WorkoutsResponse> workouts(
  Ref ref, {
  String? goalId,
  DateTime? weekStart,
  DateTime? weekEnd,
}) async {
  final repo = ref.read(goalRepositoryProvider);
  return repo.listWorkouts(
    goalId: goalId,
    weekStart: weekStart,
    weekEnd: weekEnd,
  );
}
