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
  static const String legacyRefreshUrl = '$mobileBaseUrl$refreshPath';
  static const String dashboardPath = '/dashboard';
  static const String activitiesPath = '/activities';
  static const String goalsPath = '/goals';
  static const String workoutsPath = '/workouts';
  static const String syncPath = '/sync';
  static const String analyticsStatsPath = '/analytics/stats';
  static const String analyticsHistoryPath = '/analytics/history';
  static const String userProfilePath = '/user/profile';

  static const String chatSessionsPath = '/chat/sessions';
  static String chatSessionPath(String id) => '/chat/sessions/$id';
  static String chatSessionMessagesPath(String id) =>
      '/chat/sessions/$id/messages';

  static String get aiChatSessionsUrl => '$baseUrl/ai/chat/sessions';
  static String get aiChatHistoryUrl => '$baseUrl/ai/chat/history';
  static String get aiChatStreamUrl => '$baseUrl/ai/chat';
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
