import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/ai_feedback_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/ai_feedback_providers.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_detail_screen.dart';

import '../helpers/test_activity_data.dart';

class _FakeAiFeedback extends AiFeedback {
  _FakeAiFeedback(this._activityId);
  final String _activityId;

  @override
  Future<AiActivityFeedback> build(String activityId) async {
    if (activityId != _activityId) {
      throw StateError('Unexpected activity id: $activityId');
    }
    return const AiActivityFeedback();
  }
}

void main() {
  group('ActivityDetailScreen', () {
    Future<void> pumpDetail(
      WidgetTester tester, {
      required Activity testActivity,
      String activityId = 'act1',
    }) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityDetailProvider(activityId)
                .overrideWithValue(AsyncValue.data(testActivity)),
            aiFeedbackProvider(activityId)
                .overrideWith(() => _FakeAiFeedback(activityId)),
          ],
          child: MaterialApp(
            localizationsDelegates: const [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: ActivityDetailScreen(activityId: activityId),
          ),
        ),
      );
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 250));
      }
    }

    testWidgets('renders activity detail content',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        name: 'Morning Run',
        trainingType: 'EASY',
        estimatedVdot: 51.2,
      );

      await pumpDetail(tester, testActivity: testActivity);

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
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
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
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
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

      await pumpDetail(tester, testActivity: testActivity);

      await tester.dragUntilVisible(
        find.text('TEMPO'),
        find.byType(Scrollable).first,
        const Offset(0, -50),
      );
      await tester.pumpAndSettle();

      expect(find.text('TEMPO'), findsOneWidget);
    });

    testWidgets('shows VDOT when present', (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        estimatedVdot: 52.5,
      );

      await pumpDetail(tester, testActivity: testActivity);

      await tester.dragUntilVisible(
        find.text('52.5'),
        find.byType(Scrollable).first,
        const Offset(0, -50),
      );
      await tester.pumpAndSettle();

      expect(find.text('52.5'), findsOneWidget);
    });

    testWidgets('does not show training type badge when null',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        trainingType: null,
      );

      await pumpDetail(tester, testActivity: testActivity);

      expect(find.text('Training Type'), findsNothing);
    });

    testWidgets('shows heart rate metrics when present',
        (WidgetTester tester) async {
      final testActivity = TestActivityData.createActivity(
        averageHr: 155.0,
        maxHr: 185,
      );

      await pumpDetail(tester, testActivity: testActivity);

      expect(find.text('155 bpm'), findsOneWidget);
      expect(find.text('185 bpm'), findsOneWidget);
    });
  });
}
