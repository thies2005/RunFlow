import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class GoalTimeStep extends ConsumerStatefulWidget {
  const GoalTimeStep({super.key});

  @override
  ConsumerState<GoalTimeStep> createState() => _GoalTimeStepState();
}

class _GoalTimeStepState extends ConsumerState<GoalTimeStep> {
  double _sliderValue = 0.5;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final statsAsync = ref.watch(analyticsStatsProvider);

    final effectiveVO2max = statsAsync.value?.effectiveVO2max ?? 0;
    final shapePercent = (statsAsync.value?.marathonShape ?? 0) * 100;

    final String raceDistanceKey = raceTypeToDistanceKey(
      onboarding.raceType.name,
    );

    ProjectedGoalResult? projection;
    if (effectiveVO2max > 0) {
      final calibratedVO2max = effectiveVO2max * onboarding.calibrationFactor;
      projection = calculateProjectedGoalTime(
        calibratedVO2max,
        raceDistanceKey,
        onboarding.computedPlanWeeks,
        onboarding.runsPerWeek,
        onboarding.weeklyMileage,
        onboarding.taperWeeks,
        onboarding.peakWeeks,
        onboarding.buildWeeks,
        shapePercent,
      );
    }

    final int projectedTime = projection?.projectedTime ?? 0;
    final int conservativeTime = projection?.conservativeTime ?? 0;
    final int optimalTime = projection?.optimalTime ?? 0;

    final int selectedGoalTime = onboarding.goalTimeSeconds ??
        _interpolateGoalTime(
          conservativeTime,
          optimalTime,
          _sliderValue,
        );

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFFF9800).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.timer,
              color: Color(0xFFFF9800),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            S.of(context).onboardingGoalTimeTitle,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).onboardingGoalTimeSubtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          if (projection != null && projectedTime > 0) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      S.of(context).onboardingProjectedGoalTime,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      formatDuration(selectedGoalTime),
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      S.of(context).onboardingVdotImprovement(projection.improvementPercent.toStringAsFixed(1)),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                S.of(context).onboardingConservative,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: AppColors.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                formatDuration(conservativeTime),
                                style:
                                    theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                S.of(context).onboardingOptimal,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: AppColors.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                formatDuration(optimalTime),
                                style:
                                    theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Slider(
                      value: _sliderValue,
                      onChanged: (value) {
                        setState(() => _sliderValue = value);
                        final time = _interpolateGoalTime(
                          conservativeTime,
                          optimalTime,
                          value,
                        );
                        notifier.setGoalTimeSeconds(time);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 48,
                      color: AppColors.onSurfaceVariant,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      S.of(context).onboardingNoPrediction,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      S.of(context).onboardingNoPredictionSubtitle,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  int _interpolateGoalTime(
      int conservative, int optimal, double sliderValue) {
    if (conservative <= 0 || optimal <= 0) return conservative;
    final time = conservative + (optimal - conservative) * sliderValue;
    return time.round();
  }
}
