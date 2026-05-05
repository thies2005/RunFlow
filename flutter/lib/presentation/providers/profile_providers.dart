import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/profile_entities.dart';
import 'package:runflow_flutter/data/repositories/profile_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'profile_providers.g.dart';

@Riverpod(keepAlive: true)
ProfileRepository profileRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  return ProfileRepositoryImpl(dio: client.dio);
}

@riverpod
class Profile extends _$Profile {
  @override
  Future<UserProfile> build() async {
    final repo = ref.read(profileRepositoryProvider);
    return repo.getProfile();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final repo = ref.read(profileRepositoryProvider);
    state = await AsyncValue.guard(repo.getProfile);
  }

  Future<void> updateProfile(UpdateProfileRequest request) async {
    final repo = ref.read(profileRepositoryProvider);
    final updated = await repo.updateProfile(request);
    state = AsyncValue.data(updated);
  }
}

enum UnitSystem { metric, imperial }

enum AppThemeMode { light, dark, system }

@Riverpod(keepAlive: true)
class Settings extends _$Settings {
  static const _unitKey = 'settings_unit_system';
  static const _themeKey = 'settings_theme_mode';
  static const _workoutRemindersKey = 'settings_workout_reminders';
  static const _supplementRemindersKey = 'settings_supplement_reminders';
  static const _chatNotificationsKey = 'settings_chat_notifications';
  static const _syncNotificationsKey = 'settings_sync_notifications';
  static const _aiShareActivitiesKey = 'settings_ai_share_activities';
  static const _aiShareHealthDataKey = 'settings_ai_share_health_data';
  static const _aiShareGoalsKey = 'settings_ai_share_goals';
  static const _workoutReminderHourKey = 'settings_workout_reminder_hour';
  static const _workoutReminderMinuteKey = 'settings_workout_reminder_minute';
  static const _supplementMorningHourKey = 'settings_supplement_morning_hour';
  static const _supplementMorningMinuteKey = 'settings_supplement_morning_minute';
  static const _supplementAfternoonHourKey = 'settings_supplement_afternoon_hour';
  static const _supplementAfternoonMinuteKey = 'settings_supplement_afternoon_minute';
  static const _supplementEveningHourKey = 'settings_supplement_evening_hour';
  static const _supplementEveningMinuteKey = 'settings_supplement_evening_minute';
  static const _supplementNightHourKey = 'settings_supplement_night_hour';
  static const _supplementNightMinuteKey = 'settings_supplement_night_minute';

  @override
  AppSettings build() {
    _loadSettings();
    return const AppSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    state = AppSettings(
      unitSystem: UnitSystem.values[prefs.getInt(_unitKey) ?? 0],
      themeMode: AppThemeMode.values[prefs.getInt(_themeKey) ?? 2],
      workoutReminders: prefs.getBool(_workoutRemindersKey) ?? true,
      supplementReminders: prefs.getBool(_supplementRemindersKey) ?? true,
      chatNotifications: prefs.getBool(_chatNotificationsKey) ?? true,
      syncNotifications: prefs.getBool(_syncNotificationsKey) ?? true,
      aiShareActivities: prefs.getBool(_aiShareActivitiesKey) ?? true,
      aiShareHealthData: prefs.getBool(_aiShareHealthDataKey) ?? true,
      aiShareGoals: prefs.getBool(_aiShareGoalsKey) ?? true,
      workoutReminderHour: prefs.getInt(_workoutReminderHourKey) ?? 7,
      workoutReminderMinute: prefs.getInt(_workoutReminderMinuteKey) ?? 0,
      supplementMorningHour: prefs.getInt(_supplementMorningHourKey) ?? 8,
      supplementMorningMinute: prefs.getInt(_supplementMorningMinuteKey) ?? 0,
      supplementAfternoonHour: prefs.getInt(_supplementAfternoonHourKey) ?? 13,
      supplementAfternoonMinute: prefs.getInt(_supplementAfternoonMinuteKey) ?? 0,
      supplementEveningHour: prefs.getInt(_supplementEveningHourKey) ?? 18,
      supplementEveningMinute: prefs.getInt(_supplementEveningMinuteKey) ?? 0,
      supplementNightHour: prefs.getInt(_supplementNightHourKey) ?? 21,
      supplementNightMinute: prefs.getInt(_supplementNightMinuteKey) ?? 0,
    );
  }

