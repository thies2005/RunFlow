import 'dart:math';

import '../../entities/readiness/readiness_entities.dart';

class ReadinessScoringService {
  const ReadinessScoringService();

  ReadinessResult score(ReadinessInputs inputs, {ReadinessScoringConfig? config}) {
    final cfg = config ?? const ReadinessScoringConfig();

    final hrrScore = _scoreHrr(inputs.rhr);
    final sleepScore = _scoreSleep(inputs.sleep);
    final loadScore = _scoreLoad(inputs.load);
    final subjectiveScore = _scoreSubjective(inputs.subjective);

    final components = [hrrScore, sleepScore, loadScore, subjectiveScore];
    final availableComponents = components.where((c) => c.isAvailable).toList();

    if (availableComponents.length < 2) {
      return ReadinessResult(
        compositeScore: 0,
        state: ReadinessState.unavailable,
        confidence: DataConfidence.unavailable,
        componentScores: components,
        reasons: ['Insufficient data for readiness assessment'],
        adaptationType: AdaptationType.none,
      );
    }

    final confidence = _determineConfidence(availableComponents.length);
    final compositeScore = _computeComposite(availableComponents, cfg);
    final state = _determineState(compositeScore, cfg);
    final adaptationType = _determineAdaptation(state, loadScore);
    final reasons = _buildReasons(availableComponents, state);

    return ReadinessResult(
      compositeScore: compositeScore,
      state: state,
      confidence: confidence,
      componentScores: components,
      reasons: reasons,
      adaptationType: adaptationType,
    );
  }

  ComponentScore _scoreHrr(RhrMetrics? rhr) {
    if (rhr == null || rhr.todayRhr == null) {
      return const ComponentScore(
        component: ReadinessComponent.hrr,
        score: 0,
        isAvailable: false,
      );
    }

    if (rhr.baselineRhr == null || rhr.rhrDelta == null) {
      return const ComponentScore(
        component: ReadinessComponent.hrr,
        score: 65,
        isAvailable: true,
        reason: 'RHR available but no baseline for comparison',
      );
    }

    final delta = rhr.rhrDelta!;

    double score;
    String reason;

    if (delta < 0) {
      score = 85 + min(delta.abs() * 2, 15);
      reason = 'Resting heart rate improved by ${delta.abs().toStringAsFixed(1)} bpm';
    } else if (delta.abs() < 1) {
      score = 75;
      reason = 'Resting heart rate stable';
    } else {
      score = 75 - min(delta * 3, 40);
      reason = 'Resting heart rate elevated by ${delta.toStringAsFixed(1)} bpm';
    }

    return ComponentScore(
      component: ReadinessComponent.hrr,
      score: score,
      isAvailable: true,
      reason: reason,
    );
  }

  ComponentScore _scoreSleep(SleepMetrics? sleep) {
    if (sleep == null || sleep.totalDurationMinutes == null) {
      return const ComponentScore(
        component: ReadinessComponent.sleep,
        score: 0,
        isAvailable: false,
      );
    }

    final durationHours = sleep.totalDurationMinutes! / 60;

    double baseScore;
    if (durationHours >= 8) {
      baseScore = 85;
    } else if (durationHours >= 7) {
      baseScore = 75;
    } else if (durationHours >= 6) {
      baseScore = 60;
    } else if (durationHours >= 5) {
      baseScore = 45;
    } else {
      baseScore = 30;
    }

    double score = baseScore;

    if (sleep.deepPercent != null) {
      final deep = sleep.deepPercent!;
      if (deep >= 20) {
        score += 5;
      } else if (deep >= 15) {
        score += 2;
      } else if (deep < 10) {
        score -= 5;
      }
    }

    if (sleep.remPercent != null) {
      final rem = sleep.remPercent!;
      if (rem >= 20) {
        score += 3;
      } else if (rem < 10) {
        score -= 3;
      }
    }

    score = score.clamp(0.0, 100.0);

    return ComponentScore(
      component: ReadinessComponent.sleep,
      score: score,
      isAvailable: true,
      reason: 'Sleep: ${(sleep.totalDurationMinutes! / 60).toStringAsFixed(1)}h',
    );
  }

