import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/login_screen.dart';
import 'package:runflow_flutter/presentation/screens/auth/register_screen.dart';
import 'package:runflow_flutter/presentation/screens/auth/forgot_password_screen.dart';
import 'package:runflow_flutter/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_detail_screen.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_list_screen.dart';
import 'package:runflow_flutter/presentation/screens/analytics/analytics_screen.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_list_screen.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_detail_screen.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_setup_wizard.dart';
import 'package:runflow_flutter/presentation/screens/profile/profile_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/edit_profile_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/hr_zone_editor_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/about_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/ai_settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/logs_screen.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/health_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/barcode_scanner_screen.dart';
import 'package:runflow_flutter/presentation/screens/onboarding/onboarding_screen.dart';
import 'package:runflow_flutter/presentation/screens/startup/startup_screen.dart';
import 'package:runflow_flutter/presentation/widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(Ref ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/startup',
    redirect: (context, state) async {
      final authState = ref.read(authStateProvider);
      final onboardingComplete = await OnboardingScreen.isCompleted();
      final isStartup = state.matchedLocation == '/startup';
      final isLoggingIn = state.matchedLocation == '/login';
      final isOnboarding = state.matchedLocation == '/onboarding';
      final isRegistering = state.matchedLocation == '/register';
      final isForgotPassword = state.matchedLocation == '/forgot-password';
      final isPublicAuth = isLoggingIn || isRegistering || isForgotPassword;
      final isAuthenticated =
          authState is AsyncData<User?> && authState.value != null;

      if (!onboardingComplete) {
        return isOnboarding ? null : '/onboarding';
      }

      if (isOnboarding) {
        return isAuthenticated ? '/dashboard' : '/login';
      }

      if (authState.isLoading) {
        return isStartup ? null : '/startup';
      }

      if (isStartup) {
        return isAuthenticated ? '/dashboard' : '/login';
      }

      if (!isAuthenticated && !isPublicAuth && !isOnboarding) {
        return '/login';
      }
      if (isAuthenticated && isPublicAuth) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/startup',
        builder: (context, state) => const StartupScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) => const ChatScreen(),
      ),
      GoRoute(
        path: '/health',
        builder: (context, state) => const HealthScreen(),
      ),
      GoRoute(
        path: '/health/scan',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const BarcodeScannerScreen(),
      ),
      GoRoute(
        path: '/profile/edit',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/profile/hr-zones',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const HrZoneEditorScreen(),
      ),
      GoRoute(
        path: '/profile/settings',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/settings/about',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AboutScreen(),
      ),
      GoRoute(
        path: '/settings/ai',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AiSettingsScreen(),
      ),
      GoRoute(
        path: '/settings/logs',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const LogsScreen(),
      ),
      GoRoute(
        path: '/activities/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ActivityDetailScreen(activityId: id);
        },
      ),
      GoRoute(
        path: '/goals/new',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const GoalSetupWizard(),
      ),
      GoRoute(
        path: '/goals/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return GoalDetailScreen(goalId: id);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/activities',
                builder: (context, state) => const ActivityListScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/analytics',
                builder: (context, state) => const AnalyticsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/goals',
                builder: (context, state) => const GoalListScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

final routerProvider = Provider<GoRouter>((ref) {
  final router = createRouter(ref);

  ref.listen(authStateProvider, (previous, next) {
    router.refresh();
  });

  return router;
});
