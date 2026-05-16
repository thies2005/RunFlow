import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

class RaceDefaults {
  const RaceDefaults({
    required this.runsPerWeek,
    required this.ridesPerWeek,
    required this.swimsPerWeek,
    required this.strengthPerWeek,
    required this.weeklyVolumeKm,
    required this.maxLongRunKm,
    required this.taperWeeks,
    required this.peakWeeks,
    required this.buildWeeks,
    this.backyardLoopDistM,
    this.targetLaps,
  });

  final int runsPerWeek;
  final int ridesPerWeek;
  final int swimsPerWeek;
  final int strengthPerWeek;
  final double weeklyVolumeKm;
  final double maxLongRunKm;
  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;
  final int? backyardLoopDistM;
  final int? targetLaps;
}

const Map<RaceType, RaceDefaults> _raceDefaults = {
  RaceType.fiveK: RaceDefaults(
    runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 28, maxLongRunKm: 18, taperWeeks: 1, peakWeeks: 2, buildWeeks: 4,
  ),
  RaceType.tenK: RaceDefaults(
    runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
  ),
  RaceType.halfMarathon: RaceDefaults(
    runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 45, maxLongRunKm: 24, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
  ),
  RaceType.marathon: RaceDefaults(
    runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 58, maxLongRunKm: 32, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
  ),
  RaceType.fiftyK: RaceDefaults(
    runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 70, maxLongRunKm: 35, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
  ),
  RaceType.fiftyMile: RaceDefaults(
    runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 80, maxLongRunKm: 40, taperWeeks: 2, peakWeeks: 3, buildWeeks: 6,
  ),
  RaceType.hundredK: RaceDefaults(
    runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 90, maxLongRunKm: 45, taperWeeks: 2, peakWeeks: 3, buildWeeks: 6,
  ),
  RaceType.hundredMile: RaceDefaults(
    runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 105, maxLongRunKm: 50, taperWeeks: 3, peakWeeks: 4, buildWeeks: 8,
  ),
  RaceType.twelveHour: RaceDefaults(
    runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 80, maxLongRunKm: 40, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
  ),
  RaceType.twentyFourHour: RaceDefaults(
    runsPerWeek: 6, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 95, maxLongRunKm: 50, taperWeeks: 3, peakWeeks: 4, buildWeeks: 6,
  ),
  RaceType.backyardUltra: RaceDefaults(
    runsPerWeek: 5, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 60, maxLongRunKm: 35, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5,
    backyardLoopDistM: 6706, targetLaps: 2,
  ),
  RaceType.sprintTri: RaceDefaults(
    runsPerWeek: 3, ridesPerWeek: 2, swimsPerWeek: 2, strengthPerWeek: 2,
    weeklyVolumeKm: 25, maxLongRunKm: 15, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
  ),
  RaceType.olympicTri: RaceDefaults(
    runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
    weeklyVolumeKm: 30, maxLongRunKm: 18, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
  ),
  RaceType.halfIronman: RaceDefaults(
    runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
    weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
  ),
  RaceType.fullIronman: RaceDefaults(
    runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
    weeklyVolumeKm: 40, maxLongRunKm: 30, taperWeeks: 3, peakWeeks: 4, buildWeeks: 4,
  ),
  RaceType.customTri: RaceDefaults(
    runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2, strengthPerWeek: 2,
    weeklyVolumeKm: 35, maxLongRunKm: 22, taperWeeks: 2, peakWeeks: 3, buildWeeks: 4,
  ),
  RaceType.customDistance: RaceDefaults(
    runsPerWeek: 4, ridesPerWeek: 0, swimsPerWeek: 0, strengthPerWeek: 2,
    weeklyVolumeKm: 40, maxLongRunKm: 25, taperWeeks: 2, peakWeeks: 2, buildWeeks: 4,
  ),
};

RaceDefaults getRaceDefaults(RaceType raceType) {
  return _raceDefaults[raceType] ?? _raceDefaults[RaceType.marathon]!;
}

RaceDefaults adjustDefaultsForVdot(RaceDefaults defaults, double vdot) {
  if (vdot <= 0) return defaults;
  double volumeFactor;
  if (vdot < 30) {
    volumeFactor = 0.85;
  } else if (vdot < 40) {
    volumeFactor = 1.0;
  } else if (vdot < 50) {
    volumeFactor = 1.10;
  } else {
    volumeFactor = 1.15;
  }
  return RaceDefaults(
    runsPerWeek: vdot < 30 ? (defaults.runsPerWeek - 1).clamp(3, 7) : defaults.runsPerWeek,
    ridesPerWeek: defaults.ridesPerWeek,
    swimsPerWeek: defaults.swimsPerWeek,
    strengthPerWeek: defaults.strengthPerWeek,
    weeklyVolumeKm: (defaults.weeklyVolumeKm * volumeFactor).roundToDouble(),
    maxLongRunKm: defaults.maxLongRunKm,
    taperWeeks: defaults.taperWeeks,
    peakWeeks: defaults.peakWeeks,
    buildWeeks: defaults.buildWeeks,
    backyardLoopDistM: defaults.backyardLoopDistM,
    targetLaps: defaults.targetLaps,
  );
}
