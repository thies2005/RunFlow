import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/register_screen.dart';
import 'package:runflow_flutter/services/auth_service_impl.dart';

void main() {
  group('RegisterScreen', () {
    testWidgets('renders Create Account heading', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Create Account'), findsAtLeast(1));
      expect(find.text('Sign up to get started with RunFlow'), findsOneWidget);
    });

    testWidgets('renders all form fields', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.byType(TextFormField), findsNWidgets(4));
      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
    });

    testWidgets('renders Create Account button', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.widgetWithText(FilledButton, 'Create Account'), findsOneWidget);
    });

    testWidgets('renders Sign In link', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('shows validation errors on empty submit',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Create Account'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter your name.'), findsOneWidget);
      expect(find.text('Please enter your email.'), findsOneWidget);
      expect(find.text('Please enter a password.'), findsOneWidget);
      expect(find.text('Please confirm your password.'), findsOneWidget);
    });

    testWidgets('shows error for invalid email', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), 'Test User');
      await tester.enterText(find.byType(TextFormField).at(1), 'invalid');
      await tester.enterText(find.byType(TextFormField).at(2), 'password123');
      await tester.enterText(find.byType(TextFormField).at(3), 'password123');

      await tester.tap(find.widgetWithText(FilledButton, 'Create Account'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter a valid email address.'), findsOneWidget);
    });

    testWidgets('shows error for short password', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), 'Test User');
      await tester.enterText(find.byType(TextFormField).at(1), 'test@example.com');
      await tester.enterText(find.byType(TextFormField).at(2), 'short');
      await tester.enterText(find.byType(TextFormField).at(3), 'short');

      await tester.tap(find.widgetWithText(FilledButton, 'Create Account'));
      await tester.pumpAndSettle();

      expect(find.text('Password must be at least 8 characters.'), findsOneWidget);
    });

    testWidgets('shows error when passwords do not match',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(child: _TestApp()),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), 'Test User');
      await tester.enterText(find.byType(TextFormField).at(1), 'test@example.com');
      await tester.enterText(find.byType(TextFormField).at(2), 'password123');
      await tester.enterText(find.byType(TextFormField).at(3), 'different123');

      await tester.tap(find.widgetWithText(FilledButton, 'Create Account'));
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match.'), findsOneWidget);
    });
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      localizationsDelegates: const [
        S.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: S.supportedLocales,
      home: Scaffold(
        body: ProviderScope(
          overrides: [
            authServiceImplProvider.overrideWithValue(AuthServiceImpl()),
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
            authRepositoryProvider.overrideWithValue(_FakeAuthRepository()),
          ],
          child: const RegisterScreen(),
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
  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<void> forgotPassword(String email) async {}

  @override
  Future<void> verifyEmail(String email, String code) async {}

  @override
  Future<void> resendVerification(String email) async {}

  @override
  Future<bool> checkEmailVerified() async => true;

  @override
  void clearLocalSession() {}
}
