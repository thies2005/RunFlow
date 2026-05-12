import 'dart:math';

import '../../entities/readiness/readiness_entities.dart';

class TrimpResult {
  const TrimpResult({
    required this.trimp,
    required this.strategy,
    this.maxHrUsed,
    this.restingHrUsed,
  });

  final double trimp;
  final TrimpStrategy strategy;
  final int? maxHrUsed;
  final int? restingHrUsed;
}

class TrimpService {
  const TrimpService();

  double computeSessionTrimp({
    required int durationSeconds,
    required double? averageHr,
    required int maxHr,
    required int restingHr,
    String sex = 'male',
  }) {
    if (averageHr == null) return 0;

    final hrReserve = ((averageHr - restingHr) / (maxHr - restingHr)).clamp(0.0, 1.0);
    final exponent = sex.toLowerCase() == 'female' ? 1.67 : 1.92;
    final durationMinutes = durationSeconds / 60.0;

    return durationMinutes * hrReserve * 0.64 * exp(exponent * hrReserve);
  }

  double computeSessionTypeFallback({
    required int durationSeconds,
    required String workoutType,
    required TrimpConfig? config,
  }) {
    final cfg = config ?? const TrimpConfig();
    final multiplier = cfg.sessionTypeMultipliers[workoutType] ?? 1.0;
    final durationMinutes = durationSeconds / 60.0;

    return durationMinutes * multiplier * 0.8;
  }

  TrimpResult computeTrimp({
    required int durationSeconds,
    required double? averageHr,
    required int? maxHr,
    required int? restingHr,
    required String workoutType,
    required int? fallbackMaxHr,
    required int? fallbackRestingHr,
    TrimpConfig? config,
    String sex = 'male',
  }) {
    final resolvedMaxHr = maxHr ?? fallbackMaxHr;
    final resolvedRestingHr = restingHr ?? fallbackRestingHr;

    if (resolvedMaxHr == null || resolvedRestingHr == null) {
      return const TrimpResult(
        trimp: 0,
        strategy: TrimpStrategy.unavailable,
      );
    }

    if (averageHr != null) {
      final trimp = computeSessionTrimp(
        durationSeconds: durationSeconds,
        averageHr: averageHr,
        maxHr: resolvedMaxHr,
        restingHr: resolvedRestingHr,
        sex: sex,
      );
      return TrimpResult(
        trimp: trimp,
        strategy: TrimpStrategy.heartRateReserve,
        maxHrUsed: resolvedMaxHr,
        restingHrUsed: resolvedRestingHr,
      );
    }

    final trimp = computeSessionTypeFallback(
      durationSeconds: durationSeconds,
      workoutType: workoutType,
      config: config,
    );
    return TrimpResult(
      trimp: trimp,
      strategy: TrimpStrategy.sessionTypeFallback,
      maxHrUsed: resolvedMaxHr,
      restingHrUsed: resolvedRestingHr,
    );
  }

  double computeAtl(List<double> dailyTrimpValues, {TrimpConfig? config}) {
    if (dailyTrimpValues.isEmpty) return 0;

    final cfg = config ?? const TrimpConfig();
    final decay = cfg.atlDecayDays.toDouble();
    final factor = 1.0 / decay;

    double atl = 0;
    for (final trimp in dailyTrimpValues) {
      atl = atl * (1 - factor) + trimp * factor;
    }
    return atl;
  }

  double computeCtl(List<double> dailyTrimpValues, {TrimpConfig? config}) {
    if (dailyTrimpValues.isEmpty) return 0;

    final cfg = config ?? const TrimpConfig();
    final decay = cfg.ctlDecayDays.toDouble();
    final factor = 1.0 / decay;

    double ctl = 0;
    for (final trimp in dailyTrimpValues) {
      ctl = ctl * (1 - factor) + trimp * factor;
    }
    return ctl;
  }

  double computeTsb(double ctl, double atl) {
    return ctl - atl;
  }
}
