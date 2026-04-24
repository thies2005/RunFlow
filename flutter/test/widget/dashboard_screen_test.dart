import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/screens/dashboard/dashboard_screen.dart';

import '../helpers/test_dashboard_data.dart';

class _FakeDashboardNotifier extends Dashboard {
  _FakeDashboardNotifier(this.fakeState);

  final AsyncValue<DashboardResponse> fakeState;

  @override
  AsyncValue<DashboardResponse> get state => fakeState;

  @override
  set state(AsyncValue<DashboardResponse> value) {}

  @override
  Future<DashboardResponse> build() async {
    return fakeState.value!;
  }

  @override
  Future<void> refresh() async {}

  @override
  Future<void> triggerSync() async {}
}

class _FakeAuthState extends AuthState {
  _FakeAuthState(this.user);

  final User? user;

  @override
  Future<User?> build() async => user;
}

void main() {
  group('DashboardScreen', () {
    testWidgets('renders dashboard content with data',
        (WidgetTester tester) async {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      );

      final testDashboard = TestDashboardData.createResponse();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dashboardProvider.overrideWith(
              () => _FakeDashboardNotifier(AsyncValue.data(testDashboard)),
            ),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('RunFlow'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('Recent Activities'), findsOneWidget);
      expect(find.text('Morning Run'), findsOneWidget);
    });

    testWidgets('shows error state and retry button',
        (WidgetTester tester) async {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dashboardProvider.overrideWith(
              () => _FakeDashboardNotifier(
                AsyncValue.error(
                  Exception('Network error'),
                  StackTrace.current,
                ),
              ),
            ),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows loading skeleton', (WidgetTester tester) async {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dashboardProvider.overrideWith(
              () => _FakeDashboardNotifier(const AsyncValue.loading()),
            ),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('has sync button in app bar', (WidgetTester tester) async {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
      );

      final testDashboard = TestDashboardData.createResponse();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dashboardProvider.overrideWith(
              () => _FakeDashboardNotifier(AsyncValue.data(testDashboard)),
            ),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.sync), findsOneWidget);
    });

    testWidgets('displays active goals section', (WidgetTester tester) async {
      const testUser = User(
        id: 'test-user',
        email: 'test@example.com',
      );

      final testDashboard = TestDashboardData.createResponse();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => _FakeAuthState(testUser)),
            dashboardProvider.overrideWith(
              () => _FakeDashboardNotifier(AsyncValue.data(testDashboard)),
            ),
          ],
          child: const MaterialApp(
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Active Goals'), findsOneWidget);
      expect(find.text('Berlin Marathon'), findsOneWidget);
      expect(find.text('Marathon'), findsOneWidget);
    });
  });
}
