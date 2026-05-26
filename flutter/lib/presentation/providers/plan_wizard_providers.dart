import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/utils/race_defaults.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart' as domain;
import 'package:shared_preferences/shared_preferences.dart';

class PlanWizardState {
  PlanWizardState({
    this.name = 'My First Race',
    this.raceType = RaceType.fiveK,
    DateTime? raceDate,
    DateTime? planStartDate,
    this.targetTime,
    this.weeklyMileageGoal,
    this.startWeeklyMileage,
    this.planWeeks = 12,
    this.runsPerWeek = 4,
    this.ridesPerWeek = 0,
    this.swimsPerWeek = 0,
    this.strengthPerWeek = 0,
    this.taperWeeks = 2,
    this.peakWeeks = 4,
    this.buildWeeks = 4,
    this.maxLongRunKm,
    this.longRunDay = 0,
    this.workoutDay = 3,
    this.swimDay = 1,
    this.restDays,
    this.calibrationTime,
    this.calibrationDistance,
    this.calibrationFactor,
    this.backyardLoopDistM,
    this.targetLaps,
    this.sport,
    this.athleteCssOverride,
    this.athleteBikeSpeedOverride,
    this.customSwimDistM,
    this.customBikeDistM,
    this.customRunDistM,
    this.experienceLevel = 'INTERMEDIATE',
    this.currentStep = 0,
    this.totalSteps = 8,
    this.isSubmitting = false,
    this.isManualMode = false,
    this.hasTargetTime = false,
    this.maxHeartRate = 185,
    this.restingHeartRate = 55,
    this.thresholdHR = 0,
    this.thresholdPace = 0,
  })  : raceDate = raceDate ?? DateTime.now().add(const Duration(days: 56)),
        planStartDate = planStartDate ??
            DateTime(
                DateTime.now().year, DateTime.now().month, DateTime.now().day);

  final String name;
  final RaceType raceType;
  final DateTime raceDate;
  final DateTime? planStartDate;
  final int? targetTime;
  final double? weeklyMileageGoal;
  final double? startWeeklyMileage;
  final int planWeeks;
  final int runsPerWeek;
  final int ridesPerWeek;
  final int swimsPerWeek;
  final int strengthPerWeek;
  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;
  final double? maxLongRunKm;
  final int longRunDay;
  final int workoutDay;
  final int swimDay;
  final List<int>? restDays;
  final int? calibrationTime;
  final String? calibrationDistance;
  final double? calibrationFactor;
  final double? backyardLoopDistM;
  final int? targetLaps;
  final String? sport;
  final double? athleteCssOverride;
  final double? athleteBikeSpeedOverride;
  final double? customSwimDistM;
  final double? customBikeDistM;
  final double? customRunDistM;

  final String experienceLevel;
  final int maxHeartRate;
  final int restingHeartRate;
  final int thresholdHR;
  final int thresholdPace;
  final int currentStep;
  final int totalSteps;
  final bool isSubmitting;
  final bool isManualMode;
  final bool hasTargetTime;

  int get computedPlanWeeks {
    final diff = raceDate.difference(planStartDate!).inDays;
    return (diff / 7).floor().clamp(4, 52);
  }

