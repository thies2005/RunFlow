import 'dart:math';

const Map<String, double> raceDistances = {
  '5K': 5000,
  '10K': 10000,
  'HALF': 21097.5,
  'MARATHON': 42195,
};

double calculateVdotFromRace({
  required String distanceKey,
  required int timeSeconds,
}) {
  if (timeSeconds <= 0) return 0;
  final distanceMeters = raceDistances[distanceKey] ?? 42195;
  return calculateVdot(distanceMeters, timeSeconds / 60.0);
}

double calculateVdot(double distanceMeters, double timeMinutes) {
  if (timeMinutes <= 0 || distanceMeters <= 0) return 0;

  final velocity = distanceMeters / timeMinutes;
  final vo2 = -4.60 + 0.182258 * velocity + 0.000104 * pow(velocity, 2);
  final pctVo2max = 0.8 +
      0.1894393 * exp(-0.012778 * timeMinutes) +
      0.2989558 * exp(-0.1932605 * timeMinutes);
  return vo2 / pctVo2max;
}

int predictRaceTime(double vdot, String distanceKey) {
  if (vdot <= 0) return 0;
  final distanceMeters = raceDistances[distanceKey] ?? 42195;
  return _predictRaceTimeBinarySearch(vdot, distanceMeters);
}

int _predictRaceTimeBinarySearch(double vdot, double distanceMeters) {
  double low = 600;
  double high = 18000;

  for (int i = 0; i < 50; i++) {
    final mid = (low + high) / 2;
    final testVdot = calculateVdot(distanceMeters, mid / 60.0);

    if ((testVdot - vdot).abs() < 0.01) {
      return mid.round();
    }

    if (testVdot > vdot) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return ((low + high) / 2).round();
}

double velocityAtPercentVO2max(double vdot, double percentVO2max) {
  final vo2 = vdot * percentVO2max;
  const a = 0.000104;
  const b = 0.182258;
  final c = -4.60 - vo2;

  final discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;

  return (-b + sqrt(discriminant)) / (2 * a);
}

int velocityToPace(double velocityMetersPerMin) {
  if (velocityMetersPerMin <= 0) return 0;
  final secondsPerKm = (1000 / velocityMetersPerMin) * 60;
  return secondsPerKm.round();
}

TrainingPaces calculateTrainingPaces(double vdot) {
  final easyMinVelocity = velocityAtPercentVO2max(vdot, 0.65);
  final easyMaxVelocity = velocityAtPercentVO2max(vdot, 0.79);
  final marathonVelocity = velocityAtPercentVO2max(vdot, 0.78);
  final thresholdVelocity = velocityAtPercentVO2max(vdot, 0.88);
  final intervalVelocity = velocityAtPercentVO2max(vdot, 1.0);
  final repVelocity = velocityAtPercentVO2max(vdot, 1.05);

  return TrainingPaces(
    easyMin: velocityToPace(easyMaxVelocity),
    easyMax: velocityToPace(easyMinVelocity),
    marathon: velocityToPace(marathonVelocity),
    threshold: velocityToPace(thresholdVelocity),
    interval: velocityToPace(intervalVelocity),
    repetition: velocityToPace(repVelocity),
  );
}

class TrainingPaces {
  const TrainingPaces({
    required this.easyMin,
    required this.easyMax,
    required this.marathon,
    required this.threshold,
    required this.interval,
    required this.repetition,
  });

  final int easyMin;
  final int easyMax;
  final int marathon;
  final int threshold;
  final int interval;
  final int repetition;
}

class ProjectedGoalResult {
  const ProjectedGoalResult({
    required this.optimalTime,
    required this.projectedTime,
    required this.conservativeTime,
    required this.projectedVdot,
    required this.improvementPercent,
    required this.projectedShape,
    required this.shapeImprovementPercent,
  });

  final int optimalTime;
  final int projectedTime;
  final int conservativeTime;
  final double projectedVdot;
  final double improvementPercent;
  final double projectedShape;
  final double shapeImprovementPercent;
}

const _maxImprovementFactor = 1.15;
const _durationImprovementRate = 0.008;
const _frequencyImprovementRate = 0.02;
const _volumeImprovementRate = 0.015;

const Map<String, double> _shapeImpact = {
  '5K': 0.05,
  '10K': 0.08,
  'HALF': 0.15,
  'MARATHON': 0.30,
};

double _calculateShapePenalty(String raceDistance, double currentShapePercent) {
  final shapeImpact = _shapeImpact[raceDistance] ?? 0.30;
  return (1 - min(currentShapePercent, 100) / 100) * shapeImpact;
}

double _calculateProgressionCoefficient(
  int durationWeeks,
  int runsPerWeek,
  double weeklyVolumeKm,
) {
  if (durationWeeks <= 0) return 1.0;

  final durationContribution = (durationWeeks / 4) * _durationImprovementRate;
  final frequencyContribution = (runsPerWeek / 4) * _frequencyImprovementRate;
  final volumeContribution = (weeklyVolumeKm / 50) * _volumeImprovementRate;

  final progressionFactor =
      1 + durationContribution + frequencyContribution + volumeContribution;
  return min(progressionFactor, _maxImprovementFactor);
}

String raceTypeToDistanceKey(String raceType) {
  switch (raceType) {
    case 'FIVE_K':
    case 'fiveK':
      return '5K';
    case 'TEN_K':
    case 'tenK':
      return '10K';
    case 'HALF_MARATHON':
    case 'halfMarathon':
      return 'HALF';
    case 'MARATHON':
    case 'marathon':
      return 'MARATHON';
    default:
      return 'MARATHON';
  }
}

String raceTypeToApiString(String raceType) {
  switch (raceType) {
    case 'fiveK':
      return 'FIVE_K';
    case 'tenK':
      return 'TEN_K';
    case 'halfMarathon':
      return 'HALF_MARATHON';
    case 'marathon':
      return 'MARATHON';
    default:
      return raceType;
  }
}

ProjectedGoalResult calculateProjectedGoalTime(
  double currentVO2max,
  String raceDistanceKey,
  int durationWeeks,
  int runsPerWeek,
  double weeklyMileageGoal,
  int taperWeeks,
  int peakWeeks,
  int buildWeeks,
  double currentShapePercent,
) {
  if (currentVO2max <= 0 || durationWeeks <= 0) {
    return const ProjectedGoalResult(
      optimalTime: 0,
      projectedTime: 0,
      conservativeTime: 0,
      projectedVdot: 0,
      improvementPercent: 0,
      projectedShape: 0,
      shapeImprovementPercent: 0,
    );
  }

  final progressionFactor = _calculateProgressionCoefficient(
    durationWeeks,
    runsPerWeek,
    weeklyMileageGoal,
  );

  final projectedVdot = currentVO2max * progressionFactor;
  final improvementPercent = (progressionFactor - 1) * 100;

  const shapeImprovementPer10Km = 2.0;
  const shapeImprovementPer4Weeks = 1.0;

  final effectiveCurrentKm = weeklyMileageGoal * 0.5;
  final mileageIncrease = max(0, weeklyMileageGoal - effectiveCurrentKm);
  final shapeFromMileage = (mileageIncrease / 10) * shapeImprovementPer10Km;
  final shapeFromDuration = (durationWeeks / 4) * shapeImprovementPer4Weeks;
  final totalShapeImprovement = shapeFromMileage + shapeFromDuration;
  final projectedShape = min(100.0, currentShapePercent + totalShapeImprovement);
  final shapeImprovementPercent = projectedShape - currentShapePercent;

  final optimalTime = predictRaceTime(projectedVdot, raceDistanceKey);
  final projectedPenalty =
      _calculateShapePenalty(raceDistanceKey, projectedShape);
  final projectedTime = (optimalTime * (1 + projectedPenalty)).round();

  final conservativeVdot =
      currentVO2max * (1 + (progressionFactor - 1) * 0.5);
  final conservativeBase = predictRaceTime(conservativeVdot, raceDistanceKey);
  final conservativePenalty =
      _calculateShapePenalty(raceDistanceKey, currentShapePercent);
  final conservativeTime =
      (conservativeBase * (1 + conservativePenalty)).round();

  return ProjectedGoalResult(
    optimalTime: optimalTime,
    projectedTime: projectedTime,
    conservativeTime: conservativeTime,
    projectedVdot: (projectedVdot * 10).roundToDouble() / 10,
    improvementPercent: (improvementPercent * 10).roundToDouble() / 10,
    projectedShape: projectedShape.roundToDouble(),
    shapeImprovementPercent:
        (shapeImprovementPercent * 10).roundToDouble() / 10,
  );
}

String formatDuration(int totalSeconds) {
  if (totalSeconds <= 0) return '--:--';
  final hours = totalSeconds ~/ 3600;
  final mins = (totalSeconds % 3600) ~/ 60;
  final secs = totalSeconds % 60;

  if (hours > 0) {
    return '$hours:${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }
  return '$mins:${secs.toString().padLeft(2, '0')}';
}

String formatPace(int secsPerKm) {
  if (secsPerKm <= 0) return '--:--';
  final mins = secsPerKm ~/ 60;
  final secs = secsPerKm % 60;
  return '$mins:${secs.toString().padLeft(2, '0')}/km';
}

int calculateDefaultMaxLongRunKm(String raceType, double weeklyMileageKm) {
  final key = raceTypeToDistanceKey(raceType);
  const maxByRace = <String, double>{
    '5K': 18,
    '10K': 22,
    'HALF': 24,
    'MARATHON': 32,
  };
  final raceCap = maxByRace[key] ?? 22;
  final calculated = (weeklyMileageKm * 0.55).round();
  return max(6, min(calculated, raceCap.toInt()));
}

List<HeartRateZone> calculateHRZonesFromLTHR(int lthr) {
  if (lthr <= 0) return [];
  return [
    HeartRateZone(label: 'Z1 Recovery', min: 0, max: (lthr * 0.75).round()),
    HeartRateZone(
        label: 'Z2 Aerobic',
        min: (lthr * 0.75).round() + 1,
        max: (lthr * 0.87).round()),
    HeartRateZone(
        label: 'Z3 Tempo',
        min: (lthr * 0.87).round() + 1,
        max: (lthr * 0.94).round()),
    HeartRateZone(
        label: 'Z4 Threshold',
        min: (lthr * 0.94).round() + 1,
        max: lthr),
    HeartRateZone(
        label: 'Z5 VO2max',
        min: lthr + 1,
        max: (lthr * 1.05).round()),
    HeartRateZone(
        label: 'Z6 Anaerobic',
        min: (lthr * 1.05).round() + 1,
        max: (lthr * 1.10).round()),
    HeartRateZone(
        label: 'Z7 Neuromuscular',
        min: (lthr * 1.10).round() + 1,
        max: 999),
  ];
}

class HeartRateZone {
  const HeartRateZone({
    required this.label,
    required this.min,
    required this.max,
  });

  final String label;
  final int min;
  final int max;
}
