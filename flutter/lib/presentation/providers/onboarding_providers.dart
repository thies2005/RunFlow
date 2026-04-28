import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
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

enum PlanSubStep {
  experienceLevel,
  raceGoal,
  currentFitness,
  goalTime,
  trainingVolume,
  trainingSchedule,
  heartRateProfile,
  review,
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
    return OnboardingState();
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
    } catch (e) {
      logger.error('[Onboarding] Connect Strava failed: $e');
    }
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

  void setPlanSubStep(PlanSubStep step) {
    state = state.copyWith(currentPlanSubStep: step);
  }

  void nextPlanSubStep() {
    final current = state.currentPlanSubStep;
    final currentIndex = current.index;
    if (currentIndex < PlanSubStep.values.length - 1) {
      state = state.copyWith(
        currentPlanSubStep: PlanSubStep.values[currentIndex + 1],
      );
    }
  }

  void previousPlanSubStep() {
    final current = state.currentPlanSubStep;
    final currentIndex = current.index;
    if (currentIndex > 0) {
      state = state.copyWith(
        currentPlanSubStep: PlanSubStep.values[currentIndex - 1],
      );
    }
  }

  void setExperienceLevel(String level) {
    state = state.copyWith(experienceLevel: level);
  }

  void setGoalName(String name) {
    state = state.copyWith(goalName: name);
  }

  void setRaceType(RaceType type) {
    state = state.copyWith(raceType: type);
  }

  void setRaceDate(DateTime date) {
    state = state.copyWith(raceDate: date);
  }

  void setPlanStartDate(DateTime date) {
    state = state.copyWith(planStartDate: date);
  }

  void setCalibrationMode(String mode) {
    state = state.copyWith(calibrationMode: mode);
  }

  void setSelectedActivityId(String id) {
    state = state.copyWith(selectedActivityId: id);
  }

  void setCalibrationDistance(String dist) {
    state = state.copyWith(calibrationDistance: dist);
  }

  void setCalibrationTime(int seconds) {
    state = state.copyWith(calibrationTimeSeconds: seconds);
  }

  void setGoalTimeSeconds(int? seconds) {
    state = state.copyWith(goalTimeSeconds: seconds);
  }

  void setCalibrationFactor(double factor) {
    state = state.copyWith(calibrationFactor: factor);
  }

  void setRunsPerWeek(int runs) {
    state = state.copyWith(runsPerWeek: runs);
  }

  void setWeeklyMileage(double mileage) {
    state = state.copyWith(weeklyMileage: mileage);
  }

  void setMaxLongRunKm(double km) {
    state = state.copyWith(maxLongRunKm: km);
  }

  void setTaperWeeks(int weeks) {
    state = state.copyWith(taperWeeks: weeks);
  }

  void setPeakWeeks(int weeks) {
    state = state.copyWith(peakWeeks: weeks);
  }

  void setBuildWeeks(int weeks) {
    state = state.copyWith(buildWeeks: weeks);
  }

  void setMaxHeartRate(int hr) {
    state = state.copyWith(maxHeartRate: hr);
  }

  void setRestingHeartRate(int hr) {
    state = state.copyWith(restingHeartRate: hr);
  }

  void setWeight(double w) {
    state = state.copyWith(weight: w);
  }

  void setThresholdHR(int hr) {
    state = state.copyWith(thresholdHR: hr);
  }

  void setThresholdPace(int secondsPerKm) {
    state = state.copyWith(thresholdPace: secondsPerKm);
  }

  void setLongRunDay(int day) {
    state = state.copyWith(longRunDay: day);
  }

  void setQualityDay(int day) {
    state = state.copyWith(qualityDay: day);
  }

  void setRestDays(List<int> days) {
    state = state.copyWith(restDays: days);
  }

  void setPlanSubmitting(bool value) {
    state = state.copyWith(isPlanSubmitting: value);
  }

  void setPlanError(String error) {
    state = state.copyWith(planError: error);
  }
}

