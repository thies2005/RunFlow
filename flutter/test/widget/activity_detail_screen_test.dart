import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_detail_screen.dart';

import '../helpers/test_activity_data.dart';

void main() {
  group('ActivityDetailScreen', () {
    testWidgets('renders activity detail content',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        name: 'Morning Run',
        trainingType: 'EASY',
        estimatedVdot: 51.2,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('act1')
                .overrideWithValue(AsyncValue.data(testActivity)),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'act1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Activity Detail'), findsOneWidget);
      expect(find.text('Morning Run'), findsOneWidget);
    });

    testWidgets('shows error state with retry',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('bad-id').overrideWithValue(
              AsyncValue.error(
                Exception('Not found'),
                StackTrace.current,
              ),
            ),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'bad-id'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows loading indicator', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('loading-id')
                .overrideWithValue(const AsyncValue.loading()),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'loading-id'),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows training type badge when present',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        trainingType: 'TEMPO',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('act1')
                .overrideWithValue(AsyncValue.data(testActivity)),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'act1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('TEMPO'), findsOneWidget);
    });

    testWidgets('shows VDOT when present', (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        estimatedVdot: 52.5,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('act1')
                .overrideWithValue(AsyncValue.data(testActivity)),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'act1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('52.5'), findsOneWidget);
    });

    testWidgets('does not show training type badge when null',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        trainingType: null,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('act1')
                .overrideWithValue(AsyncValue.data(testActivity)),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'act1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Training Type'), findsNothing);
    });

    testWidgets('shows heart rate metrics when present',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        averageHr: 155.0,
        maxHr: 185,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider('act1')
                .overrideWithValue(AsyncValue.data(testActivity)),
          ],
          child: const MaterialApp(
            home: ActivityDetailScreen(activityId: 'act1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('155 bpm'), findsOneWidget);
      expect(find.text('185 bpm'), findsOneWidget);
    });
  });
}
