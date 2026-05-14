import 'dart:math';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/race_models.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/athlete_defaults_provider.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/triathlon_estimator.dart';
import 'package:runflow_flutter/core/utils/goal_projection.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

part 'race_providers.g.dart';

@riverpod
List<RaceCountdownData> raceCountdown(Ref ref) {
  final dashboardAsync = ref.watch(dashboardProvider);

  return dashboardAsync.when(
    loading: () => [],
    error: (_, _) => [],
    data: (data) {
      final activeGoals = data.goals.where((g) => g.isActive).toList();
      if (activeGoals.isEmpty) return [];

      return activeGoals.map((goal) {
        final now = DateTime.now();
        final daysToRace = goal.raceDate.difference(now).inDays;
        final weeksToRace = (daysToRace / 7).floor();
        final totalWeeks = goal.planWeeks;
        final weeksCompleted = (totalWeeks - weeksToRace).clamp(0, totalWeeks);
        final progressPercent = totalWeeks > 0
            ? (weeksCompleted / totalWeeks * 100).clamp(0.0, 100.0)
            : 0.0;

        final completedWorkouts =
            goal.workouts.where((w) => w.isCompleted).length;
        final totalWorkouts = goal.workouts.length;

        final stats = data.stats;
        final vo2max = stats.effectiveVO2max;

        int? projectedTimeSeconds;
        double? projectedVdot;
        if (vo2max > 0 && daysToRace > 0) {
          if (goal.raceType.isTriathlon) {
            final defaults = ref.watch(athleteDefaultsProvider);
            final key = triRaceTypeKey(goal.raceType);
            final fitnessGain =
                0.3 * log(1 + weeksToRace) / log(2);
            projectedVdot = min(vo2max + fitnessGain, vo2max + 5.0);
            final projection = estimateTriathlonTime(
              projectedVdot,
              key,
              (double v, int d) => estimateTimeForDistance(v, d),
              cssOverride: defaults.estimatedCssSecPer100m,
              bikeSpeedOverrideMs: defaults.estimatedFlatBikeSpeedMs,
            );
            projectedTimeSeconds = projection?.projected.totalSeconds;
          } else {
            final distance = raceTypeDistance(goal.raceType);
            final basePrediction = racePrediction(vo2max, distance);
            if (basePrediction > 0) {
              final fitnessGain =
                  0.3 * log(1 + weeksToRace) / log(2);
              projectedVdot = min(vo2max + fitnessGain, vo2max + 5.0);
              projectedTimeSeconds =
                  (racePrediction(projectedVdot, distance) * 60).round();
            }
          }
        }

        final plannedWorkouts = goal.workouts.where((w) {
          final weekStart = DateTime(now.year, now.month, now.day)
              .subtract(Duration(days: now.weekday - 1));
          final weekEnd = weekStart.add(const Duration(days: 7));
          return !w.scheduledDate.isBefore(weekStart) &&
              w.scheduledDate.isBefore(weekEnd);
        });

        double plannedWeekMileage = 0;
        for (final w in plannedWorkouts) {
          plannedWeekMileage += w.targetDistance;
        }

        return RaceCountdownData(
          goalId: goal.id,
          goalName: goal.name,
          raceType: raceTypeLabel(goal.raceType),
          raceDate: goal.raceDate,
          daysToRace: daysToRace,
          weeksToRace: weeksToRace,
          planWeeks: totalWeeks,
          weeksCompleted: weeksCompleted,
          progressPercent: progressPercent,
          targetTimeSeconds: goal.targetTime,
          projectedTimeSeconds: projectedTimeSeconds,
          projectedVdot: projectedVdot,
          currentWeekMileage: stats.currentWeekMileage,
          plannedWeekMileage: plannedWeekMileage,
          isRaceDay: daysToRace == 0,
          isPostRace: daysToRace < 0,
          isOverdue: daysToRace < -14,
          hasRaceResult: false,
          totalWorkouts: totalWorkouts,
          completedWorkouts: completedWorkouts,
        );
      }).toList();
    },
  );
}

@riverpod
Future<TrainingStatusData> trainingStatus(Ref ref) async {
  final dashboardAsync = ref.watch(dashboardProvider);

  return dashboardAsync.when(
    loading: () => const TrainingStatusData(
      shapePercent: 0,
      effectiveVO2max: 0,
      correctionFactor: 1.0,
      ctl: 0,
      atl: 0,
      tsb: 0,
      workloadRatio: 0,
      easyTrimp: 0,
      maxCtl: 0,
      maxAtl: 0,
      ctlPercent: 0,
      atlPercent: 0,
    ),
    error: (_, _) => const TrainingStatusData(
      shapePercent: 0,
      effectiveVO2max: 0,
      correctionFactor: 1.0,
      ctl: 0,
      atl: 0,
      tsb: 0,
      workloadRatio: 0,
      easyTrimp: 0,
      maxCtl: 0,
      maxAtl: 0,
      ctlPercent: 0,
      atlPercent: 0,
    ),
    data: (data) {
      final stats = data.stats;
      final shapePercent = stats.marathonShape;
      final effectiveVO2max = stats.effectiveVO2max;
      final correctionFactor = stats.vdotCorrectionFactor;

      final maxCtl = stats.ctl > 0 ? stats.ctl * 1.2 : 100.0;
      final maxAtl = stats.atl > 0 ? stats.atl * 1.2 : 100.0;

      return TrainingStatusData(
        shapePercent: shapePercent,
        effectiveVO2max: effectiveVO2max,
        correctionFactor: correctionFactor,
        ctl: stats.ctl,
        atl: stats.atl,
        tsb: stats.tsb,
        workloadRatio: stats.workloadRatio,
        easyTrimp: stats.easyTrimp,
        maxCtl: maxCtl,
        maxAtl: maxAtl,
        ctlPercent: maxCtl > 0 ? (stats.ctl / maxCtl * 100).clamp(0, 100) : 0,
        atlPercent: maxAtl > 0 ? (stats.atl / maxAtl * 100).clamp(0, 100) : 0,
      );
    },
  );
}