class OnboardingState {
  OnboardingState({
    this.currentStep = OnboardingStep.platformSelect,
    this.connectedPlatforms = const [],
    this.hasSynced = false,
    this.isSyncing = false,
    this.importRange = 'ALL',
    this.syncedActivityCount = 0,
    this.currentPlanSubStep = PlanSubStep.experienceLevel,
    this.experienceLevel = 'INTERMEDIATE',
    this.goalName = 'My First Race',
    this.raceType = RaceType.marathon,
    DateTime? raceDate,
    DateTime? planStartDate,
    this.calibrationMode = 'manual',
    this.selectedActivityId = '',
    this.calibrationDistance = 'MARATHON',
    this.calibrationTimeSeconds = 0,
    this.goalTimeSeconds,
    this.calibrationFactor = 1.0,
    this.runsPerWeek = 4,
    this.weeklyMileage = 40.0,
    this.maxLongRunKm = 24.0,
    this.taperWeeks = 2,
    this.peakWeeks = 4,
    this.buildWeeks = 4,
    this.maxHeartRate = 185,
    this.restingHeartRate = 55,
    this.weight = 70.0,
    this.thresholdHR = 0,
    this.thresholdPace = 0,
    this.longRunDay = 0,
    this.qualityDay = 3,
    this.restDays = const [1, 5],
    this.isPlanSubmitting = false,
    this.planError = '',
  })  : raceDate = raceDate ?? DateTime.now().add(const Duration(days: 84)),
        planStartDate =
            planStartDate ?? DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);

  final OnboardingStep currentStep;
  final List<String> connectedPlatforms;
  final bool hasSynced;
  final bool isSyncing;
  final String importRange;
  final int syncedActivityCount;

  final PlanSubStep currentPlanSubStep;

  final String experienceLevel;
  final String goalName;
  final RaceType raceType;
  final DateTime raceDate;
  final DateTime planStartDate;

  final String calibrationMode;
  final String selectedActivityId;
  final String calibrationDistance;
  final int calibrationTimeSeconds;
  final int? goalTimeSeconds;
  final double calibrationFactor;

  final int runsPerWeek;
  final double weeklyMileage;
  final double maxLongRunKm;
  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;

  final int maxHeartRate;
  final int restingHeartRate;
  final double weight;
  final int thresholdHR;
  final int thresholdPace;

  final int longRunDay;
  final int qualityDay;
  final List<int> restDays;

  final bool isPlanSubmitting;
  final String planError;

  int get computedPlanWeeks {
    final diff = raceDate.difference(planStartDate).inDays;
    return (diff / 7).floor().clamp(4, 52);
  }

  OnboardingState copyWith({
    OnboardingStep? currentStep,
    List<String>? connectedPlatforms,
    bool? hasSynced,
    bool? isSyncing,
    String? importRange,
    int? syncedActivityCount,
    PlanSubStep? currentPlanSubStep,
    String? experienceLevel,
    String? goalName,
    RaceType? raceType,
    DateTime? raceDate,
    DateTime? planStartDate,
    String? calibrationMode,
    String? selectedActivityId,
    String? calibrationDistance,
    int? calibrationTimeSeconds,
    int? goalTimeSeconds,
    double? calibrationFactor,
    int? runsPerWeek,
    double? weeklyMileage,
    double? maxLongRunKm,
    int? taperWeeks,
    int? peakWeeks,
    int? buildWeeks,
    int? maxHeartRate,
    int? restingHeartRate,
    double? weight,
    int? thresholdHR,
    int? thresholdPace,
    int? longRunDay,
    int? qualityDay,
    List<int>? restDays,
    bool? isPlanSubmitting,
    String? planError,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      connectedPlatforms: connectedPlatforms ?? this.connectedPlatforms,
      hasSynced: hasSynced ?? this.hasSynced,
      isSyncing: isSyncing ?? this.isSyncing,
      importRange: importRange ?? this.importRange,
      syncedActivityCount: syncedActivityCount ?? this.syncedActivityCount,
      currentPlanSubStep:
          currentPlanSubStep ?? this.currentPlanSubStep,
      experienceLevel: experienceLevel ?? this.experienceLevel,
      goalName: goalName ?? this.goalName,
      raceType: raceType ?? this.raceType,
      raceDate: raceDate ?? this.raceDate,
      planStartDate: planStartDate ?? this.planStartDate,
      calibrationMode: calibrationMode ?? this.calibrationMode,
      selectedActivityId: selectedActivityId ?? this.selectedActivityId,
      calibrationDistance:
          calibrationDistance ?? this.calibrationDistance,
      calibrationTimeSeconds:
          calibrationTimeSeconds ?? this.calibrationTimeSeconds,
      goalTimeSeconds: goalTimeSeconds ?? this.goalTimeSeconds,
      calibrationFactor: calibrationFactor ?? this.calibrationFactor,
      runsPerWeek: runsPerWeek ?? this.runsPerWeek,
      weeklyMileage: weeklyMileage ?? this.weeklyMileage,
      maxLongRunKm: maxLongRunKm ?? this.maxLongRunKm,
      taperWeeks: taperWeeks ?? this.taperWeeks,
      peakWeeks: peakWeeks ?? this.peakWeeks,
      buildWeeks: buildWeeks ?? this.buildWeeks,
      maxHeartRate: maxHeartRate ?? this.maxHeartRate,
      restingHeartRate: restingHeartRate ?? this.restingHeartRate,
      weight: weight ?? this.weight,
      thresholdHR: thresholdHR ?? this.thresholdHR,
      thresholdPace: thresholdPace ?? this.thresholdPace,
      longRunDay: longRunDay ?? this.longRunDay,
      qualityDay: qualityDay ?? this.qualityDay,
      restDays: restDays ?? this.restDays,
      isPlanSubmitting: isPlanSubmitting ?? this.isPlanSubmitting,
      planError: planError ?? this.planError,
    );
  }
}