  PlanWizardState copyWith({
    String? name,
    RaceType? raceType,
    DateTime? raceDate,
    DateTime? planStartDate,
    int? targetTime,
    double? weeklyMileageGoal,
    double? startWeeklyMileage,
    int? planWeeks,
    int? runsPerWeek,
    int? ridesPerWeek,
    int? swimsPerWeek,
    int? strengthPerWeek,
    int? taperWeeks,
    int? peakWeeks,
    int? buildWeeks,
    double? maxLongRunKm,
    int? longRunDay,
    int? workoutDay,
    int? swimDay,
    List<int>? restDays,
    int? calibrationTime,
    String? calibrationDistance,
    double? calibrationFactor,
    double? backyardLoopDistM,
    int? targetLaps,
    String? sport,
    double? athleteCssOverride,
    double? athleteBikeSpeedOverride,
    double? customSwimDistM,
    double? customBikeDistM,
    double? customRunDistM,
    String? experienceLevel,
    int? maxHeartRate,
    int? restingHeartRate,
    int? thresholdHR,
    int? thresholdPace,
    int? currentStep,
    int? totalSteps,
    bool? isSubmitting,
    bool? isManualMode,
    bool? hasTargetTime,
  }) {
    return PlanWizardState(
      name: name ?? this.name,
      raceType: raceType ?? this.raceType,
      raceDate: raceDate ?? this.raceDate,
      planStartDate: planStartDate ?? this.planStartDate,
      targetTime: targetTime ?? this.targetTime,
      weeklyMileageGoal: weeklyMileageGoal ?? this.weeklyMileageGoal,
      startWeeklyMileage: startWeeklyMileage ?? this.startWeeklyMileage,
      planWeeks: planWeeks ?? this.planWeeks,
      runsPerWeek: runsPerWeek ?? this.runsPerWeek,
      ridesPerWeek: ridesPerWeek ?? this.ridesPerWeek,
      swimsPerWeek: swimsPerWeek ?? this.swimsPerWeek,
      strengthPerWeek: strengthPerWeek ?? this.strengthPerWeek,
      taperWeeks: taperWeeks ?? this.taperWeeks,
      peakWeeks: peakWeeks ?? this.peakWeeks,
      buildWeeks: buildWeeks ?? this.buildWeeks,
      maxLongRunKm: maxLongRunKm ?? this.maxLongRunKm,
      longRunDay: longRunDay ?? this.longRunDay,
      workoutDay: workoutDay ?? this.workoutDay,
      swimDay: swimDay ?? this.swimDay,
      restDays: restDays ?? this.restDays,
      calibrationTime: calibrationTime ?? this.calibrationTime,
      calibrationDistance: calibrationDistance ?? this.calibrationDistance,
      calibrationFactor: calibrationFactor ?? this.calibrationFactor,
      backyardLoopDistM: backyardLoopDistM ?? this.backyardLoopDistM,
      targetLaps: targetLaps ?? this.targetLaps,
      sport: sport ?? this.sport,
      athleteCssOverride: athleteCssOverride ?? this.athleteCssOverride,
      athleteBikeSpeedOverride:
          athleteBikeSpeedOverride ?? this.athleteBikeSpeedOverride,
      customSwimDistM: customSwimDistM ?? this.customSwimDistM,
      customBikeDistM: customBikeDistM ?? this.customBikeDistM,
      customRunDistM: customRunDistM ?? this.customRunDistM,
      experienceLevel: experienceLevel ?? this.experienceLevel,
      maxHeartRate: maxHeartRate ?? this.maxHeartRate,
      restingHeartRate: restingHeartRate ?? this.restingHeartRate,
      thresholdHR: thresholdHR ?? this.thresholdHR,
      thresholdPace: thresholdPace ?? this.thresholdPace,
      currentStep: currentStep ?? this.currentStep,
      totalSteps: totalSteps ?? this.totalSteps,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isManualMode: isManualMode ?? this.isManualMode,
      hasTargetTime: hasTargetTime ?? this.hasTargetTime,
    );
  }
}

class PlanWizardNotifier extends Notifier<PlanWizardState> {
  @override
  PlanWizardState build() => PlanWizardState();

