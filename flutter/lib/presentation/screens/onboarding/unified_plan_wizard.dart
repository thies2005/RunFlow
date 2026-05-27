import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/goal_projection.dart';
import 'package:runflow_flutter/core/utils/triathlon_estimator.dart';
import 'package:runflow_flutter/core/utils/race_defaults.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart' hide formatDuration;
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/athlete_defaults_provider.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';
import 'package:runflow_flutter/presentation/providers/plan_wizard_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';
import 'package:runflow_flutter/presentation/widgets/sync_platform_selector.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _WizardStep {
  const _WizardStep({
    required this.title,
    required this.builder,
    required this.isVisible,
  });

  final String title;
  final Widget Function() builder;
  final bool Function(PlanWizardState state, List<String> connectedPlatforms,
      bool isFromOnboarding) isVisible;
}

class UnifiedPlanWizard extends ConsumerStatefulWidget {
  const UnifiedPlanWizard({super.key, required this.isFromOnboarding});

  final bool isFromOnboarding;

  @override
  ConsumerState<UnifiedPlanWizard> createState() => _UnifiedPlanWizardState();
}

class _UnifiedPlanWizardState extends ConsumerState<UnifiedPlanWizard> {
  static bool _connectImportVisible(PlanWizardState _,
          List<String> connectedPlatforms, bool isFromOnboarding) =>
      isFromOnboarding || connectedPlatforms.isEmpty;

  static bool _alwaysVisible(
          PlanWizardState state,
          List<String> connectedPlatforms,
          bool isFromOnboarding) =>
      true;

  final _nameController = TextEditingController();
  final _calHoursController = TextEditingController();
  final _calMinutesController = TextEditingController();
  final _calSecondsController = TextEditingController();
  final _targetHoursController = TextEditingController();
  final _targetMinutesController = TextEditingController();
  final _targetSecondsController = TextEditingController();
  final _backyardLoopDistController = TextEditingController();
  final _customSwimController = TextEditingController();
  final _customBikeController = TextEditingController();
  final _customRunController = TextEditingController();
  final _maxHrController = TextEditingController();
  final _restHrController = TextEditingController();
  final _thresholdHrController = TextEditingController();
  final _thresholdPaceMinController = TextEditingController();
  final _thresholdPaceSecController = TextEditingController();

  int? _sliderGoalTimeSeconds;

  late final List<_WizardStep> _allSteps;

  @override
  void initState() {
    super.initState();
    final s = ref.read(planWizardProvider);
    _nameController.text = s.name;
    _backyardLoopDistController.text =
        s.backyardLoopDistM?.toStringAsFixed(0) ?? '';
    _maxHrController.text = s.maxHeartRate.toString();
    _restHrController.text = s.restingHeartRate.toString();
    if (s.thresholdHR > 0) {
      _thresholdHrController.text = s.thresholdHR.toString();
    }
    if (s.thresholdPace > 0) {
      final mins = s.thresholdPace ~/ 60;
      final secs = s.thresholdPace % 60;
      _thresholdPaceMinController.text = mins.toString();
      _thresholdPaceSecController.text = secs.toString().padLeft(2, '0');
    }
    _allSteps = [
      _WizardStep(
          title: 'Connect Platforms',
          builder: _buildConnectPlatforms,
          isVisible: _connectImportVisible),
      _WizardStep(
          title: 'Import History',
          builder: _buildImportHistory,
          isVisible: _connectImportVisible),
      _WizardStep(
          title: 'Profile Analysis',
          builder: _buildProfileAnalysis,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Experience Level',
          builder: _buildExperienceLevel,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Goal Name & Race Type',
          builder: _buildGoalNameRaceType,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Dates',
          builder: _buildDates,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Calibration',
          builder: _buildCalibration,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Target Time',
          builder: _buildTargetTime,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Training Volume',
          builder: _buildTrainingVolume,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Training Phases',
          builder: _buildTrainingPhases,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Workout Scheduling',
          builder: _buildWorkoutScheduling,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Heart Rate Profile',
          builder: _buildHeartRateProfile,
          isVisible: _alwaysVisible),
      _WizardStep(
          title: 'Review',
          builder: _buildReview,
          isVisible: _alwaysVisible),
    ];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _calHoursController.dispose();
    _calMinutesController.dispose();
    _calSecondsController.dispose();
    _targetHoursController.dispose();
    _targetMinutesController.dispose();
    _targetSecondsController.dispose();
    _backyardLoopDistController.dispose();
    _customSwimController.dispose();
    _customBikeController.dispose();
    _customRunController.dispose();
    _maxHrController.dispose();
    _restHrController.dispose();
    _thresholdHrController.dispose();
    _thresholdPaceMinController.dispose();
    _thresholdPaceSecController.dispose();
    super.dispose();
  }

  List<_WizardStep> get _visibleSteps {
    final wizardState = ref.read(planWizardProvider);
    final connectedPlatforms =
        ref.read(onboardingProvider).connectedPlatforms;
    return _allSteps
        .where((s) => s.isVisible(
            wizardState, connectedPlatforms, widget.isFromOnboarding))
        .toList();
  }

  int get _currentStep => ref.read(planWizardProvider).currentStep;

  int get _planWeeksCap {
    final s = ref.read(planWizardProvider);
    return max(4, min(24, s.raceDate.difference(s.planStartDate!).inDays ~/ 7));
  }

  void _nextStep() {
    final visible = _visibleSteps;
    final notifier = ref.read(planWizardProvider.notifier);
    if (_currentStep < visible.length - 1) {
      notifier.setCurrentStep(_currentStep + 1);
    }
  }

  void _previousStep() {
    final notifier = ref.read(planWizardProvider.notifier);
    if (_currentStep > 0) {
      notifier.setCurrentStep(_currentStep - 1);
    }
  }

  void _skipToEnd() {
    final visible = _visibleSteps;
    final notifier = ref.read(planWizardProvider.notifier);
    notifier.setCurrentStep(visible.length - 1);
  }

