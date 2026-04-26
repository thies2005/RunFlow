import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/screens/settings/ai_settings_screen.dart';

class _FakeSettingsNotifier extends Settings {
  _FakeSettingsNotifier([AppSettings? initial])
      : _state = initial ?? const AppSettings();

  AppSettings _state;

  final List<bool> setAiShareActivitiesCalls = [];
  final List<bool> setAiShareHealthDataCalls = [];
  final List<bool> setAiShareGoalsCalls = [];

  @override
  AppSettings get state => _state;

  @override
  set state(AppSettings value) {
    _state = value;
  }

  @override
  AppSettings build() => _state;

  @override
  Future<void> setUnitSystem(UnitSystem unit) async {
    state = _state.copyWith(unitSystem: unit);
  }

  @override
  Future<void> setThemeMode(AppThemeMode mode) async {
    state = _state.copyWith(themeMode: mode);
  }

  @override
  Future<void> setWorkoutReminders(bool value) async {
    state = _state.copyWith(workoutReminders: value);
  }

  @override
  Future<void> setSupplementReminders(bool value) async {
    state = _state.copyWith(supplementReminders: value);
  }

  @override
  Future<void> setChatNotifications(bool value) async {
    state = _state.copyWith(chatNotifications: value);
  }

  @override
  Future<void> setSyncNotifications(bool value) async {
    state = _state.copyWith(syncNotifications: value);
  }

  @override
  Future<void> setAiShareActivities(bool value) async {
    setAiShareActivitiesCalls.add(value);
    state = _state.copyWith(aiShareActivities: value);
  }

  @override
  Future<void> setAiShareHealthData(bool value) async {
    setAiShareHealthDataCalls.add(value);
    state = _state.copyWith(aiShareHealthData: value);
  }

  @override
  Future<void> setAiShareGoals(bool value) async {
    setAiShareGoalsCalls.add(value);
    state = _state.copyWith(aiShareGoals: value);
  }
}

void main() {
  group('AiSettingsScreen', () {
    late _FakeSettingsNotifier fakeSettings;

    Widget createTestWidget() {
      fakeSettings = _FakeSettingsNotifier();
      return ProviderScope(
        overrides: [
          settingsProvider.overrideWith(() => fakeSettings),
        ],
        child: const MaterialApp(
          home: AiSettingsScreen(),
        ),
      );
    }

    testWidgets('renders all AI toggle labels', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Share Activities'), findsOneWidget);
      expect(find.text('Share Health Data'), findsOneWidget);
      expect(find.text('Share Goals'), findsOneWidget);
    });

    testWidgets('shows correct default toggle values', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      final switches = tester.widgetList<Switch>(find.byType(Switch));
      expect(switches.length, 3);

      expect(switches.elementAt(0).value, true);
      expect(switches.elementAt(1).value, false);
      expect(switches.elementAt(2).value, true);
    });

    testWidgets('toggling share activities updates state in notifier',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(fakeSettings.state.aiShareActivities, true);

      final activitySwitch = find.widgetWithText(
        SwitchListTile,
        'Share Activities',
      );
      await tester.tap(activitySwitch);
      await tester.pumpAndSettle();

      expect(fakeSettings.setAiShareActivitiesCalls, [false]);
      expect(fakeSettings.state.aiShareActivities, false);
    });

    testWidgets('toggling share health data calls setter', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      final healthSwitch = find.widgetWithText(
        SwitchListTile,
        'Share Health Data',
      );
      await tester.tap(healthSwitch);
      await tester.pumpAndSettle();

      expect(fakeSettings.setAiShareHealthDataCalls, [true]);
    });

    testWidgets('toggling share goals calls setter', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      final goalsSwitch = find.widgetWithText(
        SwitchListTile,
        'Share Goals',
      );
      await tester.tap(goalsSwitch);
      await tester.pumpAndSettle();

      expect(fakeSettings.setAiShareGoalsCalls, [false]);
    });
  });
}
