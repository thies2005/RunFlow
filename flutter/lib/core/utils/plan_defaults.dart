import 'dart:math';

import 'package:runflow_flutter/core/utils/race_defaults.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

/// Canonical source of truth for plan creation defaults.
///
/// Provides static helpers that return sensible default values (weekly volume,
/// run frequency, phase lengths, etc.) for every supported [RaceType].
/// Callers should use these methods when seeding a new training plan so that
/// defaults stay consistent across the app.
class PlanDefaults {
  /// Returns the recommended weekly mileage in **KILOMETERS** for [raceType].
  ///
  /// When [currentVdot] is provided and positive, the base value is adjusted
  /// to reflect the athlete's fitness and clamped to the range 10–120 km.
  static double weeklyMileageKm(RaceType raceType, {double? currentVdot}) {
    final base = getRaceDefaults(raceType).weeklyVolumeKm;
    if (currentVdot != null && currentVdot > 0) {
      final adjusted = adjustDefaultsForVdot(
        getRaceDefaults(raceType),
        currentVdot,
      );
      return adjusted.weeklyVolumeKm.clamp(10.0, 120.0);
    }
    return base;
  }

  /// Returns the recommended number of **runs per week** (integer count).
  ///
  /// Adjusted for fitness when a positive [currentVdot] is supplied.
  static int runsPerWeek(RaceType raceType, {double? currentVdot}) {
    if (currentVdot != null && currentVdot > 0) {
      return adjustDefaultsForVdot(
        getRaceDefaults(raceType),
        currentVdot,
      ).runsPerWeek;
    }
    return getRaceDefaults(raceType).runsPerWeek;
  }

  /// Returns the recommended number of **rides per week** (integer count).
  static int ridesPerWeek(RaceType raceType) {
    return getRaceDefaults(raceType).ridesPerWeek;
  }

  /// Returns the recommended number of **swims per week** (integer count).
  static int swimsPerWeek(RaceType raceType) {
    return getRaceDefaults(raceType).swimsPerWeek;
  }

  /// Returns the recommended number of **strength sessions per week** (integer count).
  static int strengthPerWeek(RaceType raceType) {
    return getRaceDefaults(raceType).strengthPerWeek;
  }

  /// Returns the maximum long-run distance in **KILOMETERS** for [raceType].
  static double maxLongRunKm(RaceType raceType) {
    return getRaceDefaults(raceType).maxLongRunKm;
  }

  /// Returns the total plan duration in **WEEKS** (integer).
  ///
  /// Computed as the recommended week count for [raceType], clamped to the
  /// range 4–24 weeks and capped by the number of weeks actually available
  /// between [planStartDate] (defaults to today) and [raceDate].
  static int planWeeks(RaceType raceType, DateTime raceDate,
      {DateTime? planStartDate}) {
    final start = planStartDate ?? _today();
    final available = raceDate.difference(start).inDays ~/ 7;
    final recommended = _recommendedPlanWeeks(raceType);
    return recommended.clamp(4, max(4, min(24, available)));
  }

  static int _recommendedPlanWeeks(RaceType raceType) {
    switch (raceType) {
      case RaceType.fiveK:
        return 8;
      case RaceType.tenK:
        return 10;
      case RaceType.halfMarathon:
        return 12;
      case RaceType.marathon:
        return 16;
      case RaceType.fiftyK:
        return 16;
      case RaceType.fiftyMile:
        return 18;
      case RaceType.hundredK:
        return 20;
      case RaceType.hundredMile:
        return 24;
      case RaceType.twelveHour:
        return 18;
      case RaceType.twentyFourHour:
        return 20;
      case RaceType.backyardUltra:
        return 16;
      case RaceType.sprintTri:
        return 10;
      case RaceType.olympicTri:
        return 12;
      case RaceType.halfIronman:
        return 16;
      case RaceType.fullIronman:
        return 20;
      case RaceType.customTri:
        return 14;
      case RaceType.customDistance:
        return 12;
    }
  }

  /// Returns phase lengths as `[taperWeeks, peakWeeks, buildWeeks]`
  /// (each an integer count of **WEEKS**).
  ///
  /// If the default phase total exceeds [totalWeeks], phases are scaled
  /// proportionally to fit.
  static List<int> phaseWeeks(int totalWeeks, RaceType raceType) {
    final defaults = getRaceDefaults(raceType);
    final taper = defaults.taperWeeks;
    final peak = defaults.peakWeeks;
    final build = defaults.buildWeeks;
    final total = taper + peak + build;
    if (total <= totalWeeks || total == 0) {
      return [taper, peak, build];
    }
    final proportion = totalWeeks / total;
    final clampedTaper = max(0, (taper * proportion).round());
    final clampedPeak = max(0, (peak * proportion).round());
    final clampedBuild = max(0, totalWeeks - clampedTaper - clampedPeak);
    return [clampedTaper, clampedPeak, clampedBuild];
  }

  /// Returns the number of **taper WEEKS** (integer) for [raceType].
  static int taperWeeks(RaceType raceType) {
    return getRaceDefaults(raceType).taperWeeks;
  }

  /// Returns the number of **peak WEEKS** (integer) for [raceType].
  static int peakWeeks(RaceType raceType) {
    return getRaceDefaults(raceType).peakWeeks;
  }

  /// Returns the number of **build WEEKS** (integer) for [raceType].
  static int buildWeeks(RaceType raceType) {
    return getRaceDefaults(raceType).buildWeeks;
  }

  /// Returns the backyard-ultra loop distance in **METERS**, or `null` if
  /// the race type is not a backyard ultra.
  static int? backyardLoopDistM(RaceType raceType) {
    return getRaceDefaults(raceType).backyardLoopDistM;
  }

  /// Returns the target number of **laps** (integer count) for a backyard
  /// ultra, or `null` if the race type is not a backyard ultra.
  static int? targetLaps(RaceType raceType) {
    return getRaceDefaults(raceType).targetLaps;
  }

  /// Resolves and returns a [RaceDefaults] object for [raceType].
  ///
  /// When [currentVdot] is provided and positive, the defaults are adjusted
  /// to reflect the athlete's current fitness level.
  static RaceDefaults resolve(RaceType raceType, {double? currentVdot}) {
    final base = getRaceDefaults(raceType);
    if (currentVdot != null && currentVdot > 0) {
      return adjustDefaultsForVdot(base, currentVdot);
    }
    return base;
  }

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }
}