  ComponentScore _scoreLoad(LoadMetrics? load) {
    if (load == null) {
      return const ComponentScore(
        component: ReadinessComponent.load,
        score: 0,
        isAvailable: false,
      );
    }

    if (load.workloadRatio != null) {
      final ratio = load.workloadRatio!;
      double score;
      String reason;

      if (ratio < 0.8) {
        score = 70;
        reason = 'Training load undertrained (ratio: ${ratio.toStringAsFixed(2)})';
      } else if (ratio <= 1.3) {
        score = 90;
        reason = 'Training load optimal (ratio: ${ratio.toStringAsFixed(2)})';
      } else if (ratio <= 1.5) {
        score = 65;
        reason = 'Training load high (ratio: ${ratio.toStringAsFixed(2)})';
      } else if (ratio <= 2.0) {
        score = 45;
        reason = 'Training load very high (ratio: ${ratio.toStringAsFixed(2)})';
      } else {
        score = 25;
        reason = 'Overreaching risk (ratio: ${ratio.toStringAsFixed(2)})';
      }

      return ComponentScore(
        component: ReadinessComponent.load,
        score: score,
        isAvailable: true,
        reason: reason,
      );
    }

    if (load.todayTrimp != null) {
      return const ComponentScore(
        component: ReadinessComponent.load,
        score: 60,
        isAvailable: true,
        reason: 'Limited load data — today TRIMP available but no ratio',
      );
    }

    return const ComponentScore(
      component: ReadinessComponent.load,
      score: 0,
      isAvailable: false,
    );
  }

  ComponentScore _scoreSubjective(SubjectiveInput? subjective) {
    if (subjective == null) {
      return const ComponentScore(
        component: ReadinessComponent.subjective,
        score: 0,
        isAvailable: false,
      );
    }

    final hasExhaustion = subjective.exhaustionLevel != null;
    final hasSoreness = subjective.muscleSoreness != null;
    final hasStress = subjective.stressLevel != null;

    if (!hasExhaustion && !hasSoreness && !hasStress) {
      return const ComponentScore(
        component: ReadinessComponent.subjective,
        score: 0,
        isAvailable: false,
      );
    }

    double score;

    if (hasExhaustion && hasSoreness && hasStress) {
      final avg = ((10 - subjective.exhaustionLevel!) +
              (10 - subjective.muscleSoreness!) +
              (10 - subjective.stressLevel!)) /
          3;
      score = avg * 10;
    } else {
      int count = 0;
      double sum = 0;
      if (hasExhaustion) {
        sum += 10 - subjective.exhaustionLevel!;
        count++;
      }
      if (hasSoreness) {
        sum += 10 - subjective.muscleSoreness!;
        count++;
      }
      if (hasStress) {
        sum += 10 - subjective.stressLevel!;
        count++;
      }
      score = count > 0 ? (sum / count) * 10 : 0;
    }

    return ComponentScore(
      component: ReadinessComponent.subjective,
      score: score,
      isAvailable: true,
      reason: 'Subjective wellness score',
    );
  }

  DataConfidence _determineConfidence(int availableCount) {
    switch (availableCount) {
      case 4:
        return DataConfidence.full;
      case 3:
        return DataConfidence.partial;
      case 2:
        return DataConfidence.estimated;
      default:
        return DataConfidence.unavailable;
    }
  }

  double _computeComposite(List<ComponentScore> available, ReadinessScoringConfig cfg) {
    final weightMap = <ReadinessComponent, double>{
      ReadinessComponent.hrr: cfg.hrrWeight,
      ReadinessComponent.sleep: cfg.sleepWeight,
      ReadinessComponent.load: cfg.loadWeight,
      ReadinessComponent.subjective: cfg.subjectiveWeight,
    };

    double totalWeight = 0;
    for (final c in available) {
      totalWeight += weightMap[c.component]!;
    }

    if (totalWeight == 0) return 0;

    double composite = 0;
    for (final c in available) {
      final normalizedWeight = weightMap[c.component]! / totalWeight;
      composite += c.score * normalizedWeight;
    }

    return composite;
  }

  ReadinessState _determineState(double score, ReadinessScoringConfig cfg) {
    if (score >= cfg.excellentThreshold) return ReadinessState.excellent;
    if (score >= cfg.goodThreshold) return ReadinessState.good;
    if (score >= cfg.moderateThreshold) return ReadinessState.moderate;
    if (score >= cfg.reducedThreshold) return ReadinessState.reduced;
    return ReadinessState.rest;
  }

  AdaptationType _determineAdaptation(ReadinessState state, ComponentScore loadScore) {
    switch (state) {
      case ReadinessState.excellent:
      case ReadinessState.good:
        return AdaptationType.none;
      case ReadinessState.moderate:
        if (loadScore.isAvailable && loadScore.score < 60) {
          return AdaptationType.volumeReduction;
        }
        return AdaptationType.intensityReduction;
      case ReadinessState.reduced:
        return AdaptationType.swapToEasy;
      case ReadinessState.rest:
        return AdaptationType.restOrReschedule;
      case ReadinessState.unavailable:
        return AdaptationType.none;
    }
  }

  List<String> _buildReasons(List<ComponentScore> available, ReadinessState state) {
    final reasons = <String>[];
    for (final c in available) {
      if (c.reason != null) {
        reasons.add(c.reason!);
      }
    }
    return reasons;
  }
}
