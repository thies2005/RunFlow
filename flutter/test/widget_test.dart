import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/app.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
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
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
          ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Plan'), findsOneWidget);
    expect(find.text('Record'), findsOneWidget);
    expect(find.text('Health'), findsOneWidget);
    expect(find.text('Activities'), findsOneWidget);
    expect(find.text('Athlete'), findsOneWidget);
  });

  testWidgets('Navigation switches to Health tab',
      (WidgetTester tester) async {
    const testUser = User(
      id: 'test-user',
      email: 'test@example.com',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
          ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    await tester.tap(find.text('Health'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Health'), findsWidgets);
  });

  testWidgets('Onboarding is shown before auth when not completed',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      AppConstants.onboardingCompletedKey: false,
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
        ],
        child: const RunFlowApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Skip'), findsOneWidget);
  });

  testWidgets('Saved theme preference drives MaterialApp themeMode',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      AppConstants.onboardingCompletedKey: true,
      'settings_theme_mode': 0,
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
        ],
        child: const RunFlowApp(),
      ),
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
