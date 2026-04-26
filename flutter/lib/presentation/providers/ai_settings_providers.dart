import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'ai_settings_providers.g.dart';

@Riverpod(keepAlive: true)
class AiSettings extends _$AiSettings {
  static const _enabledKey = 'ai_settings_enabled';
  static const _hasApiKeyKey = 'ai_settings_has_api_key';
  static const _baseUrlKey = 'ai_settings_base_url';
  static const _modelKey = 'ai_settings_model';
  static const _feedbackModeKey = 'ai_settings_feedback_mode';
  static const _customPromptKey = 'ai_settings_custom_prompt';
  static const _accessFitnessMetricsKey = 'ai_access_fitness_metrics';
  static const _accessActivityHistoryKey = 'ai_access_activity_history';
  static const _accessHeartRateDataKey = 'ai_access_heart_rate_data';
  static const _accessGoalsKey = 'ai_access_goals';
  static const _accessTrainingPlanKey = 'ai_access_training_plan';
  static const _accessPerformanceKey = 'ai_access_performance';
  static const _accessBiometricsKey = 'ai_access_biometrics';
  static const _accessAllActivitiesKey = 'ai_access_all_activities';
  static const _accessActivityLogsKey = 'ai_access_activity_logs';
  static const _accessNutritionLogsKey = 'ai_access_nutrition_logs';

  @override
  AiSettingsState build() {
    _loadSettings();
    return const AiSettingsState();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    state = AiSettingsState(
      aiEnabled: prefs.getBool(_enabledKey) ?? false,
      hasCustomApiKey: prefs.getBool(_hasApiKeyKey) ?? false,
      customBaseUrl: prefs.getString(_baseUrlKey) ?? '',
      customModel: prefs.getString(_modelKey) ?? '',
      feedbackMode: prefs.getString(_feedbackModeKey) ?? 'verbose',
      customPrompt: prefs.getString(_customPromptKey) ?? '',
      accessFitnessMetrics: prefs.getBool(_accessFitnessMetricsKey) ?? true,
      accessActivityHistory:
          prefs.getBool(_accessActivityHistoryKey) ?? true,
      accessHeartRateData: prefs.getBool(_accessHeartRateDataKey) ?? true,
      accessGoals: prefs.getBool(_accessGoalsKey) ?? true,
      accessTrainingPlan: prefs.getBool(_accessTrainingPlanKey) ?? true,
      accessPerformance: prefs.getBool(_accessPerformanceKey) ?? true,
      accessBiometrics: prefs.getBool(_accessBiometricsKey) ?? true,
      accessAllActivities: prefs.getBool(_accessAllActivitiesKey) ?? false,
      accessActivityLogs: prefs.getBool(_accessActivityLogsKey) ?? true,
      accessNutritionLogs: prefs.getBool(_accessNutritionLogsKey) ?? false,
    );
  }

  Future<void> setAiEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, value);
    state = state.copyWith(aiEnabled: value);
  }

  Future<void> setCustomApiKey(String value) async {
    final prefs = await SharedPreferences.getInstance();
    final hasKey = value.isNotEmpty;
    await prefs.setBool(_hasApiKeyKey, hasKey);
    state = state.copyWith(hasCustomApiKey: hasKey);
  }

  Future<void> setCustomBaseUrl(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, value);
    state = state.copyWith(customBaseUrl: value);
  }

  Future<void> setCustomModel(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_modelKey, value);
    state = state.copyWith(customModel: value);
  }

  Future<void> setFeedbackMode(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_feedbackModeKey, value);
    state = state.copyWith(feedbackMode: value);
  }

  Future<void> setCustomPrompt(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_customPromptKey, value);
    state = state.copyWith(customPrompt: value);
  }

  Future<void> removeApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_hasApiKeyKey);
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_modelKey);
    state = state.copyWith(
      hasCustomApiKey: false,
      customBaseUrl: '',
      customModel: '',
    );
  }

  Future<void> setAccessFitnessMetrics(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessFitnessMetricsKey, value);
    state = state.copyWith(accessFitnessMetrics: value);
  }

  Future<void> setAccessActivityHistory(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessActivityHistoryKey, value);
    state = state.copyWith(accessActivityHistory: value);
  }

  Future<void> setAccessHeartRateData(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessHeartRateDataKey, value);
    state = state.copyWith(accessHeartRateData: value);
  }

  Future<void> setAccessGoals(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessGoalsKey, value);
    state = state.copyWith(accessGoals: value);
  }

  Future<void> setAccessTrainingPlan(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessTrainingPlanKey, value);
    state = state.copyWith(accessTrainingPlan: value);
  }

  Future<void> setAccessPerformance(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessPerformanceKey, value);
    state = state.copyWith(accessPerformance: value);
  }

  Future<void> setAccessBiometrics(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessBiometricsKey, value);
    state = state.copyWith(accessBiometrics: value);
  }

  Future<void> setAccessAllActivities(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessAllActivitiesKey, value);
    state = state.copyWith(accessAllActivities: value);
  }

  Future<void> setAccessActivityLogs(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessActivityLogsKey, value);
    state = state.copyWith(accessActivityLogs: value);
  }

  Future<void> setAccessNutritionLogs(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessNutritionLogsKey, value);
    state = state.copyWith(accessNutritionLogs: value);
  }

  Future<void> enableAllAccess() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessFitnessMetricsKey, true);
    await prefs.setBool(_accessActivityHistoryKey, true);
    await prefs.setBool(_accessHeartRateDataKey, true);
    await prefs.setBool(_accessGoalsKey, true);
    await prefs.setBool(_accessTrainingPlanKey, true);
    await prefs.setBool(_accessPerformanceKey, true);
    await prefs.setBool(_accessBiometricsKey, true);
    await prefs.setBool(_accessAllActivitiesKey, true);
    await prefs.setBool(_accessActivityLogsKey, true);
    await prefs.setBool(_accessNutritionLogsKey, true);
    state = state.copyWith(
      accessFitnessMetrics: true,
      accessActivityHistory: true,
      accessHeartRateData: true,
      accessGoals: true,
      accessTrainingPlan: true,
      accessPerformance: true,
      accessBiometrics: true,
      accessAllActivities: true,
      accessActivityLogs: true,
      accessNutritionLogs: true,
    );
  }

  Future<void> disableAllAccess() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_accessFitnessMetricsKey, false);
    await prefs.setBool(_accessActivityHistoryKey, false);
    await prefs.setBool(_accessHeartRateDataKey, false);
    await prefs.setBool(_accessGoalsKey, false);
    await prefs.setBool(_accessTrainingPlanKey, false);
    await prefs.setBool(_accessPerformanceKey, false);
    await prefs.setBool(_accessBiometricsKey, false);
    await prefs.setBool(_accessAllActivitiesKey, false);
    await prefs.setBool(_accessActivityLogsKey, false);
    await prefs.setBool(_accessNutritionLogsKey, false);
    state = state.copyWith(
      accessFitnessMetrics: false,
      accessActivityHistory: false,
      accessHeartRateData: false,
      accessGoals: false,
      accessTrainingPlan: false,
      accessPerformance: false,
      accessBiometrics: false,
      accessAllActivities: false,
      accessActivityLogs: false,
      accessNutritionLogs: false,
    );
  }
}

