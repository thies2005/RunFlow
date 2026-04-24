import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/login_screen.dart';
import 'package:runflow_flutter/services/auth_service_impl.dart';

void main() {
  group('LoginScreen', () {
    testWidgets('renders RunFlow branding', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('RunFlow'), findsOneWidget);
      expect(find.text('Your running performance dashboard'), findsOneWidget);
    });

    testWidgets('renders Strava login button', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Strava Unavailable'), findsOneWidget);

      final button = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Strava Unavailable'),
      );
      expect(button.onPressed, isNull);
    });

    testWidgets('renders email and password fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
    });

    testWidgets('renders Sign In button', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('shows error when submitting empty fields',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter email and password.'), findsOneWidget);
    });

    testWidgets('toggles password visibility', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      final visibilityToggle = find.byIcon(Icons.visibility_off);
      expect(visibilityToggle, findsOneWidget);

      await tester.tap(visibilityToggle);
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.visibility), findsOneWidget);
    });
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: ProviderScope(
          overrides: [
            authServiceImplProvider.overrideWithValue(
              AuthServiceImpl(),
            ),
            dioClientProvider.overrideWithValue(
              DioClient(dio: Dio()),
            ),
            authRepositoryProvider.overrideWithValue(
              _FakeAuthRepository(),
            ),
          ],
          child: const LoginScreen(),
        ),
      ),
    );
  }
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
  Future<LoginResponse> loginWithStravaCode(String code, {String? redirectUri}) async {
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
}
