import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/screens/profile/settings_screen.dart';

class _FakeSettingsNotifier extends Settings {
  _FakeSettingsNotifier([AppSettings? initial])
      : _state = initial ?? const AppSettings();

  AppSettings _state;

  final List<bool> setWorkoutRemindersCalls = [];
  final List<bool> setSupplementRemindersCalls = [];
  final List<bool> setSyncNotificationsCalls = [];
  final List<bool> setChatNotificationsCalls = [];

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
    setWorkoutRemindersCalls.add(value);
    state = _state.copyWith(workoutReminders: value);
  }

  @override
  Future<void> setSupplementReminders(bool value) async {
    setSupplementRemindersCalls.add(value);
    state = _state.copyWith(supplementReminders: value);
  }

  @override
  Future<void> setChatNotifications(bool value) async {
    setChatNotificationsCalls.add(value);
    state = _state.copyWith(chatNotifications: value);
  }

  @override
  Future<void> setSyncNotifications(bool value) async {
    setSyncNotificationsCalls.add(value);
    state = _state.copyWith(syncNotifications: value);
  }

  @override
  Future<void> setAiShareActivities(bool value) async {
    state = _state.copyWith(aiShareActivities: value);
  }

  @override
  Future<void> setAiShareHealthData(bool value) async {
    state = _state.copyWith(aiShareHealthData: value);
  }

  @override
  Future<void> setAiShareGoals(bool value) async {
    state = _state.copyWith(aiShareGoals: value);
  }
}

void main() {
  group('Notification Preferences', () {
    late _FakeSettingsNotifier fakeSettings;

    Widget createTestWidget() {
      fakeSettings = _FakeSettingsNotifier();
      return ProviderScope(
        overrides: [
          settingsProvider.overrideWith(() => fakeSettings),
        ],
        child: const MaterialApp(
          home: SettingsScreen(),
        ),
      );
    }

    testWidgets('renders all notification toggles', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Workout Reminders'), findsOneWidget);
      expect(find.text('Supplement Reminders'), findsOneWidget);
      expect(find.text('Sync Notifications'), findsOneWidget);
      expect(find.text('Chat Notifications'), findsOneWidget);
    });

    testWidgets('all notification toggles default to on', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      final switches = tester.widgetList<Switch>(find.byType(Switch));
      expect(switches.length, 4);
      for (final s in switches) {
        expect(s.value, true);
      }
    });

    testWidgets('toggling sync notifications calls setter', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sync Notifications'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setSyncNotificationsCalls, [false]);
    });

    testWidgets('toggling workout reminders calls setter', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Workout Reminders'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setWorkoutRemindersCalls, [false]);
    });
  });
}
