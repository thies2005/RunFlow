import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:runflow_flutter/presentation/providers/core_providers.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/login_screen.dart';
import 'package:runflow_flutter/presentation/screens/auth/register_screen.dart';
import 'package:runflow_flutter/presentation/screens/auth/forgot_password_screen.dart';
import 'package:runflow_flutter/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_detail_screen.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_list_screen.dart';
import 'package:runflow_flutter/presentation/screens/activities/activity_route_screen.dart';
import 'package:runflow_flutter/presentation/screens/analytics/analytics_screen.dart';
import 'package:runflow_flutter/presentation/screens/analytics/heatmap_screen.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_list_screen.dart';
import 'package:runflow_flutter/presentation/screens/plan/plan_screen.dart';
import 'package:runflow_flutter/presentation/screens/goals/goal_detail_screen.dart';
import 'package:runflow_flutter/presentation/screens/onboarding/unified_plan_wizard.dart';
import 'package:runflow_flutter/presentation/screens/profile/profile_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/edit_profile_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/hr_zone_editor_screen.dart';
import 'package:runflow_flutter/presentation/screens/profile/settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/about_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/ai_settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/api_key_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/consent_management_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/logs_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/recipe_settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/health_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/barcode_scanner_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/food_search_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/nutrition_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/supplements_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/body_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/vitals_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/sleep_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/fasting_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/ai_scan_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/readiness_detail_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/nutrition_library_screen.dart';
import 'package:runflow_flutter/presentation/screens/onboarding/feature_showcase_screen.dart';
import 'package:runflow_flutter/presentation/screens/startup/startup_screen.dart';
import 'package:runflow_flutter/presentation/screens/record/record_tab_screen.dart';
import 'package:runflow_flutter/presentation/screens/record/strength_recording_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/strength_settings_screen.dart';
import 'package:runflow_flutter/presentation/screens/settings/workout_template_editor_screen.dart';
import 'package:runflow_flutter/presentation/screens/race/race_result_screen.dart';
import 'package:runflow_flutter/presentation/screens/workout/workout_builder_screen.dart';
import 'package:runflow_flutter/presentation/screens/workout/workout_preview_screen.dart';
import 'package:runflow_flutter/presentation/screens/workout/workout_templates_screen.dart';
import 'package:runflow_flutter/presentation/widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(Ref ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/startup',
    observers: kReleaseMode ? [SentryNavigatorObserver()] : null,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final prefs = ref.read(sharedPreferencesProvider);
      final onboardingComplete =
          prefs.getBool(AppConstants.onboardingCompletedKey) ?? false;
      final showcaseComplete =
          prefs.getBool('showcase_completed') ?? false;
      final isStartup = state.matchedLocation == '/startup';
      final isLoggingIn = state.matchedLocation == '/login';
      final isOnboarding = state.matchedLocation == '/onboarding';
      final isOnboardingWizard =
          state.matchedLocation == '/onboarding/wizard';
      final isRegistering = state.matchedLocation == '/register';
      final isForgotPassword = state.matchedLocation == '/forgot-password';
      final isPublicAuth = isLoggingIn || isRegistering || isForgotPassword;
      final isAuthenticated =
          authState is AsyncData<User?> && authState.value != null;

      if (onboardingComplete) {
        if (isOnboarding || isOnboardingWizard) {
          return isAuthenticated ? '/dashboard' : '/login';
        }
      } else if (showcaseComplete) {
        if (isOnboardingWizard) return null;
        if (isOnboarding) return '/onboarding/wizard';
        return '/onboarding/wizard';
      } else {
        if (isOnboarding) return null;
        return '/onboarding';
      }

      if (authState.isLoading) {
        return isStartup ? null : '/startup';
      }

      if (isStartup) {
        return isAuthenticated ? '/dashboard' : '/login';
      }

      if (!isAuthenticated && !isPublicAuth) {
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
        builder: (context, state) => const FeatureShowcaseScreen(),
      ),
      GoRoute(
        path: '/onboarding/wizard',
        builder: (context, state) =>
            const UnifiedPlanWizard(isFromOnboarding: true),
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
        path: '/analytics',
        builder: (context, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/analytics/heatmap',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const HeatmapScreen(),
      ),
      GoRoute(
        path: '/goals',
        builder: (context, state) => const GoalListScreen(),
      ),
      GoRoute(
        path: '/health/scan',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const BarcodeScannerScreen(),
      ),
      GoRoute(
        path: '/health/food-search',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const FoodSearchScreen(),
      ),
      GoRoute(
        path: '/health/nutrition',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NutritionScreen(),
      ),
      GoRoute(
        path: '/health/library',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const NutritionLibraryScreen(),
      ),
      GoRoute(
        path: '/health/supplements',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SupplementsScreen(),
      ),
      GoRoute(
        path: '/health/readiness',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ReadinessDetailScreen(),
      ),
      GoRoute(
        path: '/health/body',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const BodyScreen(),
      ),
      GoRoute(
        path: '/health/vitals',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const VitalsScreen(),
      ),
      GoRoute(
        path: '/health/sleep',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SleepScreen(),
      ),
      GoRoute(
        path: '/health/fasting',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const FastingScreen(),
      ),
      GoRoute(
        path: '/health/ai-scan',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AiScanScreen(),
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
        path: '/settings/strength',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const StrengthSettingsScreen(),
      ),
      GoRoute(
        path: '/settings/strength/template/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'];
          return WorkoutTemplateEditorScreen(templateId: id);
        },
      ),
      GoRoute(
        path: '/strength/recording',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final templateId = state.uri.queryParameters['templateId'];
          return StrengthRecordingScreen(templateId: templateId);
        },
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
        path: '/settings/recipe',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const RecipeSettingsScreen(),
      ),
      GoRoute(
        path: '/settings/logs',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const LogsScreen(),
      ),
      GoRoute(
        path: '/settings/api-key',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ApiKeyScreen(),
      ),
      GoRoute(
        path: '/settings/consent',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ConsentManagementScreen(),
      ),
      GoRoute(
        path: '/activities',
        builder: (context, state) => const ActivityListScreen(),
      ),
      GoRoute(
        path: '/activities/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ActivityDetailScreen(activityId: id);
        },
      ),
      GoRoute(
        path: '/activities/:id/route',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ActivityRouteScreen(activityId: id);
        },
      ),
      GoRoute(
        path: '/goals/new',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) =>
            const UnifiedPlanWizard(isFromOnboarding: false),
      ),
      GoRoute(
        path: '/goals/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return GoalDetailScreen(goalId: id);
        },
      ),
      GoRoute(
        path: '/race-result/:goalId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final goalId = state.pathParameters['goalId']!;
          return RaceResultScreen(goalId: goalId);
        },
      ),
      GoRoute(
        path: '/workout/templates',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const WorkoutTemplatesScreen(),
      ),
      GoRoute(
        path: '/workout/builder',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const WorkoutBuilderScreen(),
      ),
      GoRoute(
        path: '/workout/preview/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return WorkoutPreviewScreen(templateId: id);
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
                path: '/plan',
                builder: (context, state) => const PlanScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/record',
                builder: (context, state) {
                  final workoutId = state.uri.queryParameters['workoutId'];
                  final templateId = state.uri.queryParameters['templateId'];
                  return RecordTabScreen(workoutId: workoutId, templateId: templateId);
                },
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/health',
                builder: (context, state) => const HealthScreen(),
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
