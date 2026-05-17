import 'dart:math';

import 'package:runflow_flutter/core/utils/vdot.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

const _maxImprovementFactor = 1.15;
const _durationImprovementRate = 0.008;
const _frequencyImprovementRate = 0.02;
const _volumeImprovementRate = 0.015;

const _shapeImpact = <RaceType, double>{
  RaceType.fiveK: 0.05,
  RaceType.tenK: 0.08,
  RaceType.halfMarathon: 0.15,
  RaceType.marathon: 0.30,
};

const _shapeImprovementPer10Km = 2.0;
const _shapeImprovementPer4Weeks = 1.0;

double _raceDistanceMeters(RaceType type) {
  switch (type) {
    case RaceType.fiveK:
      return 5000;
    case RaceType.tenK:
      return 10000;
    case RaceType.halfMarathon:
      return 21097.5;
    case RaceType.marathon:
      return 42195;
    case RaceType.fiftyK:
      return 50000;
    case RaceType.fiftyMile:
      return 80467;
    case RaceType.hundredK:
      return 100000;
    case RaceType.hundredMile:
      return 160934;
    case RaceType.twelveHour:
    case RaceType.twentyFourHour:
    case RaceType.backyardUltra:
    case RaceType.customDistance:
    case RaceType.sprintTri:
    case RaceType.olympicTri:
    case RaceType.halfIronman:
    case RaceType.fullIronman:
    case RaceType.customTri:
      return 0;
  }
}

class PlanSettings {
  const PlanSettings({
    required this.durationWeeks,
    required this.runsPerWeek,
    required this.weeklyMileageGoal,
    required this.raceDistance,
  });

  final int durationWeeks;
  final int runsPerWeek;
  final double weeklyMileageGoal;
  final RaceType raceDistance;
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
  final int projectedShape;
  final double shapeImprovementPercent;
}

/// Calculates the expected VDOT improvement ratio based on training parameters.
///
/// Returns a coefficient in the range [1.0, 1.15] representing how much a
/// runner's VDOT is expected to improve over the training plan. A value of
/// 1.0 means no improvement; 1.15 means up to 15% improvement.
///
/// The model uses a linear approximation of the training adaptation curves
/// described in Daniels (2014), *Daniels' Running Formula*, combining three
/// independent contributions:
///
/// - **Duration** ([durationWeeks]): longer plans allow more adaptation.
/// - **Frequency** ([runsPerWeek]): more sessions per week accelerate gains.
/// - **Volume** ([weeklyVolumeKm]): higher weekly mileage builds aerobic base.
///
/// An assertion + clamp guardrail at 1.20 catches unexpected inputs while
/// still returning a safe value in release builds.
///
/// **Parameters:**
/// - [durationWeeks] – plan length in weeks (int, >= 0).
/// - [runsPerWeek]   – scheduled runs per week (int, >= 0).
/// - [weeklyVolumeKm] – target weekly mileage in kilometres (double, >= 0).
///
/// **Output range:** 1.0 (no improvement) … 1.15 (maximum 15% improvement).
///
/// **Scientific basis:** linear approximation of Daniels (2014) training
/// adaptation curves, with empirically-tuned per-contribution rates.
double calculateProgressionCoefficient(
  int durationWeeks,
  int runsPerWeek,
  double weeklyVolumeKm,
) {
  if (durationWeeks <= 0) return 1.0;
  if (runsPerWeek <= 0) return 1.0;

  final durationContribution =
      (durationWeeks / 4) * _durationImprovementRate;
  final frequencyContribution =
      (runsPerWeek / 4) * _frequencyImprovementRate;
  final volumeContribution =
      (weeklyVolumeKm / 50) * _volumeImprovementRate;

  final progressionFactor =
      1 + durationContribution + frequencyContribution + volumeContribution;

  final result = min(progressionFactor, _maxImprovementFactor);

  assert(result >= 1.0 && result <= 1.20,
      'Progression coefficient $result out of expected range [1.0, 1.20]');
  return result.clamp(1.0, 1.20);
}

double calculateShapePenalty(
    RaceType raceDistance, double currentShapePercent) {
  final shapeImpact = _shapeImpact[raceDistance] ?? 0.30;
  return (1 - min(currentShapePercent, 100) / 100) * shapeImpact;
}

