import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_list_screen.dart';

class _FakeGoalsNotifier extends Goals {
  _FakeGoalsNotifier(this.fakeState);

  final AsyncValue<GoalsResponse> fakeState;

  @override
  AsyncValue<GoalsResponse> get state => fakeState;

  @override
  set state(AsyncValue<GoalsResponse> value) {}

  @override
  Future<GoalsResponse> build() async {
    return fakeState.value!;
  }

  @override
  Future<void> refresh() async {}

  @override
  Future<Goal> createGoal(CreateGoalRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteGoal(String id) async {}
}

void main() {
  final testGoals = GoalsResponse(
    goals: [
      Goal(
        id: 'g1',
        userId: 'u1',
        name: 'Berlin Marathon',
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
            workoutType: WorkoutType.long,
            description: 'Long Run 18km',
            targetDistance: 18000.0,
            targetPace: 360.0,
            targetDuration: 6480,
            isCompleted: true,
            completedAt: DateTime(2024, 6, 16, 8, 0),
            activityId: null,
          ),
          Workout(
            id: 'w2',
            goalId: 'g1',
            scheduledDate: DateTime(2024, 6, 17),
            workoutType: WorkoutType.easy,
            description: 'Easy 8km',
            targetDistance: 8000.0,
            targetPace: 390.0,
            targetDuration: 3120,
            isCompleted: false,
            completedAt: null,
            activityId: null,
          ),
        ],
      ),
      Goal(
        id: 'g2',
        userId: 'u1',
        name: 'Spring 5K',
        raceType: RaceType.fiveK,
        raceDate: DateTime(2024, 4, 1),
        targetTime: 1500,
        weeklyMileageGoal: 25.0,
        planWeeks: 8,
        runsPerWeek: 3,
        longRunDay: 6,
        workoutDay: 3,
        currentVdot: null,
        predictedTime: null,
        isActive: false,
        createdAt: DateTime(2024, 1, 1),
        updatedAt: DateTime(2024, 4, 2),
        completedAt: DateTime(2024, 4, 2),
        workouts: [],
      ),
    ],
  );

  group('GoalListScreen', () {
    testWidgets('renders goals list with data', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(AsyncValue.data(testGoals)),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Goals'), findsOneWidget);
      expect(find.text('Active Goals'), findsOneWidget);
      expect(find.text('Berlin Marathon'), findsOneWidget);
      expect(find.text('Completed Goals'), findsOneWidget);
      expect(find.text('Spring 5K'), findsOneWidget);
    });

    testWidgets('shows empty state when no goals', (WidgetTester tester) async {
      const emptyResponse = GoalsResponse(goals: []);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(const AsyncValue.data(emptyResponse)),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No goals yet'), findsOneWidget);
    });

    testWidgets('shows error state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(
                AsyncValue.error(
                  Exception('Network error'),
                  StackTrace.current,
                ),
              ),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows loading skeleton', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(const AsyncValue.loading()),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('has FAB to create new goal', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(AsyncValue.data(testGoals)),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(FloatingActionButton), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
    });

    testWidgets('displays race type badge', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(AsyncValue.data(testGoals)),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Marathon'), findsOneWidget);
      expect(find.text('5K'), findsOneWidget);
    });

    testWidgets('displays workout progress', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            goalsProvider.overrideWith(
              () => _FakeGoalsNotifier(AsyncValue.data(testGoals)),
            ),
          ],
          child: const MaterialApp(
            home: GoalListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1/2 workouts'), findsOneWidget);
    });
  });
}
