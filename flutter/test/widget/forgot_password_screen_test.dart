import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/forgot_password_screen.dart';
import 'package:runflow_flutter/services/auth_service.dart';

void main() {
  group('ForgotPasswordScreen', () {
    testWidgets('renders Reset Password heading', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Reset Password'), findsOneWidget);
    });

    testWidgets('renders email field', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.byType(TextFormField), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
    });

    testWidgets('renders Send Reset Link button', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Send Reset Link'), findsOneWidget);
    });

    testWidgets('shows validation error on empty submit',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Send Reset Link'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter your email.'), findsOneWidget);
    });

    testWidgets('shows validation error for invalid email',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField), 'notanemail');

      await tester.tap(find.widgetWithText(FilledButton, 'Send Reset Link'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter a valid email address.'), findsOneWidget);
    });

    testWidgets('shows success message after valid submit',
        (WidgetTester tester) async {
      final container = ProviderContainer(overrides: [
        authServiceImplProvider.overrideWithValue(_NoopAuthService()),
        dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
        authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
      ]);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(body: ForgotPasswordScreen()),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField), 'test@example.com');

      await tester.tap(find.widgetWithText(FilledButton, 'Send Reset Link'));
      for (int i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }

      expect(find.text('Check Your Email'), findsOneWidget);
      expect(find.text('Back to Sign In'), findsOneWidget);
      container.dispose();
    });
  });
}

class _NoopAuthService implements AuthService {
  @override
  Future<void> clearAll() async {}

  @override
  Future<void> clearTokens() async {}

  @override
  Future<String?> getAccessToken() async => null;

  @override
  Future<String?> getRefreshToken() async => null;

  @override
  Future<User?> getUser() async => null;

  @override
  Future<bool> get isLoggedIn async => false;

  @override
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  @override
  Future<void> storeUser(User user) async {}
}

class _TestApp extends StatelessWidget {
  const _TestApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: ProviderScope(
          overrides: [
            authServiceImplProvider.overrideWithValue(_NoopAuthService()),
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
            authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          ],
          child: const ForgotPasswordScreen(),
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