@riverpod
Future<RaceSuggestionResponse> raceSuggestions(Ref ref, String goalId) async {
  final client = ref.read(dioClientProvider);
  final response = await client.dio.get('/api/goals/$goalId/suggest-race');
  return RaceSuggestionResponse.fromJson(
    Map<String, dynamic>.from(response.data as Map),
  );
}

@riverpod
Future<TrainingCompletionSummary> trainingCompletion(
  Ref ref,
  String goalId,
) async {
  final dashboardAsync = ref.read(dashboardProvider);

  return dashboardAsync.when(
    loading: () => const TrainingCompletionSummary(
      totalWorkouts: 0,
      completedWorkouts: 0,
      completionRate: 0,
    ),
    error: (_, _) => const TrainingCompletionSummary(
      totalWorkouts: 0,
      completedWorkouts: 0,
      completionRate: 0,
    ),
    data: (data) {
      final goal = data.goals.where((g) => g.id == goalId).firstOrNull;
      if (goal == null) {
        return const TrainingCompletionSummary(
          totalWorkouts: 0,
          completedWorkouts: 0,
          completionRate: 0,
        );
      }

      final total = goal.workouts.length;
      final completed = goal.workouts.where((w) => w.isCompleted).length;
      final rate = total > 0 ? ((completed / total) * 100).round() : 0;

      return TrainingCompletionSummary(
        totalWorkouts: total,
        completedWorkouts: completed,
        completionRate: rate,
      );
    },
  );
}

@riverpod
class RaceResultFlow extends _$RaceResultFlow {
  @override
  RaceResultFlowState build(String goalId) {
    return const RaceResultFlowState(
      mode: RaceResultMode.suggest,
      isLoading: true,
    );
  }

  Future<void> initialize() async {
    try {
      final suggestions = await ref.read(
        raceSuggestionsProvider(goalId).future,
      );
      if (suggestions.suggestions.isNotEmpty) {
        state = state.copyWith(
          isLoading: false,
          suggestedActivity: suggestions.suggestions.first,
          mode: RaceResultMode.suggest,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          mode: RaceResultMode.suggest,
        );
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }
  }

  void setMode(RaceResultMode mode) {
    state = state.copyWith(mode: mode);
  }

  void selectActivity(String activityId, {int? movingTime}) {
    state = state.copyWith(
      selectedActivityId: activityId,
      actualTimeSeconds: movingTime,
    );
  }

  void setActualTime(int? seconds) {
    state = state.copyWith(actualTimeSeconds: seconds);
  }

  void setChipTime(int? seconds) {
    state = state.copyWith(chipTimeSeconds: seconds);
  }

  void setPlacementOverall(int? value) {
    state = state.copyWith(placementOverall: value);
  }

  void setPlacementGender(int? value) {
    state = state.copyWith(placementGender: value);
  }

  void setPlacementAgeGroup(int? value) {
    state = state.copyWith(placementAgeGroup: value);
  }

  void setAgeGroup(String? value) {
    state = state.copyWith(ageGroup: value);
  }

  void setTotalFinishers(int? value) {
    state = state.copyWith(totalFinishers: value);
  }

  void setWeatherConditions(String? value) {
    state = state.copyWith(weatherConditions: value);
  }

  void setFeltLike(int? value) {
    state = state.copyWith(feltLike: value);
  }

  void setNotes(String? value) {
    state = state.copyWith(notes: value);
  }

  Future<bool> completeRace() async {
    state = state.copyWith(isSaving: true);

    try {
      final client = ref.read(dioClientProvider);
      await client.dio.patch(
        '/api/goals/$goalId/complete',
        data: CompleteRaceRequest(
          raceActivityId: state.selectedActivityId,
          actualTime: state.actualTimeSeconds,
          chipTime: state.chipTimeSeconds,
          placementOverall: state.placementOverall,
          placementGender: state.placementGender,
          placementAgeGroup: state.placementAgeGroup,
          ageGroup: state.ageGroup,
          totalFinishers: state.totalFinishers,
          weatherConditions: state.weatherConditions,
          feltLike: state.feltLike,
          notes: state.notes,
        ).toJson(),
      );

      ref.invalidate(dashboardProvider);
      state = state.copyWith(isSaving: false);
      return true;
    } catch (_) {
      state = state.copyWith(isSaving: false);
      return false;
    }
  }
}
