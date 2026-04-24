import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
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
}

class AppSettings {
  const AppSettings({
    this.unitSystem = UnitSystem.metric,
    this.themeMode = AppThemeMode.system,
    this.workoutReminders = true,
    this.supplementReminders = true,
    this.chatNotifications = true,
  });

  final UnitSystem unitSystem;
  final AppThemeMode themeMode;
  final bool workoutReminders;
  final bool supplementReminders;
  final bool chatNotifications;

  AppSettings copyWith({
    UnitSystem? unitSystem,
    AppThemeMode? themeMode,
    bool? workoutReminders,
    bool? supplementReminders,
    bool? chatNotifications,
  }) {
    return AppSettings(
      unitSystem: unitSystem ?? this.unitSystem,
      themeMode: themeMode ?? this.themeMode,
      workoutReminders: workoutReminders ?? this.workoutReminders,
      supplementReminders: supplementReminders ?? this.supplementReminders,
      chatNotifications: chatNotifications ?? this.chatNotifications,
    );
  }
}
