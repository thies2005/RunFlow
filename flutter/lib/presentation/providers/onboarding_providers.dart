import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'onboarding_providers.g.dart';

enum OnboardingStep {
  platformSelect,
  syncData,
  analyzeProfile,
  planSetup,
}

@Riverpod(keepAlive: true)
HealthConnectService healthConnectService(Ref ref) {
  return HealthConnectServiceImpl();
}

@riverpod
class Onboarding extends _$Onboarding {
  static const _stepKey = 'onboarding_step';
  static const _connectedKey = 'onboarding_connected_platforms';
  static const _syncStatusKey = 'onboarding_sync_status';

  @override
  OnboardingState build() {
    _loadState();
    return const OnboardingState();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    final stepIndex = prefs.getInt(_stepKey) ?? 0;
    final connected =
        prefs.getStringList(_connectedKey) ?? <String>[];
    final hasSynced = prefs.getBool(_syncStatusKey) ?? false;

    state = OnboardingState(
      currentStep: OnboardingStep.values[stepIndex.clamp(0, 3)],
      connectedPlatforms: connected,
      hasSynced: hasSynced,
    );
  }

  Future<void> setStep(OnboardingStep step) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_stepKey, step.index);
    state = state.copyWith(currentStep: step);
  }

  Future<void> nextStep() async {
    final currentIndex = state.currentStep.index;
    if (currentIndex < OnboardingStep.values.length - 1) {
      await setStep(OnboardingStep.values[currentIndex + 1]);
    }
  }

  Future<void> previousStep() async {
    final currentIndex = state.currentStep.index;
    if (currentIndex > 0) {
      await setStep(OnboardingStep.values[currentIndex - 1]);
    }
  }

  Future<void> connectStrava(String code) async {
    try {
      await ref.read(authStateProvider.notifier).loginWithStravaCode(code);
      final prefs = await SharedPreferences.getInstance();
      final connected = [...state.connectedPlatforms, 'strava'];
      await prefs.setStringList(_connectedKey, connected);
      state = state.copyWith(connectedPlatforms: connected);
    } catch (_) {}
  }

  Future<void> markPlatformConnected(String platformId) async {
    final prefs = await SharedPreferences.getInstance();
    final connected = [...state.connectedPlatforms, platformId];
    await prefs.setStringList(_connectedKey, connected);
    state = state.copyWith(connectedPlatforms: connected);
  }

  Future<void> markSynced() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_syncStatusKey, true);
    state = state.copyWith(hasSynced: true);
  }

  Future<void> setImportRange(String range) async {
    state = state.copyWith(importRange: range);
  }

  void setSyncing(bool value) {
    state = state.copyWith(isSyncing: value);
  }
}

class OnboardingState {
  const OnboardingState({
    this.currentStep = OnboardingStep.platformSelect,
    this.connectedPlatforms = const [],
    this.hasSynced = false,
    this.isSyncing = false,
    this.importRange = 'ALL',
    this.syncedActivityCount = 0,
  });

  final OnboardingStep currentStep;
  final List<String> connectedPlatforms;
  final bool hasSynced;
  final bool isSyncing;
  final String importRange;
  final int syncedActivityCount;

  OnboardingState copyWith({
    OnboardingStep? currentStep,
    List<String>? connectedPlatforms,
    bool? hasSynced,
    bool? isSyncing,
    String? importRange,
    int? syncedActivityCount,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      connectedPlatforms: connectedPlatforms ?? this.connectedPlatforms,
      hasSynced: hasSynced ?? this.hasSynced,
      isSyncing: isSyncing ?? this.isSyncing,
      importRange: importRange ?? this.importRange,
      syncedActivityCount: syncedActivityCount ?? this.syncedActivityCount,
    );
  }
}