  void setName(String v) => state = state.copyWith(name: v);
  void setRaceType(RaceType v) => state = state.copyWith(raceType: v);
  void setRaceDate(DateTime v) => state = state.copyWith(raceDate: v);
  void setPlanStartDate(DateTime v) =>
      state = state.copyWith(planStartDate: v);
  void setTargetTime(int? v) => state = state.copyWith(targetTime: v);
  void setWeeklyMileageGoal(double? v) =>
      state = state.copyWith(weeklyMileageGoal: v);
  void setStartWeeklyMileage(double? v) =>
      state = state.copyWith(startWeeklyMileage: v);
  void setPlanWeeks(int v) => state = state.copyWith(planWeeks: v);
  void setRunsPerWeek(int v) => state = state.copyWith(runsPerWeek: v);
  void setRidesPerWeek(int v) => state = state.copyWith(ridesPerWeek: v);
  void setSwimsPerWeek(int v) => state = state.copyWith(swimsPerWeek: v);
  void setStrengthPerWeek(int v) =>
      state = state.copyWith(strengthPerWeek: v);
  void setTaperWeeks(int v) => state = state.copyWith(taperWeeks: v);
  void setPeakWeeks(int v) => state = state.copyWith(peakWeeks: v);
  void setBuildWeeks(int v) => state = state.copyWith(buildWeeks: v);
  void setMaxLongRunKm(double? v) =>
      state = state.copyWith(maxLongRunKm: v);
  void setLongRunDay(int v) => state = state.copyWith(longRunDay: v);
  void setWorkoutDay(int v) => state = state.copyWith(workoutDay: v);
  void setSwimDay(int v) => state = state.copyWith(swimDay: v);
  void setRestDays(List<int> v) => state = state.copyWith(restDays: v);
  void setCalibrationTime(int? v) =>
      state = state.copyWith(calibrationTime: v);
  void setCalibrationDistance(String? v) =>
      state = state.copyWith(calibrationDistance: v);
  void setCalibrationFactor(double? v) =>
      state = state.copyWith(calibrationFactor: v);
  void setBackyardLoopDistM(double? v) =>
      state = state.copyWith(backyardLoopDistM: v);
  void setTargetLaps(int? v) => state = state.copyWith(targetLaps: v);
  void setSport(String? v) => state = state.copyWith(sport: v);
  void setAthleteCssOverride(double? v) =>
      state = state.copyWith(athleteCssOverride: v);
  void setAthleteBikeSpeedOverride(double? v) =>
      state = state.copyWith(athleteBikeSpeedOverride: v);
  void setCustomSwimDistM(double? v) =>
      state = state.copyWith(customSwimDistM: v);
  void setCustomBikeDistM(double? v) =>
      state = state.copyWith(customBikeDistM: v);
  void setCustomRunDistM(double? v) =>
      state = state.copyWith(customRunDistM: v);
  void setExperienceLevel(String v) =>
      state = state.copyWith(experienceLevel: v);
  void setCurrentStep(int v) => state = state.copyWith(currentStep: v);
  void setTotalSteps(int v) => state = state.copyWith(totalSteps: v);
  void setIsSubmitting(bool v) => state = state.copyWith(isSubmitting: v);
  void setIsManualMode(bool v) => state = state.copyWith(isManualMode: v);
  void setHasTargetTime(bool v) => state = state.copyWith(hasTargetTime: v);
  void setMaxHeartRate(int v) => state = state.copyWith(maxHeartRate: v);
  void setRestingHeartRate(int v) => state = state.copyWith(restingHeartRate: v);
  void setThresholdHR(int v) => state = state.copyWith(thresholdHR: v);
  void setThresholdPace(int v) => state = state.copyWith(thresholdPace: v);

