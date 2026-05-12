import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';

class ReadinessOrchestrator {
  ReadinessOrchestrator({
    required this.healthConnect,
    required this.scoringService,
    required this.trimpService,
  });

  final HealthConnectService healthConnect;
  final ReadinessScoringService scoringService;
  final TrimpService trimpService;

  Future<ReadinessInputs> collectInputs({
    required int? maxHr,
    required int? restingHr,
    required int? age,
  }) async {
    RhrMetrics? rhrMetrics;
    SleepMetrics? sleepMetrics;

    try {
      final rhrHistory = await healthConnect.readRestingHeartRateHistory(30);
      if (rhrHistory.isNotEmpty) {
        rhrMetrics = _computeRhrMetrics(rhrHistory);
      }
    } catch (_) {}

    try {
      final sleepHistory = await healthConnect.readSleepHistory(28);
      if (sleepHistory.isNotEmpty) {
        sleepMetrics = _computeSleepMetrics(sleepHistory);
      }
    } catch (_) {}

    const load = LoadMetrics(trimpStrategy: TrimpStrategy.unavailable);

    return ReadinessInputs(
      date: DateTime.now(),
      rhr: rhrMetrics,
      sleep: sleepMetrics,
      load: load,
      maxHr: maxHr,
      restingHr: restingHr,
    );
  }

  Future<ReadinessResult> computeReadiness({
    required ReadinessInputs inputs,
    ReadinessScoringConfig? config,
  }) async {
    return scoringService.score(inputs, config: config);
  }

  RhrMetrics _computeRhrMetrics(Map<String, double> history) {
    final sortedDates = history.keys.toList()..sort();
    final todayRhr = history[sortedDates.last];

    final values = history.values.toList()..sort();
    final baselineRhr = values[values.length ~/ 2];

    final rhrDelta = todayRhr != null ? todayRhr - baselineRhr : null;

    int trendDirection = 0;
    if (rhrDelta != null) {
      if (rhrDelta < -1) {
        trendDirection = -1;
      } else if (rhrDelta > 1) {
        trendDirection = 1;
      }
    }

    return RhrMetrics(
      todayRhr: todayRhr,
      baselineRhr: baselineRhr,
      rhrDelta: rhrDelta,
      trendDirection: trendDirection,
    );
  }

  SleepMetrics _computeSleepMetrics(Map<String, SleepDayData> history) {
    final sortedDates = history.keys.toList()..sort();
    final lastNight = history[sortedDates.last]!;

    final totalMinutes = lastNight.totalMinutes;
    final deepMinutes = lastNight.deepMinutes;
    final remMinutes = lastNight.remMinutes;
    final lightMinutes = lastNight.lightMinutes;

    double? deepPercent;
    double? remPercent;
    if (totalMinutes > 0) {
      deepPercent = deepMinutes / totalMinutes * 100;
      remPercent = remMinutes / totalMinutes * 100;
    }

    return SleepMetrics(
      totalDurationMinutes: totalMinutes,
      deepMinutes: deepMinutes,
      remMinutes: remMinutes,
      lightMinutes: lightMinutes,
      deepPercent: deepPercent,
      remPercent: remPercent,
      sleepEfficiency: 0.85,
    );
  }
}