ProjectedGoalResult calculateProjectedGoalTime(
  double currentVO2max,
  PlanSettings planSettings, {
  double currentShapePercent = 70,
  double? currentWeeklyKm,
}) {
  if (_raceDistanceMeters(planSettings.raceDistance) == 0) {
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

  if (currentVO2max <= 0 || planSettings.durationWeeks <= 0) {
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

  final progressionFactor = calculateProgressionCoefficient(
    planSettings.durationWeeks,
    planSettings.runsPerWeek,
    planSettings.weeklyMileageGoal,
  );

  final projectedVdot = currentVO2max * progressionFactor;
  final improvementPercent = (progressionFactor - 1) * 100;

  final effectiveCurrentKm =
      currentWeeklyKm ?? (planSettings.weeklyMileageGoal * 0.5);
  final mileageIncrease =
      max(0.0, planSettings.weeklyMileageGoal - effectiveCurrentKm);

  final shapeFromMileage =
      (mileageIncrease / 10) * _shapeImprovementPer10Km;
  final shapeFromDuration =
      (planSettings.durationWeeks / 4) * _shapeImprovementPer4Weeks;

  final totalShapeImprovement = shapeFromMileage + shapeFromDuration;
  final projectedShape =
      min(100.0, currentShapePercent + totalShapeImprovement);
  final shapeImprovementPercent = projectedShape - currentShapePercent;

  final distanceMeters = _raceDistanceMeters(planSettings.raceDistance);

  final optimalTimeMinutes = estimateTime(projectedVdot, distanceMeters);
  final optimalTimeSeconds = (optimalTimeMinutes * 60).round();

  if (optimalTimeSeconds <= 0) {
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

  final projectedPenalty =
      calculateShapePenalty(planSettings.raceDistance, projectedShape);
  final projectedTime =
      (optimalTimeSeconds * (1 + projectedPenalty)).round();

  final conservativeVdot =
      currentVO2max * (1 + (progressionFactor - 1) * 0.5);
  final conservativeBaseMinutes =
      estimateTime(conservativeVdot, distanceMeters);
  final conservativeBaseSeconds = (conservativeBaseMinutes * 60).round();
  final conservativePenalty = calculateShapePenalty(
      planSettings.raceDistance, currentShapePercent);
  final conservativeTime =
      (conservativeBaseSeconds * (1 + conservativePenalty)).round();

  return ProjectedGoalResult(
    optimalTime: optimalTimeSeconds,
    projectedTime: projectedTime,
    conservativeTime: conservativeTime,
    projectedVdot: (projectedVdot * 10).round() / 10.0,
    improvementPercent: (improvementPercent * 10).round() / 10.0,
    projectedShape: projectedShape.round(),
    shapeImprovementPercent:
        (shapeImprovementPercent * 10).round() / 10.0,
  );
}

int estimateTimeForDistance(double vdot, int distanceMeters) {
  final timeMinutes = estimateTime(vdot, distanceMeters.toDouble());
  return (timeMinutes * 60).round();
}

ProjectedGoalResult calculateProjectedGoalTimeForDistance(
  double currentVO2max,
  int durationWeeks,
  int runsPerWeek,
  double? weeklyMileageGoalKm,
  int distanceMeters, {
  double currentShapePercent = 70,
}) {
  if (currentVO2max <= 0 || durationWeeks <= 0 || distanceMeters <= 0) {
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

  final progressionFactor = calculateProgressionCoefficient(
    durationWeeks,
    runsPerWeek,
    weeklyMileageGoalKm ?? 0,
  );

  final projectedVdot = currentVO2max * progressionFactor;
  final improvementPercent = (progressionFactor - 1) * 100;

  const shapeImpactBase = 0.30;
  final projectedPenalty =
      (1 - (currentShapePercent + 5).clamp(0, 100) / 100) * shapeImpactBase;

  final optimalTime = estimateTimeForDistance(projectedVdot, distanceMeters);
  final projectedTime = (optimalTime * (1 + projectedPenalty)).round();

  final conservativeVdot =
      currentVO2max * (1 + (progressionFactor - 1) * 0.5);
  final conservativeBase =
      estimateTimeForDistance(conservativeVdot, distanceMeters);
  final conservativePenalty =
      (1 - currentShapePercent.clamp(0, 100) / 100) * shapeImpactBase;
  final conservativeTime =
      (conservativeBase * (1 + conservativePenalty)).round();

  return ProjectedGoalResult(
    optimalTime: optimalTime.round(),
    projectedTime: projectedTime,
    conservativeTime: conservativeTime,
    projectedVdot: (projectedVdot * 10).round() / 10.0,
    improvementPercent: (improvementPercent * 10).round() / 10.0,
    projectedShape: 0,
    shapeImprovementPercent: 0,
  );
}
