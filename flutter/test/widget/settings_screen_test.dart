import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/screens/profile/settings_screen.dart';

class _FakeSettingsNotifier extends Settings {
  _FakeSettingsNotifier([AppSettings? initial])
      : _state = initial ?? const AppSettings();

  AppSettings _state;

  final List<UnitSystem> setUnitSystemCalls = [];
  final List<AppThemeMode> setThemeModeCalls = [];
  final List<bool> setWorkoutRemindersCalls = [];
  final List<bool> setSupplementRemindersCalls = [];
  final List<bool> setChatNotificationsCalls = [];
  final List<bool> setSyncNotificationsCalls = [];

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
    setUnitSystemCalls.add(unit);
    state = _state.copyWith(unitSystem: unit);
  }

  @override
  Future<void> setThemeMode(AppThemeMode mode) async {
    setThemeModeCalls.add(mode);
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
}

void main() {
  group('SettingsScreen', () {
    late _FakeSettingsNotifier fakeSettings;

    Widget createTestWidget() {
      fakeSettings = _FakeSettingsNotifier();
      return ProviderScope(
        overrides: [
          settingsProvider.overrideWith(() => fakeSettings),
        ],
        child: const MaterialApp(
          localizationsDelegates: [
            S.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: S.supportedLocales,
          home: SettingsScreen(),
        ),
      );
    }

    testWidgets('renders all setting sections', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Units'), findsOneWidget);
      expect(find.text('Theme'), findsOneWidget);
      expect(find.text('Notifications'), findsOneWidget);
    });

    testWidgets('shows correct default unit selection (Metric)', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(fakeSettings.state.unitSystem, UnitSystem.metric);
      expect(find.text('Metric'), findsOneWidget);
      expect(find.text('Imperial'), findsOneWidget);
    });

    testWidgets('shows correct default theme selection (System)', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(fakeSettings.state.themeMode, AppThemeMode.system);
      expect(find.text('Light'), findsOneWidget);
      expect(find.text('Dark'), findsOneWidget);
      expect(find.text('System'), findsOneWidget);
    });

    testWidgets('shows notification toggles with correct default values (all on)',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Workout Reminders'), findsOneWidget);
      expect(find.text('Supplement Reminders'), findsOneWidget);
      expect(find.text('Sync Notifications'), findsOneWidget);
      expect(find.text('Chat Notifications'), findsOneWidget);

      final switches = tester.widgetList<Switch>(find.byType(Switch));
      expect(switches.length, 4);
      for (final s in switches) {
        expect(s.value, true);
      }
    });

    testWidgets('tapping unit segments calls setUnitSystem', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Imperial'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setUnitSystemCalls, [UnitSystem.imperial]);
    });

    testWidgets('tapping theme segments calls setThemeMode', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Light'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setThemeModeCalls, [AppThemeMode.light]);
    });

    testWidgets('toggling workout reminders calls setWorkoutReminders',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Workout Reminders'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setWorkoutRemindersCalls, [false]);
    });

    testWidgets('toggling supplement reminders calls setSupplementReminders',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Supplement Reminders'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setSupplementRemindersCalls, [false]);
    });

    testWidgets('toggling chat notifications calls setChatNotifications',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Chat Notifications'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Chat Notifications'));
      await tester.pumpAndSettle();

      expect(fakeSettings.setChatNotificationsCalls, [false]);
    });
  });
}