  void nextStep() {
    if (state.currentStep < state.totalSteps - 1) {
      state = state.copyWith(currentStep: state.currentStep + 1);
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1);
    }
  }

  void adjustDefaultsForExperience(String level) {
    final defaults = getRaceDefaults(state.raceType);
    int runs;
    double mileage;
    int taper;
    int peak;
    int build;

    switch (level) {
      case 'BEGINNER':
        runs = 3;
        mileage = 25.0;
        taper = 3;
        peak = 3;
        build = 4;
        break;
      case 'ADVANCED':
        runs = 5;
        mileage = 60.0;
        taper = 2;
        peak = 5;
        build = 6;
        break;
      default:
        runs = 4;
        mileage = 40.0;
        taper = 2;
        peak = 4;
        build = 5;
    }

    state = state.copyWith(
      experienceLevel: level,
      runsPerWeek: runs,
      weeklyMileageGoal: mileage,
      taperWeeks: taper,
      peakWeeks: peak,
      buildWeeks: build,
      ridesPerWeek: defaults.ridesPerWeek,
      swimsPerWeek: defaults.swimsPerWeek,
      strengthPerWeek: defaults.strengthPerWeek,
      maxLongRunKm: defaults.maxLongRunKm,
    );
  }

  domain.CreateGoalRequest buildSubmitPayload() {
    return domain.CreateGoalRequest(
      name: state.name,
      raceType: state.raceType,
      raceDate: state.raceDate,
      planStartDate: state.planStartDate,
      targetTime: state.targetTime,
      weeklyMileageGoal: state.weeklyMileageGoal,
      startWeeklyMileage: state.startWeeklyMileage,
      planWeeks: state.planWeeks,
      runsPerWeek: state.runsPerWeek,
      ridesPerWeek: state.ridesPerWeek,
      swimsPerWeek: state.swimsPerWeek,
      strengthPerWeek: state.strengthPerWeek,
      taperWeeks: state.taperWeeks,
      peakWeeks: state.peakWeeks,
      buildWeeks: state.buildWeeks,
      maxLongRunKm: state.maxLongRunKm,
      longRunDay: state.longRunDay,
      workoutDay: state.workoutDay,
      swimDay: state.swimDay,
      restDays: state.restDays,
      calibrationTime: state.calibrationTime,
      calibrationDistance: state.calibrationDistance,
      calibrationFactor: state.calibrationFactor,
      backyardLoopDistM: state.backyardLoopDistM,
      targetLaps: state.targetLaps,
      sport: state.sport,
      athleteCssOverride: state.athleteCssOverride,
      athleteBikeSpeedOverride: state.athleteBikeSpeedOverride,
      customSwimDistM: state.customSwimDistM,
      customBikeDistM: state.customBikeDistM,
      customRunDistM: state.customRunDistM,
      maxHeartRate: state.maxHeartRate,
      restingHeartRate: state.restingHeartRate,
      thresholdHeartRate: state.thresholdHR > 0 ? state.thresholdHR : null,
      thresholdPaceSecondsPerKm: state.thresholdPace > 0 ? state.thresholdPace.toDouble() : null,
      hrZoneMethod: 'LTHR',
    );
  }

  void resetForRaceType(String raceTypeStr) {
    final rt = RaceType.values.firstWhere(
      (e) => e.name == raceTypeStr,
      orElse: () => RaceType.fiveK,
    );
    final defaults = getRaceDefaults(rt);
    state = state.copyWith(
      raceType: rt,
      isManualMode: false,
      hasTargetTime: false,
      targetTime: null,
      weeklyMileageGoal: defaults.weeklyVolumeKm,
      startWeeklyMileage: null,
      runsPerWeek: defaults.runsPerWeek,
      ridesPerWeek: defaults.ridesPerWeek,
      swimsPerWeek: defaults.swimsPerWeek,
      strengthPerWeek: defaults.strengthPerWeek,
      taperWeeks: defaults.taperWeeks,
      peakWeeks: defaults.peakWeeks,
      buildWeeks: defaults.buildWeeks,
      maxLongRunKm: defaults.maxLongRunKm,
      backyardLoopDistM: defaults.backyardLoopDistM?.toDouble(),
      targetLaps: defaults.targetLaps,
      calibrationTime: null,
      calibrationDistance: null,
      calibrationFactor: null,
    );
  }

  Future<void> cleanupOldPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('onboarding_step');
    await prefs.remove('onboarding_connected_platforms');
    await prefs.remove('onboarding_sync_status');
  }
}

final planWizardProvider =
    NotifierProvider<PlanWizardNotifier, PlanWizardState>(
  PlanWizardNotifier.new,
);
