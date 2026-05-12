import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';

class ReadinessOrchestrator {
  ReadinessOrchestrator({
    required this.healthConnect,
    required this.scoringService,
    required this.trimpService,
    required this.activityRepository,
  });

  final HealthConnectService healthConnect;
  final ReadinessScoringService scoringService;
  final TrimpService trimpService;
  final ActivityRepository activityRepository;

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

    LoadMetrics load = const LoadMetrics(trimpStrategy: TrimpStrategy.unavailable);
    try {
      final since = DateTime.now().subtract(const Duration(days: 42));
      final recentActivitiesRes = await activityRepository.listActivities(limit: 100);
      final recentActivities = recentActivitiesRes.activities.where((a) => a.startDate.isAfter(since)).toList();

      if (recentActivities.isNotEmpty) {
        // Group TRIMP by day over the last 42 days
        final dailyTrimpMap = <int, double>{};
        for (final activity in recentActivities) {
          final daysAgo = DateTime.now().difference(activity.startDate).inDays;
          if (daysAgo >= 0 && daysAgo < 42) {
            double trimpValue = activity.trimp ?? 0;
            if (trimpValue == 0) {
              final result = trimpService.computeTrimp(
                durationSeconds: activity.movingTime,
                averageHr: activity.averageHr,
                maxHr: maxHr,
                restingHr: restingHr,
                workoutType: activity.type.name,
                fallbackMaxHr: 190,
                fallbackRestingHr: 60,
              );
              trimpValue = result.trimp;
            }
            dailyTrimpMap[daysAgo] = (dailyTrimpMap[daysAgo] ?? 0) + trimpValue;
          }
        }

        final dailyTrimpValues = List<double>.generate(42, (i) => dailyTrimpMap[i] ?? 0.0).reversed.toList();
        
        final ctl = trimpService.computeCtl(dailyTrimpValues);
        final atl = trimpService.computeAtl(dailyTrimpValues);
        final tsb = trimpService.computeTsb(ctl, atl);

        load = LoadMetrics(
          trimpStrategy: maxHr != null && restingHr != null 
            ? TrimpStrategy.heartRateReserve 
            : TrimpStrategy.sessionTypeFallback,
          atl: atl,
          ctl: ctl,
          tsb: tsb,
        );
      }
    } catch (_) {}

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
    double? sleepEfficiency;
    if (totalMinutes > 0) {
      deepPercent = deepMinutes / totalMinutes * 100;
      remPercent = remMinutes / totalMinutes * 100;
      final knownStageMinutes = deepMinutes + remMinutes + lightMinutes;
      if (knownStageMinutes > 0) {
        sleepEfficiency = knownStageMinutes / totalMinutes;
      }
    }

    return SleepMetrics(
      totalDurationMinutes: totalMinutes,
      deepMinutes: deepMinutes,
      remMinutes: remMinutes,
      lightMinutes: lightMinutes,
      deepPercent: deepPercent,
      remPercent: remPercent,
      sleepEfficiency: sleepEfficiency,
    );
  }
}
