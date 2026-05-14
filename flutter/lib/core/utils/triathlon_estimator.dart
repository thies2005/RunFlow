import 'dart:math' as math;

double estimateSwimPaceFromVdot(double vdot) {
  if (vdot <= 0) return 120;
  final css = (180 - vdot * 1.5).round();
  return css.clamp(80, 180).toDouble();
}

double estimateBikeFtpFromVdot(double vdot) {
  if (vdot <= 0) return 100;
  final baseFTP = (vdot - 10) * 6 + 120;
  return baseFTP.clamp(100, 400).roundToDouble();
}

double bikePowerToSpeed(double watts) {
  return math.pow(watts / 0.38, 1 / 3).toDouble();
}

const Map<String, int> triSwimDist = {
  'SPRINT_TRI': 750,
  'OLYMPIC_TRI': 1500,
  'HALF_IRONMAN': 1900,
  'FULL_IRONMAN': 3800,
};

const Map<String, int> triBikeDist = {
  'SPRINT_TRI': 20000,
  'OLYMPIC_TRI': 40000,
  'HALF_IRONMAN': 90000,
  'FULL_IRONMAN': 180000,
};

const Map<String, int> triRunDist = {
  'SPRINT_TRI': 5000,
  'OLYMPIC_TRI': 10000,
  'HALF_IRONMAN': 21097,
  'FULL_IRONMAN': 42195,
};

class TransitionTimes {
  const TransitionTimes({required this.t1, required this.t2});

  final int t1;
  final int t2;
}

const Map<String, TransitionTimes> triTransitions = {
  'SPRINT_TRI': TransitionTimes(t1: 120, t2: 90),
  'OLYMPIC_TRI': TransitionTimes(t1: 150, t2: 120),
  'HALF_IRONMAN': TransitionTimes(t1: 330, t2: 210),
  'FULL_IRONMAN': TransitionTimes(t1: 510, t2: 360),
};

const defaultTransition = TransitionTimes(t1: 150, t2: 120);

class TriathlonSplits {
  const TriathlonSplits({
    required this.swimSeconds,
    required this.bikeSeconds,
    required this.runSeconds,
    required this.t1Seconds,
    required this.t2Seconds,
    required this.totalSeconds,
    required this.swimPacePer100m,
    required this.bikeAvgPower,
    required this.runPacePerKm,
  });

  final int swimSeconds;
  final int bikeSeconds;
  final int runSeconds;
  final int t1Seconds;
  final int t2Seconds;
  final int totalSeconds;
  final double swimPacePer100m;
  final double bikeAvgPower;
  final double runPacePerKm;
}

class TriathlonProjection {
  const TriathlonProjection({
    required this.optimal,
    required this.projected,
    required this.conservative,
  });

  final TriathlonSplits optimal;
  final TriathlonSplits projected;
  final TriathlonSplits conservative;
}

TriathlonSplits computeTriathlonSplits(
  double vdot,
  int swimDistM,
  int bikeDistM,
  int runDistM,
  TransitionTimes transitions,
  int Function(double vdot, int distanceM) estimateTimeFn, {
  double? cssOverride,
  double? bikeSpeedOverrideMs,
}) {
  final swimPace = cssOverride ?? estimateSwimPaceFromVdot(vdot);
  final swimSeconds = (swimPace * swimDistM / 100).round();

  int bikeSeconds;
  double bikeAvgPower;
  if (bikeSpeedOverrideMs != null && bikeSpeedOverrideMs > 0) {
    bikeSeconds = (bikeDistM / bikeSpeedOverrideMs).round();
    bikeAvgPower = math.pow(bikeSpeedOverrideMs, 3).toDouble() * 0.38;
  } else {
    final ftp = estimateBikeFtpFromVdot(vdot);
    bikeAvgPower = ftp * 0.75;
    final bikeSpeed = bikePowerToSpeed(bikeAvgPower);
    bikeSeconds = (bikeDistM / bikeSpeed).round();
  }

  final runSeconds = estimateTimeFn(vdot, runDistM);
  final totalSeconds =
      swimSeconds + bikeSeconds + runSeconds + transitions.t1 + transitions.t2;
  final runPacePerKm =
      runSeconds > 0 ? (runSeconds / (runDistM / 1000)) : 0.0;
  return TriathlonSplits(
    swimSeconds: swimSeconds,
    bikeSeconds: bikeSeconds,
    runSeconds: runSeconds,
    t1Seconds: transitions.t1,
    t2Seconds: transitions.t2,
    totalSeconds: totalSeconds,
    swimPacePer100m: swimPace,
    bikeAvgPower: bikeAvgPower,
    runPacePerKm: runPacePerKm,
  );
}