class AiSettingsState {
  const AiSettingsState({
    this.aiEnabled = false,
    this.hasCustomApiKey = false,
    this.customBaseUrl = '',
    this.customModel = '',
    this.feedbackMode = 'verbose',
    this.customPrompt = '',
    this.accessFitnessMetrics = true,
    this.accessActivityHistory = true,
    this.accessHeartRateData = true,
    this.accessGoals = true,
    this.accessTrainingPlan = true,
    this.accessPerformance = true,
    this.accessBiometrics = true,
    this.accessAllActivities = false,
    this.accessActivityLogs = true,
    this.accessNutritionLogs = false,
  });

  final bool aiEnabled;
  final bool hasCustomApiKey;
  final String customBaseUrl;
  final String customModel;
  final String feedbackMode;
  final String customPrompt;
  final bool accessFitnessMetrics;
  final bool accessActivityHistory;
  final bool accessHeartRateData;
  final bool accessGoals;
  final bool accessTrainingPlan;
  final bool accessPerformance;
  final bool accessBiometrics;
  final bool accessAllActivities;
  final bool accessActivityLogs;
  final bool accessNutritionLogs;

  AiSettingsState copyWith({
    bool? aiEnabled,
    bool? hasCustomApiKey,
    String? customBaseUrl,
    String? customModel,
    String? feedbackMode,
    String? customPrompt,
    bool? accessFitnessMetrics,
    bool? accessActivityHistory,
    bool? accessHeartRateData,
    bool? accessGoals,
    bool? accessTrainingPlan,
    bool? accessPerformance,
    bool? accessBiometrics,
    bool? accessAllActivities,
    bool? accessActivityLogs,
    bool? accessNutritionLogs,
  }) {
    return AiSettingsState(
      aiEnabled: aiEnabled ?? this.aiEnabled,
      hasCustomApiKey: hasCustomApiKey ?? this.hasCustomApiKey,
      customBaseUrl: customBaseUrl ?? this.customBaseUrl,
      customModel: customModel ?? this.customModel,
      feedbackMode: feedbackMode ?? this.feedbackMode,
      customPrompt: customPrompt ?? this.customPrompt,
      accessFitnessMetrics: accessFitnessMetrics ?? this.accessFitnessMetrics,
      accessActivityHistory:
          accessActivityHistory ?? this.accessActivityHistory,
      accessHeartRateData: accessHeartRateData ?? this.accessHeartRateData,
      accessGoals: accessGoals ?? this.accessGoals,
      accessTrainingPlan: accessTrainingPlan ?? this.accessTrainingPlan,
      accessPerformance: accessPerformance ?? this.accessPerformance,
      accessBiometrics: accessBiometrics ?? this.accessBiometrics,
      accessAllActivities: accessAllActivities ?? this.accessAllActivities,
      accessActivityLogs: accessActivityLogs ?? this.accessActivityLogs,
      accessNutritionLogs: accessNutritionLogs ?? this.accessNutritionLogs,
    );
  }
}
