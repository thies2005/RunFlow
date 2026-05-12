import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';

void main() {
  late ReadinessScoringService service;

  setUp(() {
    service = const ReadinessScoringService();
  });

  ComponentScore findComponent(List<ComponentScore> scores, ReadinessComponent component) {
    return scores.firstWhere((s) => s.component == component);
  }

  group('HRR component scoring', () {
    test('improving RHR (negative delta) scores 85 + bonus', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 50, baselineRhr: 55, rhrDelta: -3),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.isAvailable, isTrue);
      expect(hrr.score, closeTo(85 + 3 * 2, 0.01));
    });

    test('improving RHR bonus capped at 15', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 40, baselineRhr: 60, rhrDelta: -20),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.score, closeTo(100, 0.01));
    });

    test('stable RHR (delta near zero) scores 75', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.score, closeTo(75, 0.01));
    });

    test('declining RHR (positive delta) scores 75 - penalty', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 60, baselineRhr: 55, rhrDelta: 3),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.score, closeTo(75 - 3 * 3, 0.01));
    });

    test('declining RHR penalty capped at 40', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 80, baselineRhr: 55, rhrDelta: 20),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.score, closeTo(35, 0.01));
    });

    test('RHR without baseline scores 65', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.score, 65);
    });

    test('null RHR is unavailable', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: null,
        sleep: SleepMetrics(totalDurationMinutes: 480),
        load: LoadMetrics(workloadRatio: 1.0),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(hrr.isAvailable, isFalse);
    });
  });

  group('Sleep component scoring', () {
    test('8+ hours sleep base score 85', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 500, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.isAvailable, isTrue);
      expect(sleep.score, closeTo(85, 0.01));
    });

    test('7-8 hours sleep base score 75', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 450, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(75, 0.01));
    });

    test('6-7 hours sleep base score 60', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 390, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(60, 0.01));
    });

    test('5-6 hours sleep base score 45', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 330, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(45, 0.01));
    });

    test('under 5 hours sleep base score 30', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 270, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(30, 0.01));
    });

    test('deep sleep >= 20% adds 5', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 22, remPercent: 15),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(90, 0.01));
    });

    test('deep sleep >= 15% adds 2', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 16, remPercent: 15),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(87, 0.01));
    });

    test('deep sleep < 10% subtracts 5', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 8, remPercent: 15),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(80, 0.01));
    });

    test('REM >= 20% adds 3', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 12, remPercent: 22),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(88, 0.01));
    });

    test('REM < 10% subtracts 3', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 12, remPercent: 8),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(82, 0.01));
    });

    test('sleep score clamped to 0-100', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 25, remPercent: 25),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.score, closeTo(93, 0.01));
    });

    test('null sleep is unavailable', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        load: LoadMetrics(workloadRatio: 1.0),
      );
      final result = service.score(inputs);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      expect(sleep.isAvailable, isFalse);
    });
  });

  group('Load component scoring', () {
    test('workload ratio < 0.8 scores 70 (undertrained)', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(workloadRatio: 0.6),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.isAvailable, isTrue);
      expect(load.score, 70);
    });

    test('workload ratio 0.8-1.3 scores 90 (optimal)', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(workloadRatio: 1.0),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.score, 90);
    });

    test('workload ratio 1.3-1.5 scores 65 (high)', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(workloadRatio: 1.4),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.score, 65);
    });

    test('workload ratio 1.5-2.0 scores 45 (very high)', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(workloadRatio: 1.7),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.score, 45);
    });

    test('workload ratio > 2.0 scores 25 (overreaching)', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(workloadRatio: 2.5),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.score, 25);
    });

    test('no workload ratio but todayTrimp available scores 60', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        load: LoadMetrics(todayTrimp: 50),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.isAvailable, isTrue);
      expect(load.score, 60);
    });

    test('null load metrics is unavailable', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
      );
      final result = service.score(inputs);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      expect(load.isAvailable, isFalse);
    });
  });

  group('Subjective component scoring', () {
    test('all three fields available averages and maps to 0-100', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        subjective: SubjectiveInput(exhaustionLevel: 2, muscleSoreness: 3, stressLevel: 1),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.isAvailable, isTrue);
      final avg = ((10 - 2) + (10 - 3) + (10 - 1)) / 3;
      expect(sub.score, closeTo(avg * 10, 0.01));
    });

    test('only exhaustionLevel uses it alone', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        subjective: SubjectiveInput(exhaustionLevel: 5),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.score, closeTo(50, 0.01));
    });

    test('all zeros produces max subjective score', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        subjective: SubjectiveInput(exhaustionLevel: 0, muscleSoreness: 0, stressLevel: 0),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.score, closeTo(100, 0.01));
    });

    test('all max (10) produces zero subjective score', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        subjective: SubjectiveInput(exhaustionLevel: 10, muscleSoreness: 10, stressLevel: 10),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.score, closeTo(0, 0.01));
    });

    test('null subjective is unavailable', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.isAvailable, isFalse);
    });

    test('subjective with only note is unavailable', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        subjective: SubjectiveInput(note: 'feeling ok'),
      );
      final result = service.score(inputs);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);
      expect(sub.isAvailable, isFalse);
    });
  });

  group('Composite score and weight normalization', () {
    test('weights are normalized for available components only', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 10, remPercent: 10),
      );
      final result = service.score(inputs);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);

      final defaultCfg = const ReadinessScoringConfig();
      final totalWeight = defaultCfg.hrrWeight + defaultCfg.sleepWeight;
      final normalizedHrr = defaultCfg.hrrWeight / totalWeight;
      final normalizedSleep = defaultCfg.sleepWeight / totalWeight;
      final expected = hrr.score * normalizedHrr + sleep.score * normalizedSleep;

      expect(result.compositeScore, closeTo(expected, 0.01));
    });

    test('all four components available uses full weights', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 10, remPercent: 10),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 3, muscleSoreness: 3, stressLevel: 3),
      );
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.full);

      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      final sleep = findComponent(result.componentScores, ReadinessComponent.sleep);
      final load = findComponent(result.componentScores, ReadinessComponent.load);
      final sub = findComponent(result.componentScores, ReadinessComponent.subjective);

      expect(hrr.isAvailable, isTrue);
      expect(sleep.isAvailable, isTrue);
      expect(load.isAvailable, isTrue);
      expect(sub.isAvailable, isTrue);

      final cfg = const ReadinessScoringConfig();
      final totalW = cfg.hrrWeight + cfg.sleepWeight + cfg.loadWeight + cfg.subjectiveWeight;
      final expected = (hrr.score * cfg.hrrWeight +
              sleep.score * cfg.sleepWeight +
              load.score * cfg.loadWeight +
              sub.score * cfg.subjectiveWeight) /
          totalW;
      expect(result.compositeScore, closeTo(expected, 0.01));
    });

    test('custom config weights are respected', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480, deepPercent: 10, remPercent: 10),
      );
      final customConfig = const ReadinessScoringConfig(
        hrrWeight: 1.0,
        sleepWeight: 0.0,
      );
      final result = service.score(inputs, config: customConfig);
      final hrr = findComponent(result.componentScores, ReadinessComponent.hrr);
      expect(result.compositeScore, closeTo(hrr.score, 0.01));
    });
  });

  group('Confidence levels', () {
    test('4 available components → full confidence', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 3),
      );
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.full);
    });

    test('3 available components → partial confidence', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
        load: LoadMetrics(workloadRatio: 1.0),
      );
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.partial);
    });

    test('2 available components → estimated confidence', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
      );
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.estimated);
    });

    test('1 available component → unavailable confidence', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
      );
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.unavailable);
      expect(result.compositeScore, 0);
      expect(result.state, ReadinessState.unavailable);
    });

    test('0 available components → unavailable confidence', () {
      final inputs = ReadinessInputs(date: DateTime(2025, 1, 1));
      final result = service.score(inputs);
      expect(result.confidence, DataConfidence.unavailable);
      expect(result.compositeScore, 0);
    });
  });

  group('State thresholds', () {
    test('score >= 80 → excellent', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 50, baselineRhr: 55, rhrDelta: -5),
        sleep: SleepMetrics(totalDurationMinutes: 510, deepPercent: 22, remPercent: 22),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 1, muscleSoreness: 1, stressLevel: 1),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.excellent);
    });

    test('score 65-79 → good', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
        sleep: SleepMetrics(totalDurationMinutes: 450, deepPercent: 12, remPercent: 15),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 3, muscleSoreness: 3, stressLevel: 3),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.good);
    });

    test('custom config thresholds override defaults', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
        sleep: SleepMetrics(totalDurationMinutes: 450, deepPercent: 12, remPercent: 15),
      );
      final defaultResult = service.score(inputs);
      final customConfig = const ReadinessScoringConfig(
        excellentThreshold: 60.0,
      );
      final customResult = service.score(inputs, config: customConfig);
      expect(customResult.state == ReadinessState.excellent || customResult.state != defaultResult.state, isTrue);
    });
  });

  group('Adaptation type selection', () {
    test('excellent state → none', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 50, baselineRhr: 55, rhrDelta: -5),
        sleep: SleepMetrics(totalDurationMinutes: 510, deepPercent: 22, remPercent: 22),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 1, muscleSoreness: 1, stressLevel: 1),
      );
      final result = service.score(inputs);
      expect(result.adaptationType, AdaptationType.none);
    });

    test('good state → none', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
        sleep: SleepMetrics(totalDurationMinutes: 450, deepPercent: 12, remPercent: 15),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 3, muscleSoreness: 3, stressLevel: 3),
      );
      final result = service.score(inputs);
      expect(result.adaptationType, AdaptationType.none);
    });

    test('moderate state with high load → volumeReduction', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 58, baselineRhr: 55, rhrDelta: 2),
        sleep: SleepMetrics(totalDurationMinutes: 390, deepPercent: 8, remPercent: 8),
        load: LoadMetrics(workloadRatio: 1.7),
        subjective: SubjectiveInput(exhaustionLevel: 5, muscleSoreness: 5, stressLevel: 5),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.moderate);
      expect(result.adaptationType, AdaptationType.volumeReduction);
    });

    test('moderate state with normal load → intensityReduction', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 60, baselineRhr: 55, rhrDelta: 5),
        sleep: SleepMetrics(totalDurationMinutes: 390, deepPercent: 8, remPercent: 8),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 7, muscleSoreness: 7, stressLevel: 7),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.moderate);
      expect(result.adaptationType, AdaptationType.intensityReduction);
    });

    test('reduced state → swapToEasy', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 65, baselineRhr: 55, rhrDelta: 10),
        sleep: SleepMetrics(totalDurationMinutes: 270),
        load: LoadMetrics(workloadRatio: 1.7),
        subjective: SubjectiveInput(exhaustionLevel: 8, muscleSoreness: 8, stressLevel: 8),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.reduced);
      expect(result.adaptationType, AdaptationType.swapToEasy);
    });

    test('rest state → restOrReschedule', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 70, baselineRhr: 55, rhrDelta: 15),
        sleep: SleepMetrics(totalDurationMinutes: 200),
        load: LoadMetrics(workloadRatio: 2.5),
        subjective: SubjectiveInput(exhaustionLevel: 10, muscleSoreness: 10, stressLevel: 10),
      );
      final result = service.score(inputs);
      expect(result.state, ReadinessState.rest);
      expect(result.adaptationType, AdaptationType.restOrReschedule);
    });
  });

  group('Missing subjective never blocks scoring', () {
    test('3 objective components score normally without subjective', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
        sleep: SleepMetrics(totalDurationMinutes: 480),
        load: LoadMetrics(workloadRatio: 1.0),
      );
      final result = service.score(inputs);
      expect(result.state, isNot(ReadinessState.unavailable));
      expect(result.confidence, DataConfidence.partial);
      expect(result.compositeScore, greaterThan(0));
    });

    test('subjective unavailable does not cause unavailable result', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0),
        sleep: SleepMetrics(totalDurationMinutes: 480),
      );
      final result = service.score(inputs);
      expect(result.state, isNot(ReadinessState.unavailable));
    });
  });

  group('Reasons', () {
    test('available components include reasons', () {
      final inputs = ReadinessInputs(
        date: DateTime(2025, 1, 1),
        rhr: RhrMetrics(todayRhr: 55, baselineRhr: 55, rhrDelta: 0.5),
        sleep: SleepMetrics(totalDurationMinutes: 480),
        load: LoadMetrics(workloadRatio: 1.0),
        subjective: SubjectiveInput(exhaustionLevel: 3, muscleSoreness: 3, stressLevel: 3),
      );
      final result = service.score(inputs);
      expect(result.reasons, isNotEmpty);
    });

    test('unavailable result includes insufficient data reason', () {
      final inputs = ReadinessInputs(date: DateTime(2025, 1, 1));
      final result = service.score(inputs);
      expect(result.reasons, contains('Insufficient data for readiness assessment'));
    });
  });
}
