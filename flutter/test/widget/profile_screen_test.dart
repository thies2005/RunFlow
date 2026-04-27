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

class _FakeAuthState extends AuthState {
  _FakeAuthState(this.user);

  final User? user;

  @override
  Future<User?> build() async => user;
}

class _FakeSettingsNotifier extends Settings {
  @override
  AppSettings get state => const AppSettings();

  @override
  set state(AppSettings value) {}

  @override
  AppSettings build() => const AppSettings();
}

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
  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<void> forgotPassword(String email) async {}
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
}

void main() {
  group('ProfileScreen Delete Account', () {

    Widget createTestWidget() {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      );
      return ProviderScope(
        overrides: [
          authStateProvider
              .overrideWith(() => _FakeAuthState(testUser)),
          authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          profileRepositoryProvider
              .overrideWithValue(_FakeProfileRepository()),
          settingsProvider.overrideWith(() => _FakeSettingsNotifier()),
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
      expect(find.textContaining('permanent'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
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

      expect(find.text('Delete'), findsNothing);
    });

    testWidgets('renders Strava Connected badge in header', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Strava Connected'), findsOneWidget);
    });

    testWidgets('renders About menu tile', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('About'), findsOneWidget);
    });
  });
}
