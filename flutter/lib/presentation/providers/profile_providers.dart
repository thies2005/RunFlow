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
    );
  }
}
