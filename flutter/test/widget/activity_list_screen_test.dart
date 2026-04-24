import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_list_screen.dart';

import '../helpers/test_activity_data.dart';

class _FakeActivitiesNotifier extends Activities {
  _FakeActivitiesNotifier(this.fakeState);

  final AsyncValue<ActivitiesState> fakeState;

  @override
  AsyncValue<ActivitiesState> get state => fakeState;

  @override
  set state(AsyncValue<ActivitiesState> value) {}

  @override
  Future<ActivitiesState> build() async {
    return fakeState.value!;
  }

  @override
  Future<void> loadMore() async {}

  @override
  Future<void> filterByType(ActivityType? type) async {}

  @override
  Future<void> refresh() async {}
}

void main() {
  group('ActivityListScreen', () {
    testWidgets('renders activities list with data',
        (WidgetTester tester) async {
      final testState = ActivitiesState(
        activities: [
          TestActivityData.createActivity(name: 'Morning Run'),
          TestActivityData.createActivity(
            id: 'act2',
            name: 'Evening Ride',
            type: ActivityType.ride,
          ),
        ],
        hasMore: false,
        isLoadingMore: false,
        filterType: null,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activitiesProvider.overrideWith(
              () => _FakeActivitiesNotifier(AsyncValue.data(testState)),
            ),
          ],
          child: const MaterialApp(
            home: ActivityListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Activities'), findsOneWidget);
      expect(find.text('Morning Run'), findsOneWidget);
      expect(find.text('Evening Ride'), findsOneWidget);
      expect(find.text('All'), findsOneWidget);
    });

    testWidgets('shows error state with retry button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activitiesProvider.overrideWith(
              () => _FakeActivitiesNotifier(
                AsyncValue.error(
                  Exception('Network error'),
                  StackTrace.current,
                ),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ActivityListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows empty state when no activities',
        (WidgetTester tester) async {
      const emptyState = ActivitiesState(
        activities: [],
        hasMore: false,
        isLoadingMore: false,
        filterType: null,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activitiesProvider.overrideWith(
              () => _FakeActivitiesNotifier(const AsyncValue.data(emptyState)),
            ),
          ],
          child: const MaterialApp(
            home: ActivityListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No activities yet'), findsOneWidget);
    });

    testWidgets('shows loading skeleton', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activitiesProvider.overrideWith(
              () => _FakeActivitiesNotifier(const AsyncValue.loading()),
            ),
          ],
          child: const MaterialApp(
            home: ActivityListScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('renders filter chips', (WidgetTester tester) async {
      final testState = ActivitiesState(
        activities: [TestActivityData.createActivity()],
        hasMore: false,
        isLoadingMore: false,
        filterType: null,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activitiesProvider.overrideWith(
              () => _FakeActivitiesNotifier(AsyncValue.data(testState)),
            ),
          ],
          child: const MaterialApp(
            home: ActivityListScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('All'), findsOneWidget);
      expect(find.text('Run'), findsOneWidget);
      expect(find.text('Ride'), findsOneWidget);
      expect(find.text('Walk'), findsOneWidget);
    });
  });
}
