import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/ai_settings_providers.dart';
import 'package:runflow_flutter/presentation/screens/settings/ai_settings_screen.dart';

class _FakeAiSettings extends AiSettings {
  _FakeAiSettings([AiSettingsState? initial])
      : _state = initial ?? const AiSettingsState();

  AiSettingsState _state;

  @override
  AiSettingsState get state => _state;

  @override
  set state(AiSettingsState value) {
    _state = value;
  }

  @override
  AiSettingsState build() => _state;

  @override
  Future<void> setAiEnabled(bool value) async {
    _state = _state.copyWith(aiEnabled: value);
  }

  @override
  Future<void> setAccessFitnessMetrics(bool value) async {
    _state = _state.copyWith(accessFitnessMetrics: value);
  }

  @override
  Future<void> setAccessActivityHistory(bool value) async {
    _state = _state.copyWith(accessActivityHistory: value);
  }

  @override
  Future<void> setAccessHeartRateData(bool value) async {
    _state = _state.copyWith(accessHeartRateData: value);
  }

  @override
  Future<void> setAccessGoals(bool value) async {
    _state = _state.copyWith(accessGoals: value);
  }

  @override
  Future<void> setAccessTrainingPlan(bool value) async {
    _state = _state.copyWith(accessTrainingPlan: value);
  }

  @override
  Future<void> setAccessPerformance(bool value) async {
    _state = _state.copyWith(accessPerformance: value);
  }

  @override
  Future<void> setAccessBiometrics(bool value) async {
    _state = _state.copyWith(accessBiometrics: value);
  }

  @override
  Future<void> setAccessAllActivities(bool value) async {
    _state = _state.copyWith(accessAllActivities: value);
  }

  @override
  Future<void> setAccessActivityLogs(bool value) async {
    _state = _state.copyWith(accessActivityLogs: value);
  }

  @override
  Future<void> setAccessNutritionLogs(bool value) async {
    _state = _state.copyWith(accessNutritionLogs: value);
  }
}

void main() {
  group('AiSettingsScreen', () {
    late _FakeAiSettings fakeSettings;

    Widget createTestWidget() {
      fakeSettings = _FakeAiSettings();
      return ProviderScope(
        overrides: [
          aiSettingsProvider.overrideWith(() => fakeSettings),
        ],
        child: const MaterialApp(
          home: AiSettingsScreen(),
        ),
      );
    }

    testWidgets('renders AI Coach Settings title', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('AI Coach Settings'), findsOneWidget);
    });

    testWidgets('renders AI Features master toggle', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('AI Features'), findsOneWidget);
    });

    testWidgets('renders Data Access section with toggle labels',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Data Access'), findsOneWidget);
      expect(find.text('Fitness Metrics'), findsOneWidget);
      expect(find.text('Recent Activity'), findsOneWidget);
      expect(find.text('Heart Rate Data'), findsOneWidget);
      expect(find.text('Goals & Races'), findsOneWidget);
    });

    testWidgets('renders Feedback Mode section', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Activity Feedback'), findsOneWidget);
    });

    testWidgets('renders Custom Instructions section', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Custom Instructions'), findsOneWidget);
    });

    testWidgets('toggling data access updates state', (tester) async {
      fakeSettings = _FakeAiSettings(const AiSettingsState(aiEnabled: true));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            aiSettingsProvider.overrideWith(() => fakeSettings),
          ],
          child: const MaterialApp(
            home: AiSettingsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(fakeSettings.state.aiEnabled, true);
      expect(fakeSettings.state.accessFitnessMetrics, true);

      await tester.scrollUntilVisible(
        find.text('Fitness Metrics'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();

      final fitnessSwitch = find.widgetWithText(
        SwitchListTile,
        'Fitness Metrics',
      );
      await tester.ensureVisible(fitnessSwitch);
      await tester.pumpAndSettle();
      await tester.tap(fitnessSwitch);
      await tester.pumpAndSettle();

      expect(fakeSettings.state.accessFitnessMetrics, false);
    });
  });
}
