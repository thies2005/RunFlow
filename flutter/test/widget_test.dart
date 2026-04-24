import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/app.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({
      AppConstants.onboardingCompletedKey: true,
    });
  });

  testWidgets('Unauthenticated app redirects to login',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith(() => _FakeAuthState(null)),
        ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('RunFlow'), findsOneWidget);
    expect(find.text('Strava Unavailable'), findsOneWidget);
  });

  testWidgets('Authenticated app shows bottom navigation',
      (WidgetTester tester) async {
    const testUser = User(
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
          ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Dashboard'), findsWidgets);
    expect(find.text('Activities'), findsOneWidget);
    expect(find.text('Analytics'), findsOneWidget);
    expect(find.text('Goals'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('Navigation switches to Activities tab',
      (WidgetTester tester) async {
    const testUser = User(
      id: 'test-user',
      email: 'test@example.com',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
          ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    await tester.tap(find.text('Activities'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Activities'), findsWidgets);
  });

  testWidgets('Onboarding is shown before auth when not completed',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      AppConstants.onboardingCompletedKey: false,
    });

    await tester.pumpWidget(
      const ProviderScope(child: RunFlowApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Track Your Runs'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
  });

  testWidgets('Saved theme preference drives MaterialApp themeMode',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      AppConstants.onboardingCompletedKey: true,
      'settings_theme_mode': 0,
    });

    await tester.pumpWidget(
      const ProviderScope(child: RunFlowApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.themeMode, ThemeMode.light);
  });
}

class _FakeAuthState extends AuthState {
  _FakeAuthState(this.user);

  final User? user;

  @override
  Future<User?> build() async => user;
}
