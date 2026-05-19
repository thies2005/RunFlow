import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/mappers/goal_mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart' as data_models;
import 'package:runflow_flutter/data/models/goal_models.dart' as data;
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart' show RaceType;
import 'package:runflow_flutter/presentation/providers/plan_wizard_providers.dart';

void main() {
  group('PlanWizardState', () {
    test('initial state has correct defaults', () {
      final state = PlanWizardState();
      expect(state.name, 'My First Race');
      expect(state.raceType, RaceType.fiveK);
      expect(state.planWeeks, 12);
      expect(state.runsPerWeek, 4);
      expect(state.ridesPerWeek, 0);
      expect(state.swimsPerWeek, 0);
      expect(state.strengthPerWeek, 0);
      expect(state.taperWeeks, 2);
      expect(state.peakWeeks, 4);
      expect(state.buildWeeks, 4);
      expect(state.longRunDay, 0);
      expect(state.workoutDay, 3);
      expect(state.swimDay, 1);
      expect(state.restDays, isNull);
      expect(state.experienceLevel, 'INTERMEDIATE');
      expect(state.currentStep, 0);
      expect(state.totalSteps, 8);
      expect(state.isSubmitting, false);
      expect(state.isManualMode, false);
      expect(state.hasTargetTime, false);
      expect(state.targetTime, isNull);
      expect(state.weeklyMileageGoal, isNull);
      expect(state.startWeeklyMileage, isNull);
      expect(state.sport, isNull);
      expect(state.customSwimDistM, isNull);
      expect(state.customBikeDistM, isNull);
      expect(state.customRunDistM, isNull);
      expect(state.athleteCssOverride, isNull);
      expect(state.athleteBikeSpeedOverride, isNull);
    });
  });

  group('PlanWizardNotifier', () {
    late ProviderContainer container;
    late PlanWizardNotifier notifier;

    setUp(() {
      container = ProviderContainer();
      notifier = container.read(planWizardProvider.notifier);
    });

    tearDown(() {
      container.dispose();
    });

    test('adjustDefaultsForExperience beginner', () {
      notifier.setRaceType(RaceType.fiveK);
      notifier.adjustDefaultsForExperience('BEGINNER');
      final s = container.read(planWizardProvider);
      expect(s.experienceLevel, 'BEGINNER');
      expect(s.runsPerWeek, 3);
      expect(s.weeklyMileageGoal, 25.0);
      expect(s.taperWeeks, 3);
      expect(s.peakWeeks, 3);
      expect(s.buildWeeks, 4);
    });

    test('adjustDefaultsForExperience intermediate', () {
      notifier.setRaceType(RaceType.fiveK);
      notifier.adjustDefaultsForExperience('INTERMEDIATE');
      final s = container.read(planWizardProvider);
      expect(s.experienceLevel, 'INTERMEDIATE');
      expect(s.runsPerWeek, 4);
      expect(s.weeklyMileageGoal, 40.0);
      expect(s.taperWeeks, 2);
      expect(s.peakWeeks, 4);
      expect(s.buildWeeks, 5);
    });

    test('adjustDefaultsForExperience advanced', () {
      notifier.setRaceType(RaceType.fiveK);
      notifier.adjustDefaultsForExperience('ADVANCED');
      final s = container.read(planWizardProvider);
      expect(s.experienceLevel, 'ADVANCED');
      expect(s.runsPerWeek, 5);
      expect(s.weeklyMileageGoal, 60.0);
      expect(s.taperWeeks, 2);
      expect(s.peakWeeks, 5);
      expect(s.buildWeeks, 6);
    });

    test('buildSubmitPayload produces all 31 fields', () {
      notifier
        ..setName('Test Plan')
        ..setRaceType(RaceType.marathon)
        ..setRaceDate(DateTime(2025, 9, 28))
        ..setPlanStartDate(DateTime(2025, 6, 1))
        ..setTargetTime(10800)
        ..setWeeklyMileageGoal(60.0)
        ..setStartWeeklyMileage(30.0)
        ..setPlanWeeks(16)
        ..setRunsPerWeek(5)
        ..setRidesPerWeek(1)
        ..setSwimsPerWeek(1)
        ..setStrengthPerWeek(1)
        ..setTaperWeeks(2)
        ..setPeakWeeks(3)
        ..setBuildWeeks(5)
        ..setMaxLongRunKm(32.0)
        ..setLongRunDay(6)
        ..setWorkoutDay(3)
        ..setSwimDay(2)
        ..setRestDays([1, 5])
        ..setCalibrationTime(7200)
        ..setCalibrationDistance('MARATHON')
        ..setCalibrationFactor(1.05)
        ..setSport('RUN')
        ..setAthleteCssOverride(95.0)
        ..setAthleteBikeSpeedOverride(10.5)
        ..setCustomSwimDistM(1500.0)
        ..setCustomBikeDistM(40000.0)
        ..setCustomRunDistM(10000.0);

      final payload = notifier.buildSubmitPayload();

      expect(payload.name, 'Test Plan');
      expect(payload.raceType, RaceType.marathon);
      expect(payload.raceDate, DateTime(2025, 9, 28));
      expect(payload.planStartDate, DateTime(2025, 6, 1));
      expect(payload.targetTime, 10800);
      expect(payload.weeklyMileageGoal, 60.0);
      expect(payload.startWeeklyMileage, 30.0);
      expect(payload.planWeeks, 16);
      expect(payload.runsPerWeek, 5);
      expect(payload.ridesPerWeek, 1);
      expect(payload.swimsPerWeek, 1);
      expect(payload.strengthPerWeek, 1);
      expect(payload.taperWeeks, 2);
      expect(payload.peakWeeks, 3);
      expect(payload.buildWeeks, 5);
      expect(payload.maxLongRunKm, 32.0);
      expect(payload.longRunDay, 6);
      expect(payload.workoutDay, 3);
      expect(payload.swimDay, 2);
      expect(payload.restDays, [1, 5]);
      expect(payload.calibrationTime, 7200);
      expect(payload.calibrationDistance, 'MARATHON');
      expect(payload.calibrationFactor, 1.05);
      expect(payload.backyardLoopDistM, isNull);
      expect(payload.targetLaps, isNull);
      expect(payload.sport, 'RUN');
      expect(payload.athleteCssOverride, 95.0);
      expect(payload.athleteBikeSpeedOverride, 10.5);
      expect(payload.customSwimDistM, 1500.0);
      expect(payload.customBikeDistM, 40000.0);
      expect(payload.customRunDistM, 10000.0);
    });

    test('resetForRaceType clears relevant fields', () {
      notifier
        ..setName('Test Plan')
        ..setRaceType(RaceType.marathon)
        ..setWeeklyMileageGoal(60.0)
        ..setHasTargetTime(true)
        ..setIsManualMode(true);

      notifier.resetForRaceType('FIVE_K');

      final s = container.read(planWizardProvider);
      expect(s.raceType, RaceType.fiveK);
      expect(s.hasTargetTime, false);
      expect(s.isManualMode, false);
      expect(s.name, 'Test Plan');
    });

    test('nextStep and previousStep work', () {
      expect(container.read(planWizardProvider).currentStep, 0);
      notifier.nextStep();
      expect(container.read(planWizardProvider).currentStep, 1);
      notifier.previousStep();
      expect(container.read(planWizardProvider).currentStep, 0);
    });

    test('nextStep does not exceed totalSteps', () {
      for (int i = 0; i < 15; i++) {
        notifier.nextStep();
      }
      expect(container.read(planWizardProvider).currentStep, 7);
    });

    test('previousStep does not go below 0', () {
      notifier.previousStep();
      expect(container.read(planWizardProvider).currentStep, 0);
    });
  });

  group('Domain mapper roundtrip', () {
    test('toDomain then toData produces same values', () {
      final now = DateTime(2025, 6, 1);
      final raceDate = DateTime(2025, 9, 28);
      final dataReq = data.CreateGoalRequest(
        name: 'Mapper Test',
        raceType: data_models.RaceType.marathon,
        raceDate: raceDate,
        planStartDate: now,
        targetTime: 10800,
        weeklyMileageGoal: 60.0,
        startWeeklyMileage: 30.0,
        planWeeks: 16,
        runsPerWeek: 5,
        ridesPerWeek: 1,
        swimsPerWeek: 1,
        strengthPerWeek: 1,
        taperWeeks: 2,
        peakWeeks: 3,
        buildWeeks: 5,
        maxLongRunKm: 32.0,
        longRunDay: 6,
        workoutDay: 3,
        swimDay: 2,
        restDays: [1, 5],
        calibrationTime: 7200,
        calibrationDistance: 'MARATHON',
        calibrationFactor: 1.05,
        sport: 'RUN',
        athleteCssOverride: 95.0,
        athleteBikeSpeedOverride: 10.5,
        customSwimDistM: 1500.0,
        customBikeDistM: 40000.0,
        customRunDistM: 10000.0,
      );

      final domainReq = dataReq.toDomain();
      final roundTripped = domainReq.toData();

      expect(roundTripped.name, dataReq.name);
      expect(roundTripped.raceType, data_models.RaceType.marathon);
      expect(roundTripped.raceDate, dataReq.raceDate);
      expect(roundTripped.planStartDate, dataReq.planStartDate);
      expect(roundTripped.targetTime, dataReq.targetTime);
      expect(roundTripped.weeklyMileageGoal, dataReq.weeklyMileageGoal);
      expect(roundTripped.startWeeklyMileage, dataReq.startWeeklyMileage);
      expect(roundTripped.planWeeks, dataReq.planWeeks);
      expect(roundTripped.runsPerWeek, dataReq.runsPerWeek);
      expect(roundTripped.ridesPerWeek, dataReq.ridesPerWeek);
      expect(roundTripped.swimsPerWeek, dataReq.swimsPerWeek);
      expect(roundTripped.strengthPerWeek, dataReq.strengthPerWeek);
      expect(roundTripped.taperWeeks, dataReq.taperWeeks);
      expect(roundTripped.peakWeeks, dataReq.peakWeeks);
      expect(roundTripped.buildWeeks, dataReq.buildWeeks);
      expect(roundTripped.maxLongRunKm, dataReq.maxLongRunKm);
      expect(roundTripped.longRunDay, dataReq.longRunDay);
      expect(roundTripped.workoutDay, dataReq.workoutDay);
      expect(roundTripped.swimDay, dataReq.swimDay);
      expect(roundTripped.restDays, dataReq.restDays);
      expect(roundTripped.calibrationTime, dataReq.calibrationTime);
      expect(roundTripped.calibrationDistance, dataReq.calibrationDistance);
      expect(roundTripped.calibrationFactor, dataReq.calibrationFactor);
      expect(roundTripped.sport, dataReq.sport);
      expect(roundTripped.athleteCssOverride, dataReq.athleteCssOverride);
      expect(roundTripped.athleteBikeSpeedOverride, dataReq.athleteBikeSpeedOverride);
      expect(roundTripped.customSwimDistM, dataReq.customSwimDistM);
      expect(roundTripped.customBikeDistM, dataReq.customBikeDistM);
      expect(roundTripped.customRunDistM, dataReq.customRunDistM);
    });
  });
}
