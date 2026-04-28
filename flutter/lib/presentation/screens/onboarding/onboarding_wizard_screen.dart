import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

import 'package:runflow_flutter/presentation/widgets/sync_platform_selector.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';

import 'steps/experience_level_step.dart';
import 'steps/race_goal_step.dart';
import 'steps/current_fitness_step.dart';
import 'steps/goal_time_step.dart';
import 'steps/training_volume_step.dart';
import 'steps/training_schedule_step.dart';
import 'steps/heart_rate_step.dart';
import 'steps/review_step.dart';

class OnboardingWizardScreen extends ConsumerStatefulWidget {
  const OnboardingWizardScreen({super.key});

  static Future<bool> isCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(AppConstants.onboardingCompletedKey) ?? false;
  }

  static Future<void> markCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.onboardingCompletedKey, true);
  }

  @override
  ConsumerState<OnboardingWizardScreen> createState() =>
      _OnboardingWizardScreenState();
}

class _OnboardingWizardScreenState
    extends ConsumerState<OnboardingWizardScreen> {
  @override
  Widget build(BuildContext context) {
    final onboarding = ref.watch(onboardingProvider);
    final step = onboarding.currentStep;

    final double progress;
    if (step == OnboardingStep.planSetup) {
      final subIndex = onboarding.currentPlanSubStep.index;
      final totalSubSteps = PlanSubStep.values.length;
      final baseProgress = OnboardingStep.values.length - 1;
      progress = (baseProgress + (subIndex + 1) / totalSubSteps) /
          OnboardingStep.values.length;
    } else {
      progress = (step.index + 1) / OnboardingStep.values.length;
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _handleBack();
      },
      child: Scaffold(
      backgroundColor: AppColors.oledBlack,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  if (step.index > 0 || onboarding.currentPlanSubStep.index > 0)
                    TextButton(
                      onPressed: _handleBack,
                      child: const Text('Back'),
                    )
                  else
                    TextButton(
                      onPressed: _completeOnboarding,
                      child: const Text('Skip'),
                    ),
                  const Spacer(),
                  if (step == OnboardingStep.planSetup)
                    Text(
                      '${onboarding.currentPlanSubStep.index + 1} / ${PlanSubStep.values.length}',
                      style: const TextStyle(color: AppColors.onSurfaceVariant),
                    )
                  else
                    Text(
                      '${step.index + 1} / ${OnboardingStep.values.length}',
                      style: const TextStyle(color: AppColors.onSurfaceVariant),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppColors.primary,
                  ),
                  minHeight: 4,
                ),
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _buildStep(step),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  void _handleBack() {
    final onboarding = ref.read(onboardingProvider);
    if (onboarding.currentStep == OnboardingStep.planSetup &&
        onboarding.currentPlanSubStep.index > 0) {
      ref.read(onboardingProvider.notifier).previousPlanSubStep();
    } else if (onboarding.currentStep.index > 0) {
      ref.read(onboardingProvider.notifier).previousStep();
    }
  }

  Widget _buildStep(OnboardingStep step) {
    switch (step) {
      case OnboardingStep.platformSelect:
        return const _PlatformSelectStep(
          key: ValueKey('platform'),
        );
      case OnboardingStep.syncData:
        return const _SyncDataStep(
          key: ValueKey('sync'),
        );
      case OnboardingStep.analyzeProfile:
        return const _AnalyzeProfileStep(
          key: ValueKey('analyze'),
        );
      case OnboardingStep.planSetup:
        return _PlanSetupStepRouter(
          key: ValueKey('plan-${ref.watch(onboardingProvider).currentPlanSubStep.index}'),
        );
    }
  }

  Future<void> _completeOnboarding() async {
    await OnboardingWizardScreen.markCompleted();
    if (mounted) {
      context.go('/login');
    }
  }
}

class _PlatformSelectStep extends ConsumerWidget {
  const _PlatformSelectStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          const SizedBox(height: 24),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF9C27B0).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.link,
              color: Color(0xFF9C27B0),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          SyncPlatformSelector(
            connectedPlatforms:
                ref.watch(onboardingProvider).connectedPlatforms,
            onSkip: () =>
                ref.read(onboardingProvider.notifier).nextStep(),
            onPlatformConnected: (platformId) {
              ref
                  .read(onboardingProvider.notifier)
                  .markPlatformConnected(platformId);
            },
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SyncDataStep extends ConsumerStatefulWidget {
  const _SyncDataStep({super.key});

  @override
  ConsumerState<_SyncDataStep> createState() => _SyncDataStepState();
}

class _SyncDataStepState extends ConsumerState<_SyncDataStep> {
  @override
  Widget build(BuildContext context) {
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
              color: const Color(0xFF2196F3).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.sync,
              color: Color(0xFF2196F3),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Import your history',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'RunFlow needs your activity history to start your adaptive training plan.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Activities found',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        '${onboarding.syncedActivityCount}',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  if (onboarding.isSyncing) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Syncing active... this might take a minute.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF2196F3),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (!onboarding.hasSynced) ...[
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: onboarding.importRange,
              decoration: const InputDecoration(
                labelText: 'Import Range',
              ),
              items: const [
                DropdownMenuItem(value: '1_MONTH', child: Text('Last Month')),
                DropdownMenuItem(
                    value: '3_MONTHS', child: Text('Last 3 Months')),
                DropdownMenuItem(
                    value: '6_MONTHS', child: Text('Last 6 Months')),
                DropdownMenuItem(value: '1_YEAR', child: Text('Last Year')),
                DropdownMenuItem(value: 'ALL', child: Text('All History')),
              ],
              onChanged: (value) {
                if (value != null) {
                  ref
                      .read(onboardingProvider.notifier)
                      .setImportRange(value);
                }
              },
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: onboarding.isSyncing ? null : _triggerSync,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2196F3),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Start Import',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: () =>
                  ref.read(onboardingProvider.notifier).nextStep(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                onboarding.hasSynced ? 'Analyze Data' : 'Continue without data',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _triggerSync() async {
    ref.read(onboardingProvider.notifier).setSyncing(true);
    try {
      final service = ref.read(healthConnectServiceProvider);
      await service.readActivities();
      ref.read(onboardingProvider.notifier).setSyncing(false);
      await ref.read(onboardingProvider.notifier).markSynced();
    } catch (_) {
      ref.read(onboardingProvider.notifier).setSyncing(false);
    }
  }
}

class _AnalyzeProfileStep extends ConsumerWidget {
  const _AnalyzeProfileStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final statsAsync = ref.watch(analyticsStatsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          const SizedBox(height: 24),
          Text(
            'Your Running Profile',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Based on your synced activity data',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          statsAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(48),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (_, _) => Card(
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
                      'No activity data yet',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'We\'ll use default values to get you started.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            data: (stats) => _ProfileStatsCard(stats: stats),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: () =>
                  ref.read(onboardingProvider.notifier).nextStep(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Build My Plan',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _ProfileStatsCard extends StatelessWidget {
  const _ProfileStatsCard({required this.stats});

  final AnalyticsStats stats;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    label: 'VDOT',
                    value: stats.currentVdot?.toStringAsFixed(1) ?? '--',
                    icon: Icons.speed,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatItem(
                    label: 'CTL',
                    value: stats.ctl.toStringAsFixed(1),
                    subtitle: 'Fitness',
                    icon: Icons.trending_up,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    label: 'ATL',
                    value: stats.atl.toStringAsFixed(1),
                    subtitle: 'Fatigue',
                    icon: Icons.trending_down,
                    color: const Color(0xFFFF9800),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatItem(
                    label: 'TSB',
                    value: stats.tsb.toStringAsFixed(1),
                    subtitle: 'Form',
                    icon: Icons.battery_charging_full,
                    color: const Color(0xFF00BCD4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    label: 'Marathon Shape',
                    value: '${(stats.marathonShape * 100).toStringAsFixed(0)}%',
                    icon: Icons.emoji_events,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatItem(
                    label: 'Weekly Mileage',
                    value:
                        '${stats.currentWeekMileage.toStringAsFixed(1)} km',
                    icon: Icons.straighten,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (subtitle != null)
            Text(
              subtitle!,
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }
}

class _PlanSetupStepRouter extends ConsumerWidget {
  const _PlanSetupStepRouter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingProvider);
    final subStep = onboarding.currentPlanSubStep;

    final child = _buildSubStep(subStep);

    return Column(
      children: [
        Expanded(child: child),
        _PlanStepNavButtons(subStep: subStep),
      ],
    );
  }

  Widget _buildSubStep(PlanSubStep subStep) {
    switch (subStep) {
      case PlanSubStep.experienceLevel:
        return const ExperienceLevelStep();
      case PlanSubStep.raceGoal:
        return const RaceGoalStep();
      case PlanSubStep.currentFitness:
        return const CurrentFitnessStep();
      case PlanSubStep.goalTime:
        return const GoalTimeStep();
      case PlanSubStep.trainingVolume:
        return const TrainingVolumeStep();
      case PlanSubStep.trainingSchedule:
        return const TrainingScheduleStep();
      case PlanSubStep.heartRateProfile:
        return const HeartRateProfileStep();
      case PlanSubStep.review:
        return const ReviewStep();
    }
  }
}

class _PlanStepNavButtons extends ConsumerWidget {
  const _PlanStepNavButtons({required this.subStep});

  final PlanSubStep subStep;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onboarding = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final isLast = subStep == PlanSubStep.review;
    final isFirst = subStep == PlanSubStep.experienceLevel;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!isLast)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: onboarding.isPlanSubmitting
                    ? null
                    : () => notifier.nextPlanSubStep(),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _nextLabel(subStep),
                      style: const TextStyle(
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 18),
                  ],
                ),
              ),
            ),
          if (!isFirst) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 40,
              child: TextButton(
                onPressed: () => notifier.previousPlanSubStep(),
                child: const Text('Back'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _nextLabel(PlanSubStep step) {
    switch (step) {
      case PlanSubStep.experienceLevel:
        return 'Next';
      case PlanSubStep.raceGoal:
        return 'Next';
      case PlanSubStep.currentFitness:
        return 'Next';
      case PlanSubStep.goalTime:
        return 'Next';
      case PlanSubStep.trainingVolume:
        return 'Next';
      case PlanSubStep.trainingSchedule:
        return 'Next';
      case PlanSubStep.heartRateProfile:
        return 'Review Plan';
      case PlanSubStep.review:
        return 'Generate';
    }
  }
}
