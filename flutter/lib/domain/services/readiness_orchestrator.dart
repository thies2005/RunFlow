import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/data/services/health_connect_service.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

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
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect RHR inputs: $e');
    }

    try {
      final sleepHistory = await healthConnect.readSleepHistory(28);
      if (sleepHistory.isNotEmpty) {
        sleepMetrics = _computeSleepMetrics(sleepHistory);
      }
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect sleep inputs: $e');
    }

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
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect load inputs: $e');
    }

    return ReadinessInputs(
      date: DateTime.now(),
      rhr: rhrMetrics,
      sleep: sleepMetrics,
      load: load,
      maxHr: maxHr,
      restingHr: restingHr,
    );
  }

  Future<ReadinessInputs> collectInputsForDate({
    required DateTime targetDate,
    Map<String, double>? rhrHistory,
    Map<String, SleepDayData>? sleepHistory,
    int? maxHr,
    int? restingHr,
    int? age,
  }) async {
    final dateKey = _fmtDate(targetDate);

    RhrMetrics? rhrMetrics;
    try {
      final history =
          rhrHistory ?? await healthConnect.readRestingHeartRateHistory(30);
      if (history.containsKey(dateKey)) {
        final todayRhr = history[dateKey]!;
        final values = history.values.toList()..sort();
        final baselineRhr = values[values.length ~/ 2];
        final rhrDelta = todayRhr - baselineRhr;
        int trendDirection = 0;
        if (rhrDelta < -1) {
          trendDirection = -1;
        } else if (rhrDelta > 1) {
          trendDirection = 1;
        }
        rhrMetrics = RhrMetrics(
          todayRhr: todayRhr,
          baselineRhr: baselineRhr,
          rhrDelta: rhrDelta,
          trendDirection: trendDirection,
        );
      }
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect RHR inputs for date: $e');
    }

    SleepMetrics? sleepMetrics;
    try {
      final history =
          sleepHistory ?? await healthConnect.readSleepHistory(28);
      final prevDateKey = _fmtDate(targetDate.subtract(const Duration(days: 1)));
      final sleep = history[dateKey] ?? history[prevDateKey];
      if (sleep != null) {
        final totalMinutes = sleep.totalMinutes;
        final deepMinutes = sleep.deepMinutes;
        final remMinutes = sleep.remMinutes;
        final lightMinutes = sleep.lightMinutes;

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

        sleepMetrics = SleepMetrics(
          totalDurationMinutes: totalMinutes,
          deepMinutes: deepMinutes,
          remMinutes: remMinutes,
          lightMinutes: lightMinutes,
          deepPercent: deepPercent,
          remPercent: remPercent,
          sleepEfficiency: sleepEfficiency,
        );
      }
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect sleep inputs for date: $e');
    }

    LoadMetrics load = const LoadMetrics(trimpStrategy: TrimpStrategy.unavailable);
    try {
      final since = targetDate.subtract(const Duration(days: 42));
      final recentActivitiesRes =
          await activityRepository.listActivities(limit: 100);
      final recentActivities = recentActivitiesRes.activities
          .where((a) =>
              a.startDate.isAfter(since) && !a.startDate.isAfter(targetDate))
          .toList();

      if (recentActivities.isNotEmpty) {
        final dailyTrimpMap = <int, double>{};
        for (final activity in recentActivities) {
          final daysAgo = targetDate.difference(activity.startDate).inDays;
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
            dailyTrimpMap[daysAgo] =
                (dailyTrimpMap[daysAgo] ?? 0) + trimpValue;
          }
        }

        final dailyTrimpValues = List<double>.generate(
            42, (i) => dailyTrimpMap[i] ?? 0.0).reversed.toList();

        final ctl = trimpService.computeCtl(dailyTrimpValues);
        final atl = trimpService.computeAtl(dailyTrimpValues);
        final tsb = trimpService.computeTsb(ctl, atl);
        final workloadRatio = ctl > 0 ? atl / ctl : null;

        load = LoadMetrics(
          trimpStrategy: maxHr != null && restingHr != null
              ? TrimpStrategy.heartRateReserve
              : TrimpStrategy.sessionTypeFallback,
          todayTrimp: dailyTrimpMap[0],
          atl: atl,
          ctl: ctl,
          tsb: tsb,
          workloadRatio: workloadRatio,
        );
      }
    } catch (e) {
      logger.debug('ReadinessOrchestrator: Failed to collect load inputs for date: $e');
    }

    return ReadinessInputs(
      date: targetDate,
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

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

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
