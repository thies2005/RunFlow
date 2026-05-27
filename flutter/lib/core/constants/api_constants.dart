class ApiConstants {
  ApiConstants._();

  static const String baseUrl = String.fromEnvironment(
    'RUNFLOW_BASE_URL',
    defaultValue: 'https://runflow.schuelken.uk',
  );
  static const String mobileBasePath = '/api/mobile';
  static const String apiBasePath = '/api/mobile/v1';
  static const String mobileBaseUrl = '$baseUrl$mobileBasePath';
  static const String fullApiUrl = '$baseUrl$apiBasePath';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);

  static const String loginPath = '/auth/login';
  static const String emailLoginPath = '/auth/email-login';
  static const String refreshPath = '/auth/refresh';
  static const String registerPath = '/auth/register';
  static const String forgotPasswordPath = '/auth/forgot-password';
  static const String dashboardPath = '/dashboard';
  static const String activitiesPath = '/activities';
  static const String workoutsPath = '/workouts';
  static const String syncPath = '/sync';
  static const String analyticsStatsPath = '/analytics/stats';
  static const String analyticsHistoryPath = '/analytics/history';
  static const String userProfilePath = '/user/profile';

  static const String chatSessionsPath = '/chat/sessions';
  static String chatSessionPath(String id) => '/chat/sessions/$id';
  static String chatSessionMessagesPath(String id) =>
      '/chat/sessions/$id/messages';

  static String get aiChatSessionsUrl => '$baseUrl/api/ai/chat/sessions';
  static String get aiChatHistoryUrl => '$baseUrl/api/ai/chat/history';
  static String get aiChatStreamUrl => '$baseUrl/api/ai/chat';

  static const String nutritionLogPath = '/health/nutrition/log';
  static const String nutritionSearchPath = '/health/nutrition/search';
  static const String nutritionScanPath = '/health/nutrition/scan';
  static const String nutritionAiScanPath = '/health/nutrition/ai-scan';
  static const String nutritionTargetPath = '/health/nutrition/target';
  static const String nutritionAnalyticsPath = '/health/nutrition/analytics';
  static const String fastingPath = '/health/fasting';
  static const String bodyCompositionPath = '/health/body-composition';
  static const String healthSyncBatchPath = '/health/sync-batch';
  static const String healthInsightsPath = '/health/insights';
  static const String healthHistoryPath = '/health/history';
  static const String healthDailyPath = '/health/daily';
  static const String supplementsPath = '/health/supplements';
  static const String supplementsAnalyticsPath = '/health/supplements/analytics';
  static const String apiKeyPath = '/settings/api-key';
  static const String verifyEmailPath = '/auth/verify-email';
  static const String resendVerificationPath = '/auth/resend-verification';
  static const String consentCheckPath = '/user/consent/check';
  static const String consentPath = '/user/consent';
  static const String nutritionSuggestPath = '/health/nutrition/suggest';
  static const String nutritionFavoritesPath = '/health/nutrition/favorites';
  static const String nutritionMealsPath = '/health/nutrition/meals';
  static const String workoutReorderPath = '/workouts/reorder';
  static const String readinessDailyPath = '/readiness/daily';
  static const String readinessHistoryPath = '/readiness/history';
  static const String readinessBaselinePath = '/readiness/baseline';
  static const String readinessWeeklyPath = '/readiness/weekly';
  static String get plansUrl => '$baseUrl/api/plans';
  static String planUrl(String id) => '$baseUrl/api/plans/$id';
  static String subGoalsUrl(String goalId) => '$baseUrl/api/plan-advanced/$goalId/sub-goals';
}

class AppConstants {
  AppConstants._();

  static const String appName = 'RunFlow';
  static const String stravaClientId = String.fromEnvironment(
    'STRAVA_CLIENT_ID',
    defaultValue: '',
  );
  static const String stravaRedirectUri = String.fromEnvironment(
    'STRAVA_REDIRECT_URI',
    defaultValue: 'https://runflow.schuelken.uk/api/auth/strava/callback',
  );
  static const String stravaCallbackScheme = 'runflow2';
  static const String stravaCallbackHost = 'auth';
  static const String stravaCallbackPath = '/callback';

  static const int defaultPageSize = 50;
  static const int maxCachedActivities = 50;
  static const Duration backgroundSyncInterval = Duration(minutes: 30);

  static const String sentryDsn = String.fromEnvironment(
    'SENTRY_DSN',
    defaultValue: '',
  );
  static const String onboardingCompletedKey = 'onboarding_completed';

  static bool get isStravaConfigured {
    final clientId = stravaClientId.trim();
    return clientId.isNotEmpty && !clientId.startsWith('<');
  }
}
