import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';
import 'package:runflow_flutter/services/readiness_orchestrator.dart';

class MockHealthConnectService extends Mock implements HealthConnectService {}

void main() {
  late MockHealthConnectService mockHealth;
  late ReadinessScoringService scoringService;
  late TrimpService trimpService;
  late ReadinessOrchestrator orchestrator;

  setUp(() {
    mockHealth = MockHealthConnectService();
    scoringService = const ReadinessScoringService();
    trimpService = const TrimpService();
    orchestrator = ReadinessOrchestrator(
      healthConnect: mockHealth,
      scoringService: scoringService,
      trimpService: trimpService,
    );
  });

  group('collectInputs', () {
    test('returns RHR metrics when RHR data available', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 58.0,
        '2025-05-02': 59.0,
        '2025-05-03': 60.0,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr, isNotNull);
      expect(inputs.rhr!.todayRhr, 60.0);
    });

    test('returns sleep metrics when sleep data available', () async {
      final sleepHistory = <String, SleepDayData>{
        '2025-05-03': const SleepDayData(
          totalMinutes: 480,
          deepMinutes: 90,
          remMinutes: 100,
          lightMinutes: 200,
        ),
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => sleepHistory);

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.sleep, isNotNull);
      expect(inputs.sleep!.totalDurationMinutes, 480);
      expect(inputs.sleep!.deepMinutes, 90);
      expect(inputs.sleep!.remMinutes, 100);
      expect(inputs.sleep!.lightMinutes, 200);
    });

    test('returns null RHR when no RHR data', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr, isNull);
    });

    test('returns null sleep when no sleep data', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.sleep, isNull);
    });

    test('load is unavailable by default', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.load, isNotNull);
      expect(inputs.load!.trimpStrategy, TrimpStrategy.unavailable);
    });
  });

  group('RHR median computation', () {
    test('computes correct median for odd number of values', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 55.0,
        '2025-05-02': 60.0,
        '2025-05-03': 65.0,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr!.baselineRhr, 60.0);
    });

    test('computes correct median for even number of values', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 55.0,
        '2025-05-02': 58.0,
        '2025-05-03': 62.0,
        '2025-05-04': 65.0,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr!.baselineRhr, 62.0);
    });
  });

  group('RHR delta and trend direction', () {
    test('positive delta when today RHR is above baseline', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 55.0,
        '2025-05-02': 58.0,
        '2025-05-03': 62.0,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr!.rhrDelta, greaterThan(0));
      expect(inputs.rhr!.trendDirection, 1);
    });

    test('negative trend when today RHR is well below baseline', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 65.0,
        '2025-05-02': 63.0,
        '2025-05-03': 55.0,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr!.rhrDelta, lessThan(-1));
      expect(inputs.rhr!.trendDirection, -1);
    });

    test('zero trend when delta is within ±1', () async {
      final rhrHistory = <String, double>{
        '2025-05-01': 59.5,
        '2025-05-02': 60.0,
        '2025-05-03': 60.3,
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => rhrHistory);
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr!.rhrDelta!.abs(), lessThan(1));
      expect(inputs.rhr!.trendDirection, 0);
    });
  });

  group('sleep metric computation', () {
    test('computes deep and rem percentages', () async {
      final sleepHistory = <String, SleepDayData>{
        '2025-05-03': const SleepDayData(
          totalMinutes: 480,
          deepMinutes: 96,
          remMinutes: 96,
          lightMinutes: 200,
        ),
      };
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => sleepHistory);

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.sleep!.deepPercent, closeTo(20.0, 0.01));
      expect(inputs.sleep!.remPercent, closeTo(20.0, 0.01));
      expect(inputs.sleep!.sleepEfficiency, 0.85);
    });
  });

  group('computeReadiness', () {
    test('delegates to scoring service', () async {
      final inputs = ReadinessInputs(
        date: DateTime.now(),
        rhr: const RhrMetrics(
          todayRhr: 55,
          baselineRhr: 58,
          rhrDelta: -3,
          trendDirection: -1,
        ),
        sleep: const SleepMetrics(
          totalDurationMinutes: 480,
          deepMinutes: 96,
          remMinutes: 96,
          sleepEfficiency: 0.85,
        ),
        load: const LoadMetrics(trimpStrategy: TrimpStrategy.unavailable),
      );

      final result = await orchestrator.computeReadiness(inputs: inputs);

      expect(result.compositeScore, greaterThan(0));
      expect(result.state, isNot(ReadinessState.unavailable));
    });

    test('uses custom config when provided', () async {
      final inputs = ReadinessInputs(
        date: DateTime.now(),
        rhr: const RhrMetrics(
          todayRhr: 55,
          baselineRhr: 58,
          rhrDelta: -3,
          trendDirection: -1,
        ),
        sleep: const SleepMetrics(
          totalDurationMinutes: 480,
          deepMinutes: 96,
          remMinutes: 96,
          sleepEfficiency: 0.85,
        ),
        load: const LoadMetrics(trimpStrategy: TrimpStrategy.unavailable),
      );

      const customConfig = ReadinessScoringConfig(
        excellentThreshold: 90,
        goodThreshold: 75,
      );

      final result = await orchestrator.computeReadiness(
        inputs: inputs,
        config: customConfig,
      );

      expect(result.compositeScore, greaterThan(0));
    });
  });

  group('error handling', () {
    test('handles Health Connect exceptions gracefully for RHR', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenThrow(Exception('Health Connect unavailable'));
      when(() => mockHealth.readSleepHistory(28))
          .thenAnswer((_) async => {});

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr, isNull);
      expect(inputs.sleep, isNull);
    });

    test('handles Health Connect exceptions gracefully for sleep', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenAnswer((_) async => {});
      when(() => mockHealth.readSleepHistory(28))
          .thenThrow(Exception('Health Connect unavailable'));

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr, isNull);
      expect(inputs.sleep, isNull);
    });

    test('handles both RHR and sleep exceptions', () async {
      when(() => mockHealth.readRestingHeartRateHistory(30))
          .thenThrow(Exception('Health Connect unavailable'));
      when(() => mockHealth.readSleepHistory(28))
          .thenThrow(Exception('Health Connect unavailable'));

      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );

      expect(inputs.rhr, isNull);
      expect(inputs.sleep, isNull);
      expect(inputs.load, isNotNull);
      expect(inputs.date, isNotNull);
    });
  });
}
