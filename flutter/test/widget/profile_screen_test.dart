import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/screens/profile/profile_screen.dart';

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<LoginResponse> loginWithEmail({
    required String email,
    required String password,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<LoginResponse> loginWithStravaCode(String code,
      {String? redirectUri}) async {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}

  @override
  Future<void> refreshToken() async {}

  @override
  Future<bool> isLoggedIn() async => false;

  @override
  Future<User?> getCurrentUser() async => null;

  @override
  Future<void> restoreSession() async {}

  @override
  Future<LoginResponse> register({
    required String email,
    required String password,
    required String name,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<void> forgotPassword(String email) async {}
}

class _FakeSettingsNotifier extends Settings {
  _FakeSettingsNotifier([AppSettings? initial])
      : _state = initial ?? const AppSettings();

  AppSettings _state;

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

class _FakeProfileRepository implements ProfileRepository {
  @override
  Future<UserProfile> getProfile() async {
    throw UnimplementedError();
  }

  @override
  Future<UserProfile> updateProfile(UpdateProfileRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteAccount() async {}
}

void main() {
  group('ProfileScreen Delete Account', () {
    late _FakeSettingsNotifier fakeSettings;

    Widget createTestWidget() {
      fakeSettings = _FakeSettingsNotifier();
      return ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          profileRepositoryProvider
              .overrideWithValue(_FakeProfileRepository()),
          settingsProvider.overrideWith(() => fakeSettings),
        ],
        child: const MaterialApp(
          home: ProfileScreen(),
        ),
      );
    }

    Finder findDeleteAccountButton() {
      return find.byWidgetPredicate(
        (widget) =>
            widget is ListTile &&
            widget.title is Text &&
            (widget.title as Text).data == 'Delete Account',
      );
    }

    testWidgets('renders Delete Account button', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        findDeleteAccountButton(),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();

      expect(find.text('Delete Account'), findsOneWidget);
    });

    testWidgets('shows first confirmation dialog', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        findDeleteAccountButton(),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();
      await tester.tap(findDeleteAccountButton());
      await tester.pumpAndSettle();

      expect(find.text('Delete Account'), findsAtLeast(1));
      expect(find.textContaining('irreversible'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('cancel dismisses first dialog', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        findDeleteAccountButton(),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();
      await tester.tap(findDeleteAccountButton());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(find.text('Final Confirmation'), findsNothing);
    });

    testWidgets('shows second confirmation dialog after Continue',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        findDeleteAccountButton(),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();
      await tester.tap(findDeleteAccountButton());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Final Confirmation'), findsOneWidget);
      expect(find.text('Delete Forever'), findsOneWidget);
    });

    testWidgets('cancel dismisses second dialog', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        findDeleteAccountButton(),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();
      await tester.tap(findDeleteAccountButton());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(find.text('Delete Forever'), findsNothing);
    });

    testWidgets('renders Strava Connection section', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        find.text('Strava Connection'),
        100.0,
        scrollable: find.byType(Scrollable),
      );
      await tester.pumpAndSettle();

      expect(find.text('Strava Connection'), findsOneWidget);
    });

    testWidgets('renders About menu tile', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('About'), findsOneWidget);
    });
  });
}