  Future<void> _skipOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.onboardingCompletedKey, true);
    if (!mounted) return;
    final authState = ref.read(authStateProvider);
    final isAuthenticated =
        authState is AsyncData && authState.value != null;
    context.go(isAuthenticated ? '/dashboard' : '/login');
  }

  Future<void> _submit() async {
    final wizardState = ref.read(planWizardProvider);
    if (wizardState.isSubmitting) return;

    final notifier = ref.read(planWizardProvider.notifier);
    notifier.setIsSubmitting(true);

    try {
      _updateTargetTimeForSubmit();
      final request = notifier.buildSubmitPayload();
      final goal =
          await ref.read(goalsProvider.notifier).createGoal(request);

      if (widget.isFromOnboarding) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool(AppConstants.onboardingCompletedKey, true);
      }

      if (!mounted) return;

      if (widget.isFromOnboarding) {
        final authState = ref.read(authStateProvider);
        final isAuthenticated =
            authState is AsyncData && authState.value != null;
        context.go(isAuthenticated ? '/dashboard' : '/login');
      } else {
        context.go('/goals/${goal.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create plan: $e')),
        );
        ref.read(planWizardProvider.notifier).setIsSubmitting(false);
      }
    }
  }

  void _updateTargetTimeForSubmit() {
    final s = ref.read(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    if (s.raceType.isTimedEvent) {
      notifier.setTargetTime(
          s.raceType == RaceType.twelveHour ? 43200 : 86400);
      return;
    }
    if (s.raceType == RaceType.backyardUltra) {
      final stats = ref.read(analyticsStatsProvider).value;
      final vdot = stats?.effectiveVO2max ?? 0;
      if (vdot > 0 && (s.backyardLoopDistM ?? 0) > 0) {
        final factor = calculateProgressionCoefficient(
            _planWeeksCap, s.runsPerWeek, s.weeklyMileageGoal ?? 0);
        final projected = vdot * factor;
        final projection = estimateBackyardUltraTime(
          projected,
          s.backyardLoopDistM!.toInt(),
          s.targetLaps ?? 2,
          estimateTimeForDistance,
        );
        notifier.setTargetTime(projection?.projected.totalSeconds);
      }
      return;
    }
    final stats = ref.read(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    if (vdot > 0) {
      if (s.isManualMode) {
        final h = int.tryParse(_targetHoursController.text) ?? 0;
        final m = int.tryParse(_targetMinutesController.text) ?? 0;
        final sec = int.tryParse(_targetSecondsController.text) ?? 0;
        final total = h * 3600 + m * 60 + sec;
        notifier.setTargetTime(total > 0 ? total : null);
      } else if (s.raceType.isTriathlon) {
        notifier.setTargetTime(_computeTriathlonProjectedTime());
      } else {
        notifier.setTargetTime(
            _sliderGoalTimeSeconds ?? _computeProjectedTime());
      }
    } else if (s.hasTargetTime) {
      final h = int.tryParse(_targetHoursController.text) ?? 0;
      final m = int.tryParse(_targetMinutesController.text) ?? 0;
      final sec = int.tryParse(_targetSecondsController.text) ?? 0;
      final total = h * 3600 + m * 60 + sec;
      notifier.setTargetTime(total > 0 ? total : null);
    }
  }

  int? _computeProjectedTime() {
    final stats = ref.read(analyticsStatsProvider).value;
    if (stats == null || stats.effectiveVO2max <= 0) return null;
    final s = ref.read(planWizardProvider);
    final projection = calculateProjectedGoalTime(
      stats.effectiveVO2max,
      PlanSettings(
        durationWeeks: _planWeeksCap,
        runsPerWeek: s.runsPerWeek,
        weeklyMileageGoal: s.weeklyMileageGoal ?? 0,
        raceDistance: s.raceType,
      ),
      currentShapePercent: stats.marathonShape,
    );
    if (projection.projectedTime <= 0) return null;
    return projection.projectedTime;
  }

  int? _computeTriathlonProjectedTime() {
    final stats = ref.read(analyticsStatsProvider).value;
    if (stats == null || stats.effectiveVO2max <= 0) return null;
    final s = ref.read(planWizardProvider);
    final factor = calculateProgressionCoefficient(
        _planWeeksCap, s.runsPerWeek, s.weeklyMileageGoal ?? 0);
    final projected = stats.effectiveVO2max * factor;
    final key = triRaceTypeKey(s.raceType);
    final defaults = ref.read(athleteDefaultsProvider);
    final projection = estimateTriathlonTime(
      projected,
      key,
      estimateTimeForDistance,
      cssOverride: defaults.estimatedCssSecPer100m,
      bikeSpeedOverrideMs: defaults.estimatedFlatBikeSpeedMs,
    );
    return projection?.projected.totalSeconds;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final visibleSteps = _visibleSteps;
    final currentStep =
        wizardState.currentStep.clamp(0, visibleSteps.length - 1);
    final isLastStep = currentStep == visibleSteps.length - 1;
    final isFirstStep = currentStep == 0;

    ref.listen(planWizardProvider, (prev, next) {
      final prevVisible = _allSteps
          .where((s) => s.isVisible(
              prev ?? PlanWizardState(),
              ref.read(onboardingProvider).connectedPlatforms,
              widget.isFromOnboarding))
          .length;
      final newVisible = visibleSteps.length;
      if (prevVisible != newVisible && next.currentStep >= newVisible) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref
              .read(planWizardProvider.notifier)
              .setCurrentStep((newVisible - 1).clamp(0, newVisible - 1));
        });
      }
    });

    final progress =
        visibleSteps.isEmpty ? 0.0 : (currentStep + 1) / visibleSteps.length;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (currentStep > 0) {
          _previousStep();
        } else if (widget.isFromOnboarding) {
          context.go('/onboarding');
        } else {
          context.go('/goals');
        }
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
                    if (!isFirstStep)
                      TextButton(
                        onPressed: _previousStep,
                        child: const Text('Back'),
                      )
                    else if (widget.isFromOnboarding)
                      TextButton(
                        onPressed: () => context.go('/onboarding'),
                        child: const Text('Back'),
                      )
                    else
                      TextButton(
                        onPressed: () => context.go('/goals'),
                        child: const Text('Cancel'),
                      ),
                    const Spacer(),
                    Text(
                      '${currentStep + 1} / ${visibleSteps.length}',
                      style:
                          const TextStyle(color: AppColors.onSurfaceVariant),
                    ),
                    if (widget.isFromOnboarding) ...[
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: _skipOnboarding,
                        child: const Text('Skip'),
                      ),
                    ],
                  ],
                ),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor:
                        theme.colorScheme.surfaceContainerHighest,
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
                  child: KeyedSubtree(
                    key: ValueKey(currentStep),
                    child: visibleSteps.isEmpty
                        ? const SizedBox.shrink()
                        : visibleSteps[currentStep].builder(),
                  ),
                ),
              ),
              _buildNavigationButtons(
                  context, currentStep, visibleSteps.length, isLastStep),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavigationButtons(
      BuildContext context, int currentStep, int totalSteps, bool isLastStep) {
    final wizardState = ref.watch(planWizardProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isLastStep)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed:
                    wizardState.isSubmitting ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: wizardState.isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.onPrimary,
                        ),
                      )
                    : const Text('Generate Training Plan',
                        style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _nextStep,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Next',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward, size: 18),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          if (!isLastStep) const SizedBox(height: 8),
          if (!isLastStep)
            SizedBox(
              width: double.infinity,
              height: 40,
              child: TextButton(
                onPressed: _skipToEnd,
                child: const Text('Skip to Review'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildConnectPlatforms() {
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
            onSkip: () => _nextStep(),
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

  Widget _buildImportHistory() {
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
            'Import Activity History',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Import your past activities for better plan customization.',
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
                      'Syncing in progress...',
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
                labelText: 'Import range',
              ),
              items: const [
                DropdownMenuItem(value: '1_MONTH', child: Text('Last month')),
                DropdownMenuItem(
                    value: '3_MONTHS', child: Text('Last 3 months')),
                DropdownMenuItem(
                    value: '6_MONTHS', child: Text('Last 6 months')),
                DropdownMenuItem(value: '1_YEAR', child: Text('Last year')),
                DropdownMenuItem(value: 'ALL', child: Text('All history')),
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
              onPressed: () => _nextStep(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                onboarding.hasSynced
                    ? 'Continue'
                    : 'Skip for now',
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
    } catch (e) {
      debugPrint('UnifiedWizard: sync failed: $e');
      ref.read(onboardingProvider.notifier).setSyncing(false);
    }
  }

  Widget _buildProfileAnalysis() {
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
            'Based on your activity data',
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
                      'Default values will be used. You can customize them later.',
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
        ],
      ),
    );
  }

  Widget _buildExperienceLevel() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final current = wizardState.experienceLevel;

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
              Icons.trending_up,
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Running Experience',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'This helps us set appropriate training defaults.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ...[
            _ExperienceCard(
              title: 'Beginner',
              subtitle: 'New to running or less than 1 year',
              icon: Icons.directions_walk,
              color: const Color(0xFF4CAF50),
              isSelected: current == 'BEGINNER',
              onTap: () => ref
                  .read(planWizardProvider.notifier)
                  .adjustDefaultsForExperience('BEGINNER'),
            ),
            const SizedBox(height: 12),
            _ExperienceCard(
              title: 'Intermediate',
              subtitle: '1-3 years of consistent running',
              icon: Icons.directions_run,
              color: const Color(0xFF2196F3),
              isSelected: current == 'INTERMEDIATE',
              onTap: () => ref
                  .read(planWizardProvider.notifier)
                  .adjustDefaultsForExperience('INTERMEDIATE'),
            ),
            const SizedBox(height: 12),
            _ExperienceCard(
              title: 'Advanced',
              subtitle: '3+ years, regularly racing',
              icon: Icons.emoji_events,
              color: const Color(0xFFFF9800),
              isSelected: current == 'ADVANCED',
              onTap: () => ref
                  .read(planWizardProvider.notifier)
                  .adjustDefaultsForExperience('ADVANCED'),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildGoalNameRaceType() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            'Goal Name',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              hintText: 'e.g. Berlin Marathon 2026',
              prefixIcon: Icon(Icons.edit, size: 20),
            ),
            onChanged: (v) => notifier.setName(v),
          ),
          const SizedBox(height: 16),
          Text(
            'Race Type',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          _RaceTypeGroup(
            title: 'Running',
            types: const [
              RaceType.fiveK,
              RaceType.tenK,
              RaceType.halfMarathon,
              RaceType.marathon,
            ],
            selectedType: wizardState.raceType,
            onSelected: (type) => _onRaceTypeChanged(type),
            initiallyExpanded: true,
          ),
          _RaceTypeGroup(
            title: 'Ultra / Endurance',
            types: const [
              RaceType.fiftyK,
              RaceType.fiftyMile,
              RaceType.hundredK,
              RaceType.hundredMile,
              RaceType.twelveHour,
              RaceType.twentyFourHour,
              RaceType.backyardUltra,
              RaceType.customDistance,
            ],
            selectedType: wizardState.raceType,
            onSelected: (type) => _onRaceTypeChanged(type),
          ),
          _RaceTypeGroup(
            title: 'Triathlon',
            types: const [
              RaceType.sprintTri,
              RaceType.olympicTri,
              RaceType.halfIronman,
              RaceType.fullIronman,
              RaceType.customTri,
            ],
            selectedType: wizardState.raceType,
            onSelected: (type) => _onRaceTypeChanged(type),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _onRaceTypeChanged(RaceType type) {
    final notifier = ref.read(planWizardProvider.notifier);
    notifier.resetForRaceType(type.name);
    final vdot = ref.read(analyticsStatsProvider).value?.effectiveVO2max ?? 0;
    var d = getRaceDefaults(type);
    if (vdot > 0) {
      d = adjustDefaultsForVdot(d, vdot);
    }
    notifier.setRunsPerWeek(d.runsPerWeek);
    notifier.setRidesPerWeek(d.ridesPerWeek);
    notifier.setSwimsPerWeek(d.swimsPerWeek);
    notifier.setStrengthPerWeek(d.strengthPerWeek);
    notifier.setWeeklyMileageGoal(d.weeklyVolumeKm);
    notifier.setMaxLongRunKm(d.maxLongRunKm);
    notifier.setTaperWeeks(d.taperWeeks);
    notifier.setPeakWeeks(d.peakWeeks);
    notifier.setBuildWeeks(d.buildWeeks);
    if (d.backyardLoopDistM != null) {
      notifier.setBackyardLoopDistM(d.backyardLoopDistM!.toDouble());
      _backyardLoopDistController.text = '${d.backyardLoopDistM}';
    }
    if (d.targetLaps != null) {
      notifier.setTargetLaps(d.targetLaps);
    }
    _sliderGoalTimeSeconds = null;
    _targetHoursController.clear();
    _targetMinutesController.clear();
    _targetSecondsController.clear();
  }

  Widget _buildDates() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Race Date',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'When is your target race?',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    _formatDate(wizardState.raceDate),
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: wizardState.raceDate,
                          firstDate: DateTime.now(),
                          lastDate:
                              DateTime.now().add(const Duration(days: 730)),
                        );
                        if (picked != null) {
                          notifier.setRaceDate(picked);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: const Text('Select Race Date'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Plan Start Date',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final now = DateTime.now();
                        final firstDate = DateTime(
                          now.year, now.month, now.day,
                        ).subtract(const Duration(days: 30));
                        final initialDate =
                            wizardState.planStartDate!.isAfter(wizardState.raceDate)
                                ? wizardState.raceDate
                                : wizardState.planStartDate!.isBefore(firstDate)
                                    ? firstDate
                                    : wizardState.planStartDate!;
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: initialDate,
                          firstDate: firstDate,
                          lastDate: wizardState.raceDate,
                        );
                        if (picked != null) {
                          notifier.setPlanStartDate(picked);
                        }
                      },
                      icon: const Icon(Icons.play_arrow),
                      label: Text(_formatDate(wizardState.planStartDate!)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.info_outline,
                      color: AppColors.onSurfaceVariant, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '${wizardState.raceDate.difference(DateTime.now()).inDays} days from now ($_planWeeksCap weeks)',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCalibration() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final statsAsync = ref.watch(analyticsStatsProvider);
    final effectiveVO2max = statsAsync.value?.effectiveVO2max ?? 0;

    final totalSeconds = (int.tryParse(_calHoursController.text) ?? 0) * 3600 +
        (int.tryParse(_calMinutesController.text) ?? 0) * 60 +
        (int.tryParse(_calSecondsController.text) ?? 0);

    double? computedVdot;
    if (totalSeconds > 0) {
      computedVdot = calculateVdotFromRace(
        distanceKey: wizardState.calibrationDistance ?? '5K',
        timeSeconds: totalSeconds,
      );
    }

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
              Icons.speed,
              color: Color(0xFF2196F3),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Current Fitness',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Use a recent race result to calibrate predictions.',
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Calibration Distance',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      _CalibDistChip(
                          label: '5K',
                          selected:
                              wizardState.calibrationDistance == '5K',
                          onTap: () {
                            notifier.setCalibrationDistance('5K');
                            _updateCalibration(effectiveVO2max);
                          }),
                      _CalibDistChip(
                          label: '10K',
                          selected:
                              wizardState.calibrationDistance == '10K',
                          onTap: () {
                            notifier.setCalibrationDistance('10K');
                            _updateCalibration(effectiveVO2max);
                          }),
                      _CalibDistChip(
                          label: 'Half',
                          selected:
                              wizardState.calibrationDistance == 'HALF',
                          onTap: () {
                            notifier.setCalibrationDistance('HALF');
                            _updateCalibration(effectiveVO2max);
                          }),
                      _CalibDistChip(
                          label: 'Marathon',
                          selected:
                              wizardState.calibrationDistance == 'MARATHON',
                          onTap: () {
                            notifier.setCalibrationDistance('MARATHON');
                            _updateCalibration(effectiveVO2max);
                          }),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Your Time',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _calHoursController,
                          decoration: const InputDecoration(
                            labelText: 'Hours',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) =>
                              _updateCalibration(effectiveVO2max),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _calMinutesController,
                          decoration: const InputDecoration(
                            labelText: 'Minutes',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) =>
                              _updateCalibration(effectiveVO2max),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _calSecondsController,
                          decoration: const InputDecoration(
                            labelText: 'Seconds',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) =>
                              _updateCalibration(effectiveVO2max),
                        ),
                      ),
                    ],
                  ),
                  if (effectiveVO2max > 0 && totalSeconds == 0) ...[
                    const SizedBox(height: 12),
                    Center(
                      child: TextButton.icon(
                        onPressed: () {
                          final predicted = predictRaceTime(
                            effectiveVO2max,
                            wizardState.calibrationDistance ?? '5K',
                          );
                          final h = predicted ~/ 3600;
                          final m = (predicted % 3600) ~/ 60;
                          final s = predicted % 60;
                          _calHoursController.text =
                              h > 0 ? h.toString() : '';
                          _calMinutesController.text =
                              m.toString().padLeft(2, '0');
                          _calSecondsController.text =
                              s.toString().padLeft(2, '0');
                          _updateCalibration(effectiveVO2max);
                        },
                        icon: const Icon(Icons.auto_fix_high, size: 16),
                        label: const Text('Use predicted time'),
                      ),
                    ),
                  ],
                  if (computedVdot != null && computedVdot > 0) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.speed,
                              color: AppColors.primary, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'VDOT: ${computedVdot.toStringAsFixed(1)}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _updateCalibration(double effectiveVO2max) {
    final notifier = ref.read(planWizardProvider.notifier);
    final seconds = (int.tryParse(_calHoursController.text) ?? 0) * 3600 +
        (int.tryParse(_calMinutesController.text) ?? 0) * 60 +
        (int.tryParse(_calSecondsController.text) ?? 0);
    notifier.setCalibrationTime(seconds > 0 ? seconds : null);

    if (seconds > 0 && effectiveVO2max > 0) {
      final vdot = calculateVdotFromRace(
        distanceKey:
            ref.read(planWizardProvider).calibrationDistance ?? '5K',
        timeSeconds: seconds,
      );
      notifier.setCalibrationFactor(vdot / effectiveVO2max);
    } else {
      notifier.setCalibrationFactor(null);
    }
  }

  Widget _buildTargetTime() {
    final wizardState = ref.watch(planWizardProvider);
    if (wizardState.raceType == RaceType.backyardUltra) {
      return _buildBackyardUltraTimeStep();
    }
    if (wizardState.raceType.isTriathlon) return _buildTriathlonTimeStep();
    if (wizardState.raceType.isTimedEvent) return _buildTimedEventStep();
    return _buildStandardTargetTimeStep();
  }

  Widget _buildStandardTargetTimeStep() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final stats = ref.watch(analyticsStatsProvider).value;
    final effectiveVO2max = stats?.effectiveVO2max ?? 0;
    final marathonShape = stats?.marathonShape ?? 70;

    if (effectiveVO2max <= 0) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Target Time',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Set an optional goal time for your race.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            SwitchListTile(
              title: const Text('Set a target time'),
              value: wizardState.hasTargetTime,
              onChanged: (v) => notifier.setHasTargetTime(v),
              contentPadding: EdgeInsets.zero,
            ),
            if (wizardState.hasTargetTime) ...[
              const SizedBox(height: 16),
              _buildTimeFieldsRow(
                  _targetHoursController,
                  _targetMinutesController,
                  _targetSecondsController,
                  (total) => notifier.setTargetTime(total)),
            ],
          ],
        ),
      );
    }

    final projection = calculateProjectedGoalTime(
      effectiveVO2max,
      PlanSettings(
        durationWeeks: _planWeeksCap,
        runsPerWeek: wizardState.runsPerWeek,
        weeklyMileageGoal: wizardState.weeklyMileageGoal ?? 0,
        raceDistance: wizardState.raceType,
      ),
      currentShapePercent: marathonShape,
    );

    if (projection.projectedTime <= 0) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Target Time',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 48, color: AppColors.onSurfaceVariant),
                    const SizedBox(height: 12),
                    Text(
                      'No prediction available for this race type.',
                      style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    final displayTime =
        _sliderGoalTimeSeconds ?? projection.projectedTime;
    final sliderMin = (projection.optimalTime * 0.9).round();
    final sliderMax = (projection.conservativeTime * 1.1).round();
    final clampedDisplay =
        displayTime.clamp(sliderMin, sliderMax).toInt();
    final divisions =
        ((sliderMax - sliderMin) ~/ 30).clamp(1, 200).toInt();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Target Time',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Column(
              children: [
                Text(
                  formatDurationClock(displayTime),
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _sliderGoalTimeSeconds != null
                      ? 'Custom goal'
                      : 'Projected based on fitness',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: _sliderGoalTimeSeconds != null
                        ? AppColors.primary
                        : AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: () =>
                    notifier.setIsManualMode(!wizardState.isManualMode),
                icon: Icon(wizardState.isManualMode
                    ? Icons.tune
                    : Icons.auto_awesome),
                label:
                    Text(wizardState.isManualMode ? 'Guided' : 'AI Assisted'),
              ),
              if (_sliderGoalTimeSeconds != null)
                TextButton(
                  onPressed: () {
                    setState(() {
                      _sliderGoalTimeSeconds = null;
                    });
                    notifier.setIsManualMode(false);
                  },
                  child: const Text('Reset to projected'),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (wizardState.isManualMode)
            _buildTimeFieldsRow(
                _targetHoursController,
                _targetMinutesController,
                _targetSecondsController, (total) {
              notifier.setTargetTime(total > 0 ? total : null);
            })
          else
            Column(
              children: [
                Slider(
                  value: clampedDisplay.toDouble(),
                  min: sliderMin.toDouble(),
                  max: sliderMax.toDouble(),
                  divisions: divisions,
                  label: formatDurationClock(clampedDisplay),
                  onChanged: (value) => setState(
                      () => _sliderGoalTimeSeconds = value.round()),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${formatDurationClock(projection.optimalTime)} (Optimal)',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.success),
                    ),
                    Text(
                      '${formatDurationClock(projection.conservativeTime)} (Conservative)',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.primary),
                    ),
                  ],
                ),
              ],
            ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VO2max',
                          style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant),
                        ),
                        Row(
                          children: [
                            Text(
                              effectiveVO2max.toStringAsFixed(1),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600),
                            ),
                            Text(' → ',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                    color: AppColors.onSurfaceVariant)),
                            Text(
                              projection.projectedVdot.toStringAsFixed(1),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary),
                            ),
                            if (projection.improvementPercent > 0)
                              Text(
                                ' (+${projection.improvementPercent.toStringAsFixed(1)}%)',
                                style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppColors.success),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Marathon Shape',
                          style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant),
                        ),
                        Row(
                          children: [
                            Text(
                              '${marathonShape.round()}%',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600),
                            ),
                            Text(' → ',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                    color: AppColors.onSurfaceVariant)),
                            Text(
                              '${projection.projectedShape}%',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackyardUltraTimeStep() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Backyard Ultra Setup',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _backyardLoopDistController,
            decoration: const InputDecoration(
              labelText: 'Loop distance (meters)',
              hintText: 'e.g. 6706',
            ),
            keyboardType: TextInputType.number,
            onChanged: (value) {
              notifier.setBackyardLoopDistM(double.tryParse(value));
            },
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.loop, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Target laps',
                          style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                      Text(
                        '${wizardState.targetLaps ?? 2}',
                        style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: (wizardState.targetLaps ?? 2).toDouble(),
                    min: 1,
                    max: 100,
                    divisions: 99,
                    onChanged: (v) => notifier.setTargetLaps(v.round()),
                  ),
                ],
              ),
            ),
          ),
          if ((wizardState.backyardLoopDistM ?? 0) > 0) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.straighten, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Total distance',
                          style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500)),
                    ),
                    Text(
                      '${((wizardState.backyardLoopDistM ?? 0) * (wizardState.targetLaps ?? 2) / 1000).toStringAsFixed(1)} km',
                      style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (vdot > 0 && (wizardState.backyardLoopDistM ?? 0) > 0) ...[
            const SizedBox(height: 16),
            Builder(builder: (context) {
              final factor = calculateProgressionCoefficient(
                  _planWeeksCap,
                  wizardState.runsPerWeek,
                  wizardState.weeklyMileageGoal ?? 0);
              final projected = vdot * factor;
              final projection = estimateBackyardUltraTime(
                projected,
                (wizardState.backyardLoopDistM ?? 6706).toInt(),
                wizardState.targetLaps ?? 2,
                estimateTimeForDistance,
              );
              if (projection == null) return const SizedBox.shrink();
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Text(
                        formatDurationClock(
                            projection.projected.totalSeconds),
                        style: theme.textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                      const SizedBox(height: 4),
                      const Text('Estimated finish time',
                          style: TextStyle(
                              color: AppColors.onSurfaceVariant)),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Optimal: ${formatDurationClock(projection.optimal.totalSeconds)}',
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.success),
                          ),
                          Text(
                            'Conservative: ${formatDurationClock(projection.conservative.totalSeconds)}',
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildTriathlonTimeStep() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    final key = triRaceTypeKey(wizardState.raceType);
    final defaults = ref.watch(athleteDefaultsProvider);

    TriathlonProjection? triProjection;
    if (vdot > 0) {
      final factor = calculateProgressionCoefficient(
          _planWeeksCap,
          wizardState.runsPerWeek,
          wizardState.weeklyMileageGoal ?? 0);
      final projected = vdot * factor;
      triProjection = estimateTriathlonTime(
        projected,
        key,
        estimateTimeForDistance,
        cssOverride: defaults.estimatedCssSecPer100m,
        bikeSpeedOverrideMs: defaults.estimatedFlatBikeSpeedMs,
      );
    }

    final sliderMin =
        triProjection?.optimal.totalSeconds ?? 3600;
    final sliderMax =
        triProjection?.conservative.totalSeconds ?? 21600;
    final range = sliderMax - sliderMin;
    final displayTime = _sliderGoalTimeSeconds ??
        triProjection?.projected.totalSeconds;
    final clampedDisplay = displayTime != null
        ? displayTime.clamp(sliderMin, sliderMax).toInt()
        : sliderMin;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Triathlon Target Time',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          if (wizardState.raceType == RaceType.customTri) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Custom Distances',
                      style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _customSwimController,
                            decoration: const InputDecoration(
                                labelText: 'Swim (m)',
                                hintText: '1500',
                                isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (v) => notifier
                                .setCustomSwimDistM(
                                    double.tryParse(v)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _customBikeController,
                            decoration: const InputDecoration(
                                labelText: 'Bike (m)',
                                hintText: '40000',
                                isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (v) => notifier
                                .setCustomBikeDistM(
                                    double.tryParse(v)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _customRunController,
                            decoration: const InputDecoration(
                                labelText: 'Run (m)',
                                hintText: '10000',
                                isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (v) => notifier
                                .setCustomRunDistM(
                                    double.tryParse(v)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Center(
            child: Column(
              children: [
                Text(
                  formatDurationClock(clampedDisplay),
                  style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary),
                ),
              ],
            ),
          ),
          if (triProjection != null && range > 0) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () =>
                      notifier.setIsManualMode(!wizardState.isManualMode),
                  icon: Icon(wizardState.isManualMode
                      ? Icons.tune
                      : Icons.auto_awesome),
                  label: Text(wizardState.isManualMode ? 'Guided' : 'AI Assisted'),
                ),
                if (_sliderGoalTimeSeconds != null)
                  TextButton(
                    onPressed: () {
                      setState(() => _sliderGoalTimeSeconds = null);
                      notifier.setIsManualMode(false);
                    },
                    child: const Text('Reset to projected'),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (wizardState.isManualMode)
              _buildTimeFieldsRow(
                  _targetHoursController,
                  _targetMinutesController,
                  _targetSecondsController, (total) {
                notifier.setTargetTime(total > 0 ? total : null);
              })
            else
              Column(
                children: [
                  Slider(
                    value: clampedDisplay.toDouble(),
                    min: sliderMin.toDouble(),
                    max: sliderMax.toDouble(),
                    divisions: (range ~/ (range <= 7200 ? 30 : 120))
                        .clamp(1, 200),
                    label: formatDurationClock(clampedDisplay),
                    onChanged: (value) => setState(
                        () => _sliderGoalTimeSeconds = value.round()),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${formatDurationClock(sliderMin)} (Optimal)',
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.success),
                      ),
                      Text(
                        '${formatDurationClock(sliderMax)} (Conservative)',
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                ],
              ),
          ],
          if (triProjection != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('VO2max',
                              style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.onSurfaceVariant)),
                          Text(
                            vdot.toStringAsFixed(1),
                            style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimedEventStep() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    final fixedSeconds =
        wizardState.raceType == RaceType.twelveHour ? 43200 : 86400;
    final durationLabel =
        wizardState.raceType == RaceType.twelveHour ? '12 hours' : '24 hours';

    String? estimatedDistance;
    if (vdot > 0) {
      final factor = calculateProgressionCoefficient(
          _planWeeksCap,
          wizardState.runsPerWeek,
          wizardState.weeklyMileageGoal ?? 0);
      final projected = vdot * factor;
      int lo = 1000;
      int hi = 500000;
      while (hi - lo > 100) {
        final mid = (lo + hi) ~/ 2;
        final estimated = estimateTimeForDistance(projected, mid);
        if (estimated <= 0) break;
        if (estimated < fixedSeconds) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      estimatedDistance = '${(lo / 1000).toStringAsFixed(1)} km';
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Timed Event',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'This is a fixed-duration event.',
            style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Center(
                    child: Text(
                      formatDurationClock(fixedSeconds),
                      style: theme.textTheme.displaySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Fixed duration: $durationLabel',
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
          if (estimatedDistance != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.straighten, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text('Estimated distance',
                          style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500)),
                    ),
                    Text(estimatedDistance,
                        style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTrainingVolume() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final stats = ref.watch(analyticsStatsProvider).value;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Training Volume',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          _buildCounterCard(
              theme, Icons.directions_run, 'Runs per week',
              wizardState.runsPerWeek, (v) => notifier.setRunsPerWeek(v)),
          const SizedBox(height: 12),
          if (wizardState.raceType.isTriathlon) ...[
            _buildCounterCard(
                theme, Icons.directions_bike, 'Rides per week',
                wizardState.ridesPerWeek, (v) => notifier.setRidesPerWeek(v)),
            const SizedBox(height: 12),
            _buildCounterCard(
                theme, Icons.pool, 'Swims per week',
                wizardState.swimsPerWeek, (v) => notifier.setSwimsPerWeek(v)),
            const SizedBox(height: 12),
          ],
          _buildCounterCard(
              theme, Icons.fitness_center, 'Strength per week',
              wizardState.strengthPerWeek,
              (v) => notifier.setStrengthPerWeek(v)),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.play_arrow, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('Start weekly mileage',
                            style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w500)),
                      ),
                      Text(
                        '${(wizardState.startWeeklyMileage ?? stats?.avgWeeklyKmLast3Months ?? (wizardState.weeklyMileageGoal ?? 40) * 0.6).clamp(8.0, wizardState.weeklyMileageGoal ?? 40).toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: (wizardState.startWeeklyMileage ??
                            stats?.avgWeeklyKmLast3Months ??
                            (wizardState.weeklyMileageGoal ?? 40) * 0.6)
                        .clamp(8.0, wizardState.weeklyMileageGoal ?? 40),
                    min: 8,
                    max: wizardState.weeklyMileageGoal ?? 40,
                    divisions:
                        ((wizardState.weeklyMileageGoal ?? 40) - 8)
                            .clamp(1, 112)
                            .toInt(),
                    onChanged: (v) => notifier.setStartWeeklyMileage(v),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.straighten, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('Weekly mileage goal',
                            style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w500)),
                      ),
                      Text(
                        '${(wizardState.weeklyMileageGoal ?? 40).toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: wizardState.weeklyMileageGoal ?? 40,
                    min: 10,
                    max: 120,
                    divisions: 22,
                    onChanged: (v) => notifier.setWeeklyMileageGoal(v),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.trending_up, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('Max long run',
                            style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w500)),
                      ),
                      Text(
                        '${(wizardState.maxLongRunKm ?? 22).toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary),
                      ),
                    ],
                  ),
                  Slider(
                    value: wizardState.maxLongRunKm ?? 22,
                    min: 6,
                    max: 80,
                    divisions: 74,
                    onChanged: (v) => notifier.setMaxLongRunKm(v),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCounterCard(ThemeData theme, IconData icon, String label,
      int value, ValueChanged<int> onChanged) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500)),
                ),
                Text('$value',
                    style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ],
            ),
            Slider(
              value: value.toDouble(),
              min: 0,
              max: 7,
              divisions: 7,
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrainingPhases() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    final planWeeks = _planWeeksCap;
    final total =
        wizardState.taperWeeks + wizardState.peakWeeks + wizardState.buildWeeks;
    final exceedsPlan = total > planWeeks;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Training Phases',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          _buildPhaseCard(theme, 'Build weeks', wizardState.buildWeeks, 10,
              (v) => notifier.setBuildWeeks(v)),
          const SizedBox(height: 12),
          _buildPhaseCard(theme, 'Peak weeks', wizardState.peakWeeks, 6,
              (v) => notifier.setPeakWeeks(v)),
          const SizedBox(height: 12),
          _buildPhaseCard(theme, 'Taper weeks', wizardState.taperWeeks, 4,
              (v) => notifier.setTaperWeeks(v)),
          const SizedBox(height: 16),
          Card(
            color: exceedsPlan
                ? AppColors.warning.withValues(alpha: 0.1)
                : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    exceedsPlan
                        ? Icons.warning_amber
                        : Icons.check_circle,
                    color:
                        exceedsPlan ? AppColors.warning : AppColors.success,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      exceedsPlan
                          ? 'Phases ($total w) exceed plan length ($planWeeks w)'
                          : '${planWeeks - total} base / ${wizardState.buildWeeks} build / ${wizardState.peakWeeks} peak / ${wizardState.taperWeeks} taper',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color:
                            exceedsPlan ? AppColors.warning : AppColors.success,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhaseCard(ThemeData theme, String label, int value,
      int maxValue, ValueChanged<int> onChanged) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500)),
                ),
                Text('$value',
                    style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ],
            ),
            Slider(
              value: value.toDouble(),
              min: 0,
              max: maxValue.toDouble(),
              divisions: maxValue,
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkoutScheduling() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    final notifier = ref.read(planWizardProvider.notifier);
    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Workout Scheduling',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildDayDropdown(context, Icons.directions_run,
                      'Long run day', wizardState.longRunDay,
                      (v) => notifier.setLongRunDay(v)),
                  const Divider(height: 24),
                  _buildDayDropdown(context, Icons.speed,
                      'Quality/workout day', wizardState.workoutDay,
                      (v) => notifier.setWorkoutDay(v)),
                  if (wizardState.raceType.isTriathlon) ...[
                    const Divider(height: 24),
                    _buildDayDropdown(context, Icons.pool,
                        'Swim day', wizardState.swimDay,
                        (v) => notifier.setSwimDay(v)),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rest days',
                    style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(7, (index) {
                    final selected =
                        wizardState.restDays?.contains(index) ?? false;
                    return CheckboxListTile(
                      value: selected,
                      title: Text(dayNames[index]),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      onChanged: (checked) {
                        final updated =
                            List<int>.from(wizardState.restDays ?? []);
                        if (checked == true) {
                          updated.add(index);
                          updated.sort();
                        } else {
                          updated.remove(index);
                        }
                        notifier.setRestDays(updated);
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayDropdown(BuildContext context, IconData icon, String label,
      int value, ValueChanged<int> onChanged) {
    final theme = Theme.of(context);
    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label,
              style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500)),
        ),
        DropdownButton<int>(
          value: value,
          underline: const SizedBox.shrink(),
          items: List.generate(
            7,
            (i) => DropdownMenuItem(value: i, child: Text(dayNames[i])),
          ),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ],
    );
  }

  Widget _buildHeartRateProfile() {
    final theme = Theme.of(context);
    final notifier = ref.read(planWizardProvider.notifier);

    final lthr = () {
      final hr = int.tryParse(_thresholdHrController.text) ?? 0;
      if (hr > 0) return hr;
      final maxHr = int.tryParse(_maxHrController.text) ?? 0;
      if (maxHr > 0) return (maxHr * 0.9).round();
      return 0;
    }();

    final zones = calculateHRZonesFromLTHR(lthr);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFE91E63).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.favorite,
              color: Color(0xFFE91E63),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Heart Rate Profile',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Optional. Used for local HR zone calculations only.',
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
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _maxHrController,
                          decoration: const InputDecoration(
                            labelText: 'Max HR',
                            prefixIcon:
                                Icon(Icons.trending_up, size: 20),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) {
                            notifier.setMaxHeartRate(int.tryParse(v) ?? 0);
                            setState(() {});
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _restHrController,
                          decoration: const InputDecoration(
                            labelText: 'Resting HR',
                            prefixIcon: Icon(Icons.hotel, size: 20),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) {
                            notifier.setRestingHeartRate(
                                int.tryParse(v) ?? 0);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _thresholdHrController,
                    decoration: InputDecoration(
                      labelText: 'LTHR',
                      prefixIcon: const Icon(Icons.favorite_border,
                          size: 20),
                      hintText: lthr > 0
                          ? 'Auto: $lthr bpm'
                          : 'Threshold HR',
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) {
                      notifier.setThresholdHR(int.tryParse(v) ?? 0);
                      setState(() {});
                    },
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _thresholdPaceMinController,
                          decoration: const InputDecoration(
                            labelText: 'Threshold pace min/km',
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _updateThresholdPace(notifier),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _thresholdPaceSecController,
                          decoration: const InputDecoration(
                            labelText: 'Seconds',
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _updateThresholdPace(notifier),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (zones.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Calculated Zones (LTHR: $lthr)',
                      style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    ...zones.map((zone) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(zone.label,
                                    style:
                                        theme.textTheme.bodySmall),
                              ),
                              Text(
                                '${zone.min} - ${zone.max == 999 ? 'max' : zone.max} bpm',
                                style:
                                    theme.textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        )),
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

  void _updateThresholdPace(PlanWizardNotifier notifier) {
    final mins =
        int.tryParse(_thresholdPaceMinController.text) ?? 0;
    final secs =
        int.tryParse(_thresholdPaceSecController.text) ?? 0;
    notifier.setThresholdPace(mins * 60 + secs);
  }

  Widget _buildReview() {
    final theme = Theme.of(context);
    final wizardState = ref.watch(planWizardProvider);
    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Review Your Plan',
            style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Review all settings before generating your plan.',
            style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ReviewRow(
                      icon: Icons.flag,
                      label: 'Goal Name',
                      value: wizardState.name),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.directions_run,
                      label: 'Race Type',
                      value: raceTypeLabel(wizardState.raceType)),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.event,
                      label: 'Race Date',
                      value: _formatDate(wizardState.raceDate)),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.play_arrow,
                      label: 'Plan Start',
                      value: _formatDate(wizardState.planStartDate!)),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.show_chart,
                      label: 'Plan Duration',
                      value:
                          '$_planWeeksCap weeks'),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.trending_up,
                      label: 'Experience',
                      value: wizardState.experienceLevel),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.directions_run,
                      label: 'Runs/week',
                      value: '${wizardState.runsPerWeek}'),
                  if (wizardState.ridesPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.directions_bike,
                        label: 'Rides/week',
                        value: '${wizardState.ridesPerWeek}'),
                  ],
                  if (wizardState.swimsPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.pool,
                        label: 'Swims/week',
                        value: '${wizardState.swimsPerWeek}'),
                  ],
                  if (wizardState.strengthPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.fitness_center,
                        label: 'Strength/week',
                        value: '${wizardState.strengthPerWeek}'),
                  ],
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.straighten,
                      label: 'Weekly Mileage',
                      value:
                          '${(wizardState.weeklyMileageGoal ?? 0).toStringAsFixed(0)} km'),
                  if (wizardState.startWeeklyMileage != null) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.play_arrow,
                        label: 'Start Mileage',
                        value:
                            '${wizardState.startWeeklyMileage!.toStringAsFixed(0)} km'),
                  ],
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.trending_up,
                      label: 'Max Long Run',
                      value:
                          '${(wizardState.maxLongRunKm ?? 0).toStringAsFixed(0)} km'),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.show_chart,
                      label: 'Phases',
                      value:
                          '${_planWeeksCap - wizardState.buildWeeks - wizardState.peakWeeks - wizardState.taperWeeks} base / ${wizardState.buildWeeks} build / ${wizardState.peakWeeks} peak / ${wizardState.taperWeeks} taper'),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.directions_run,
                      label: 'Long Run Day',
                      value: dayNames[wizardState.longRunDay]),
                  const Divider(height: 24),
                  _ReviewRow(
                      icon: Icons.speed,
                      label: 'Quality Day',
                      value: dayNames[wizardState.workoutDay]),
                  if (wizardState.raceType.isTriathlon) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.pool,
                        label: 'Swim Day',
                        value: dayNames[wizardState.swimDay]),
                  ],
                  if (wizardState.restDays != null &&
                      wizardState.restDays!.isNotEmpty) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.bedtime,
                        label: 'Rest Days',
                        value: wizardState.restDays!
                            .map((d) => dayNames[d])
                            .join(', ')),
                  ],
                  if (wizardState.calibrationTime != null &&
                      wizardState.calibrationTime! > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.speed,
                        label: 'Calibration',
                        value:
                            '${wizardState.calibrationDistance} in ${formatDuration(wizardState.calibrationTime!)}'),
                  ],
                  if (wizardState.calibrationFactor != null &&
                      wizardState.calibrationFactor != 1.0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.tune,
                        label: 'Calibration Factor',
                        value:
                            '${((wizardState.calibrationFactor! - 1) * 100).toStringAsFixed(1)}%'),
                  ],
                  if (wizardState.raceType == RaceType.backyardUltra &&
                      (wizardState.backyardLoopDistM ?? 0) > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.loop,
                        label: 'Loop Distance',
                        value:
                            '${wizardState.backyardLoopDistM?.toStringAsFixed(0)} m'),
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.repeat,
                        label: 'Target Laps',
                        value: '${wizardState.targetLaps}'),
                  ],
                  if (wizardState.raceType == RaceType.customTri) ...[
                    if (wizardState.customSwimDistM != null &&
                        wizardState.customSwimDistM! > 0) ...[
                      const Divider(height: 24),
                      _ReviewRow(
                          icon: Icons.pool,
                          label: 'Custom Swim',
                          value:
                              '${wizardState.customSwimDistM!.toStringAsFixed(0)} m'),
                    ],
                    if (wizardState.customBikeDistM != null &&
                        wizardState.customBikeDistM! > 0) ...[
                      const Divider(height: 24),
                      _ReviewRow(
                          icon: Icons.directions_bike,
                          label: 'Custom Bike',
                          value:
                              '${wizardState.customBikeDistM!.toStringAsFixed(0)} m'),
                    ],
                    if (wizardState.customRunDistM != null &&
                        wizardState.customRunDistM! > 0) ...[
                      const Divider(height: 24),
                      _ReviewRow(
                          icon: Icons.directions_run,
                          label: 'Custom Run',
                          value:
                              '${wizardState.customRunDistM!.toStringAsFixed(0)} m'),
                    ],
                  ],
                  if (wizardState.maxHeartRate > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                        icon: Icons.favorite,
                        label: 'Max HR',
                        value: '${wizardState.maxHeartRate} bpm'),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeFieldsRow(
      TextEditingController hoursCtrl,
      TextEditingController minutesCtrl,
      TextEditingController secondsCtrl,
      void Function(int total) onChanged) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            controller: hoursCtrl,
            decoration: const InputDecoration(
              labelText: 'HH',
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            onChanged: (_) {
              final h = int.tryParse(hoursCtrl.text) ?? 0;
              final m = int.tryParse(minutesCtrl.text) ?? 0;
              final s = int.tryParse(secondsCtrl.text) ?? 0;
              onChanged(h * 3600 + m * 60 + s);
            },
          ),
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Text(':', style: theme.textTheme.headlineMedium),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            controller: minutesCtrl,
            decoration: const InputDecoration(
              labelText: 'MM',
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            onChanged: (_) {
              final h = int.tryParse(hoursCtrl.text) ?? 0;
              final m = int.tryParse(minutesCtrl.text) ?? 0;
              final s = int.tryParse(secondsCtrl.text) ?? 0;
              onChanged(h * 3600 + m * 60 + s);
            },
          ),
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Text(':', style: theme.textTheme.headlineMedium),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            controller: secondsCtrl,
            decoration: const InputDecoration(
              labelText: 'SS',
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            onChanged: (_) {
              final h = int.tryParse(hoursCtrl.text) ?? 0;
              final m = int.tryParse(minutesCtrl.text) ?? 0;
              final s = int.tryParse(secondsCtrl.text) ?? 0;
              onChanged(h * 3600 + m * 60 + s);
            },
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
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
                    value:
                        '${(stats.marathonShape * 100).toStringAsFixed(0)}%',
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
                child: Text(label,
                    style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.onSurfaceVariant),
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(value,
              style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700)),
          if (subtitle != null)
            Text(subtitle!,
                style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _ExperienceCard extends StatelessWidget {
  const _ExperienceCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? color.withValues(alpha: 0.12)
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
            border: isSelected
                ? Border.all(
                    color: color.withValues(alpha: 0.6), width: 2)
                : Border.all(
                    color:
                        AppColors.onSurfaceVariant.withValues(alpha: 0.1)),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: isSelected ? color : null,
                        )),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              if (isSelected)
                Icon(Icons.check_circle, color: color, size: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _RaceTypeGroup extends StatelessWidget {
  const _RaceTypeGroup({
    required this.title,
    required this.types,
    required this.selectedType,
    required this.onSelected,
    this.initiallyExpanded = false,
  });

  final String title;
  final List<RaceType> types;
  final RaceType selectedType;
  final ValueChanged<RaceType> onSelected;
  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExpansionTile(
      title: Text(title,
          style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600)),
      initiallyExpanded: initiallyExpanded,
      tilePadding: EdgeInsets.zero,
      childrenPadding: const EdgeInsets.only(bottom: 8),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: types.map((type) {
            final selected = type == selectedType;
            return ChoiceChip(
              label: Text(raceTypeLabel(type)),
              selected: selected,
              onSelected: (_) => onSelected(type),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _CalibDistChip extends StatelessWidget {
  const _CalibDistChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label,
              style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant)),
        ),
        Flexible(
          child: Text(value,
              style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600),
              textAlign: TextAlign.end),
        ),
      ],
    );
  }
}