  Future<void> setUnitSystem(UnitSystem unit) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_unitKey, unit.index);
    state = state.copyWith(unitSystem: unit);
  }

  Future<void> setThemeMode(AppThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_themeKey, mode.index);
    state = state.copyWith(themeMode: mode);
  }

  Future<void> setWorkoutReminders(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_workoutRemindersKey, value);
    state = state.copyWith(workoutReminders: value);
  }

  Future<void> setSupplementReminders(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_supplementRemindersKey, value);
    state = state.copyWith(supplementReminders: value);
  }

  Future<void> setChatNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_chatNotificationsKey, value);
    state = state.copyWith(chatNotifications: value);
  }

  Future<void> setSyncNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_syncNotificationsKey, value);
    state = state.copyWith(syncNotifications: value);
  }

  Future<void> setAiShareActivities(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_aiShareActivitiesKey, value);
    state = state.copyWith(aiShareActivities: value);
  }

  Future<void> setAiShareHealthData(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_aiShareHealthDataKey, value);
    state = state.copyWith(aiShareHealthData: value);
  }

  Future<void> setAiShareGoals(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_aiShareGoalsKey, value);
    state = state.copyWith(aiShareGoals: value);
  }

  Future<void> setWorkoutReminderTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_workoutReminderHourKey, hour);
    await prefs.setInt(_workoutReminderMinuteKey, minute);
    state = state.copyWith(workoutReminderHour: hour, workoutReminderMinute: minute);
  }

  Future<void> setSupplementMorningTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_supplementMorningHourKey, hour);
    await prefs.setInt(_supplementMorningMinuteKey, minute);
    state = state.copyWith(supplementMorningHour: hour, supplementMorningMinute: minute);
  }

  Future<void> setSupplementAfternoonTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_supplementAfternoonHourKey, hour);
    await prefs.setInt(_supplementAfternoonMinuteKey, minute);
    state = state.copyWith(supplementAfternoonHour: hour, supplementAfternoonMinute: minute);
  }

  Future<void> setSupplementEveningTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_supplementEveningHourKey, hour);
    await prefs.setInt(_supplementEveningMinuteKey, minute);
    state = state.copyWith(supplementEveningHour: hour, supplementEveningMinute: minute);
  }

  Future<void> setSupplementNightTime(int hour, int minute) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_supplementNightHourKey, hour);
    await prefs.setInt(_supplementNightMinuteKey, minute);
    state = state.copyWith(supplementNightHour: hour, supplementNightMinute: minute);
  }
}

class AppSettings {
  const AppSettings({
    this.unitSystem = UnitSystem.metric,
    this.themeMode = AppThemeMode.system,
    this.workoutReminders = true,
    this.supplementReminders = true,
    this.chatNotifications = true,
    this.syncNotifications = true,
    this.aiShareActivities = true,
    this.aiShareHealthData = true,
    this.aiShareGoals = true,
    this.workoutReminderHour = 7,
    this.workoutReminderMinute = 0,
    this.supplementMorningHour = 8,
    this.supplementMorningMinute = 0,
    this.supplementAfternoonHour = 13,
    this.supplementAfternoonMinute = 0,
    this.supplementEveningHour = 18,
    this.supplementEveningMinute = 0,
    this.supplementNightHour = 21,
    this.supplementNightMinute = 0,
  });

  final UnitSystem unitSystem;
  final AppThemeMode themeMode;
  final bool workoutReminders;
  final bool supplementReminders;
  final bool chatNotifications;
  final bool syncNotifications;
  final bool aiShareActivities;
  final bool aiShareHealthData;
  final bool aiShareGoals;
  final int workoutReminderHour;
  final int workoutReminderMinute;
  final int supplementMorningHour;
  final int supplementMorningMinute;
  final int supplementAfternoonHour;
  final int supplementAfternoonMinute;
  final int supplementEveningHour;
  final int supplementEveningMinute;
  final int supplementNightHour;
  final int supplementNightMinute;

  AppSettings copyWith({
    UnitSystem? unitSystem,
    AppThemeMode? themeMode,
    bool? workoutReminders,
    bool? supplementReminders,
    bool? chatNotifications,
    bool? syncNotifications,
    bool? aiShareActivities,
    bool? aiShareHealthData,
    bool? aiShareGoals,
    int? workoutReminderHour,
    int? workoutReminderMinute,
    int? supplementMorningHour,
    int? supplementMorningMinute,
    int? supplementAfternoonHour,
    int? supplementAfternoonMinute,
    int? supplementEveningHour,
    int? supplementEveningMinute,
    int? supplementNightHour,
    int? supplementNightMinute,
  }) {
    return AppSettings(
      unitSystem: unitSystem ?? this.unitSystem,
      themeMode: themeMode ?? this.themeMode,
      workoutReminders: workoutReminders ?? this.workoutReminders,
      supplementReminders: supplementReminders ?? this.supplementReminders,
      chatNotifications: chatNotifications ?? this.chatNotifications,
      syncNotifications: syncNotifications ?? this.syncNotifications,
      aiShareActivities: aiShareActivities ?? this.aiShareActivities,
      aiShareHealthData: aiShareHealthData ?? this.aiShareHealthData,
      aiShareGoals: aiShareGoals ?? this.aiShareGoals,
      workoutReminderHour: workoutReminderHour ?? this.workoutReminderHour,
      workoutReminderMinute: workoutReminderMinute ?? this.workoutReminderMinute,
      supplementMorningHour: supplementMorningHour ?? this.supplementMorningHour,
      supplementMorningMinute: supplementMorningMinute ?? this.supplementMorningMinute,
      supplementAfternoonHour: supplementAfternoonHour ?? this.supplementAfternoonHour,
      supplementAfternoonMinute: supplementAfternoonMinute ?? this.supplementAfternoonMinute,
      supplementEveningHour: supplementEveningHour ?? this.supplementEveningHour,
      supplementEveningMinute: supplementEveningMinute ?? this.supplementEveningMinute,
      supplementNightHour: supplementNightHour ?? this.supplementNightHour,
      supplementNightMinute: supplementNightMinute ?? this.supplementNightMinute,
    );
  }
}
