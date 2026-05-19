import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';
import 'package:runflow_flutter/presentation/screens/onboarding/onboarding_wizard_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ReviewStep extends ConsumerWidget {
  const ReviewStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.checklist,
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            S.of(context).onboardingReviewPlanTitle,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).onboardingReviewPlanSubtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ReviewRow(
                    label: S.of(context).onboardingRaceName,
                    value: onboarding.goalName,
                  ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingRaceType,
                    value: raceTypeLabel(onboarding.raceType),
                  ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingRaceDate,
                    value: _formatDate(onboarding.raceDate),
                  ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingPlanDuration,
                    value: S.of(context).onboardingWeeksCount(onboarding.computedPlanWeeks),
                  ),
                  const Divider(height: 20),
                    _ReviewRow(
                      label: S.of(context).onboardingExperience,
                      value: _experienceLabel(context, onboarding.experienceLevel),
                    ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingRunsPerWeek,
                    value: S.of(context).onboardingRunsPerWeekCount(onboarding.runsPerWeek),
                  ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingWeeklyMileage,
                    value:
                        '${onboarding.weeklyMileage.toStringAsFixed(0)} ${S.of(context).kmUnit}',
                  ),
                  const Divider(height: 20),
                  _ReviewRow(
                    label: S.of(context).onboardingPhases,
                    value:
                        '${onboarding.buildWeeks}B / ${onboarding.peakWeeks}P / ${onboarding.taperWeeks}T',
                  ),
                  if (onboarding.goalTimeSeconds != null &&
                      onboarding.goalTimeSeconds! > 0) ...[
                    const Divider(height: 20),
                    _ReviewRow(
                      label: S.of(context).onboardingGoalTime,
                      value: formatDuration(onboarding.goalTimeSeconds!),
                    ),
                  ],
                  if (onboarding.maxHeartRate > 0) ...[
                    const Divider(height: 20),
                    _ReviewRow(
                      label: S.of(context).onboardingMaxHr,
                      value: '${onboarding.maxHeartRate} ${S.of(context).bpmUnit}',
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (onboarding.planError.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      onboarding.planError,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              onPressed: onboarding.isPlanSubmitting
                  ? null
                  : () => _submitPlan(context, ref),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: onboarding.isPlanSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : Text(
                      S.of(context).onboardingGenerateTrainingPlan,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _submitPlan(BuildContext context, WidgetRef ref) async {
    final s = S.of(context);
    final notifier = ref.read(onboardingProvider.notifier);
    notifier
      ..setPlanSubmitting(true)
      ..setPlanError('');

    try {
      final onboarding = ref.read(onboardingProvider);

      await ref.read(goalsProvider.notifier).createGoal(
        CreateGoalRequest(
          name: onboarding.goalName,
          raceType: onboarding.raceType,
          raceDate: onboarding.raceDate,
          planStartDate: onboarding.planStartDate,
          targetTime: onboarding.goalTimeSeconds,
          weeklyMileageGoal: onboarding.weeklyMileage * 1000,
          startWeeklyMileage: onboarding.startWeeklyMileage != null
              ? (onboarding.startWeeklyMileage! * 1000).roundToDouble()
              : null,
          planWeeks: onboarding.computedPlanWeeks,
          runsPerWeek: onboarding.runsPerWeek,
          taperWeeks: onboarding.taperWeeks,
          peakWeeks: onboarding.peakWeeks,
          buildWeeks: onboarding.buildWeeks,
          maxLongRunKm: onboarding.maxLongRunKm,
          longRunDay: onboarding.longRunDay,
          workoutDay: onboarding.qualityDay,
          calibrationTime: onboarding.calibrationTimeSeconds > 0
              ? onboarding.calibrationTimeSeconds
              : null,
          calibrationDistance: onboarding.calibrationDistance,
          calibrationFactor: onboarding.calibrationFactor != 1.0
              ? onboarding.calibrationFactor
              : null,
        ),
      );

      await OnboardingWizardScreen.markCompleted();

      if (!context.mounted) return;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('onboarding_step');
      if (!context.mounted) return;
      context.go('/dashboard');
    } catch (e) {
      notifier
        ..setPlanError(s.onboardingPlanCreateFailed)
        ..setPlanSubmitting(false);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _experienceLabel(BuildContext context, String level) {
    switch (level) {
      case 'BEGINNER':
        return S.of(context).onboardingExperienceBeginner;
      case 'INTERMEDIATE':
        return S.of(context).onboardingExperienceIntermediate;
      case 'ADVANCED':
        return S.of(context).onboardingExperienceAdvanced;
      default:
        return level;
    }
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        Flexible(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