TriathlonProjection? estimateTriathlonTime(
  double vdot,
  String raceType,
  int Function(double vdot, int distanceM) estimateTimeFn, {
  int? customSwimDistM,
  int? customBikeDistM,
  int? customRunDistM,
  double? cssOverride,
  double? bikeSpeedOverrideMs,
}) {
  if (vdot <= 0) return null;

  final swimDistM = (customSwimDistM != null && customSwimDistM > 0)
      ? customSwimDistM
      : (triSwimDist[raceType] ?? triSwimDist['SPRINT_TRI']!);
  final bikeDistM = (customBikeDistM != null && customBikeDistM > 0)
      ? customBikeDistM
      : (triBikeDist[raceType] ?? triBikeDist['SPRINT_TRI']!);
  final runDistM = (customRunDistM != null && customRunDistM > 0)
      ? customRunDistM
      : (triRunDist[raceType] ?? triRunDist['SPRINT_TRI']!);
  final transitions = triTransitions[raceType] ?? defaultTransition;

  final optimal = computeTriathlonSplits(
      vdot, swimDistM, bikeDistM, runDistM, transitions, estimateTimeFn,
      cssOverride: cssOverride,
      bikeSpeedOverrideMs: bikeSpeedOverrideMs);

  final isLongCourse =
      raceType == 'HALF_IRONMAN' || raceType == 'FULL_IRONMAN';
  final projRunMult = isLongCourse ? 1.15 : 1.10;
  final consRunMult = isLongCourse ? 1.25 : 1.20;

  final projectedSplits = TriathlonSplits(
    swimSeconds: (optimal.swimSeconds * 1.05).round(),
    bikeSeconds: (optimal.bikeSeconds * 1.08).round(),
    runSeconds: (optimal.runSeconds * projRunMult).round(),
    t1Seconds: optimal.t1Seconds,
    t2Seconds: optimal.t2Seconds,
    totalSeconds: (optimal.swimSeconds * 1.05).round() +
        (optimal.bikeSeconds * 1.08).round() +
        (optimal.runSeconds * projRunMult).round() +
        optimal.t1Seconds +
        optimal.t2Seconds,
    swimPacePer100m: optimal.swimPacePer100m * 1.05,
    bikeAvgPower: optimal.bikeAvgPower,
    runPacePerKm: optimal.runPacePerKm * projRunMult,
  );

  final conservativeSplits = TriathlonSplits(
    swimSeconds: (optimal.swimSeconds * 1.10).round(),
    bikeSeconds: (optimal.bikeSeconds * 1.15).round(),
    runSeconds: (optimal.runSeconds * consRunMult).round(),
    t1Seconds: optimal.t1Seconds,
    t2Seconds: optimal.t2Seconds,
    totalSeconds: (optimal.swimSeconds * 1.10).round() +
        (optimal.bikeSeconds * 1.15).round() +
        (optimal.runSeconds * consRunMult).round() +
        optimal.t1Seconds +
        optimal.t2Seconds,
    swimPacePer100m: optimal.swimPacePer100m * 1.10,
    bikeAvgPower: optimal.bikeAvgPower,
    runPacePerKm: optimal.runPacePerKm * consRunMult,
  );

  return TriathlonProjection(
      optimal: optimal, projected: projectedSplits, conservative: conservativeSplits);
}

class BackyardResult {
  const BackyardResult({
    required this.perLoopSeconds,
    required this.totalSeconds,
    required this.totalDistM,
    required this.targetLaps,
  });

  final int perLoopSeconds;
  final int totalSeconds;
  final int totalDistM;
  final int targetLaps;
}

class BackyardProjection {
  const BackyardProjection({
    required this.optimal,
    required this.projected,
    required this.conservative,
  });

  final BackyardResult optimal;
  final BackyardResult projected;
  final BackyardResult conservative;
}

int _totalBackyardTime(int baseLoop, int laps, double fatiguePerLapPct) {
  int total = 0;
  for (int i = 1; i <= laps; i++) {
    final factor = i <= 3 ? 1.0 : 1.0 + ((i - 3) * fatiguePerLapPct);
    total += (baseLoop * factor).round();
  }
  return total;
}

BackyardProjection? estimateBackyardUltraTime(
  double vdot,
  int loopDistM,
  int targetLaps,
  int Function(double vdot, int distanceM) estimateTimeFn,
) {
  if (vdot <= 0 || loopDistM <= 0 || targetLaps < 1) return null;

  final baseLoop = estimateTimeFn(vdot, loopDistM);
  final totalDistM = loopDistM * targetLaps;

  return BackyardProjection(
    optimal: BackyardResult(
      perLoopSeconds: baseLoop,
      totalSeconds: _totalBackyardTime(baseLoop, targetLaps, 0.01),
      totalDistM: totalDistM,
      targetLaps: targetLaps,
    ),
    projected: BackyardResult(
      perLoopSeconds: baseLoop,
      totalSeconds: _totalBackyardTime(baseLoop, targetLaps, 0.02),
      totalDistM: totalDistM,
      targetLaps: targetLaps,
    ),
    conservative: BackyardResult(
      perLoopSeconds: baseLoop,
      totalSeconds: _totalBackyardTime(baseLoop, targetLaps, 0.04),
      totalDistM: totalDistM,
      targetLaps: targetLaps,
    ),
  );
}
