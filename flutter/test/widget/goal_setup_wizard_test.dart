import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_setup_wizard.dart';

void main() {
  group('GoalSetupWizard', () {
    testWidgets('renders first step with name input', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      expect(find.text('New Goal'), findsOneWidget);
      expect(find.text('Goal Name'), findsWidgets);
    });

    testWidgets('has close button in app bar', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.close), findsOneWidget);
    });

    testWidgets('has Next button on first step', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      expect(find.text('Next'), findsOneWidget);
    });

    testWidgets('shows Back button after first step', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'Test Goal');
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Race Type'), findsOneWidget);
      expect(find.text('Back'), findsOneWidget);
    });

    testWidgets('navigates through all steps', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'My Goal');
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Race Type'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Race Date'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Target Time'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Training Volume'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Training Phases'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Workout Scheduling'), findsOneWidget);

      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Review'), findsOneWidget);
      expect(find.text('Create Goal'), findsOneWidget);
    });

    testWidgets('can go back to previous step', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'My Goal');
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Race Type'), findsOneWidget);

      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();

      expect(find.text('Goal Name'), findsWidgets);
    });

    testWidgets('shows progress indicators', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      expect(find.byType(ClipRRect), findsWidgets);
    });

    testWidgets('allows race type selection on step 2', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(const ProviderScope(child: _TestApp()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'My Goal');
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      expect(find.text('Race Type'), findsOneWidget);
      expect(find.text('5K'), findsOneWidget);
      expect(find.text('Half Marathon'), findsOneWidget);

      await tester.tap(find.text('Half Marathon'));
      await tester.pumpAndSettle();
    });
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      localizationsDelegates: [
        S.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: S.supportedLocales,
      home: GoalSetupWizard(),
    );
  }
}
