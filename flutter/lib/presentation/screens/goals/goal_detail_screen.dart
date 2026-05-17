import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/workout_theme.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class GoalDetailScreen extends ConsumerWidget {
  const GoalDetailScreen({required this.goalId, super.key});

  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalAsync = ref.watch(goalDetailProvider(goalId));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/goals');
            }
          },
        ),
        title: Text(S.of(context).goalDetailsTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _confirmDelete(context, ref),
          ),
        ],
      ),
      body: goalAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _GoalDetailError(
          message: error.toString(),
          onRetry: () => ref.invalidate(goalDetailProvider(goalId)),
        ),
        data: (goal) => _GoalDetailContent(goal: goal),
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(S.of(context).goalDeleteTitle),
        content: Text(S.of(context).goalDeleteConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(S.of(context).actionCancel),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              try {
                await ref.read(goalsProvider.notifier).deleteGoal(goalId);
                if (context.mounted) context.go('/goals');
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(S.of(context).goalDeleteFailed(e.toString()))),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: Text(S.of(context).actionDelete),
          ),
        ],
      ),
    );
  }
}

class _GoalDetailContent extends ConsumerWidget {
  const _GoalDetailContent({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final daysUntilRace = goal.raceDate?.difference(DateTime.now()).inDays ?? 0;
    final completedWorkouts =
        goal.workouts.where((w) => w.isCompleted).length;
    final totalWorkouts = goal.workouts.length;
    final progress =
        totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0.0;

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _GoalHeader(goal: goal),
        const SizedBox(height: 16),
        _RaceCountdownCard(
          daysUntilRace: daysUntilRace,
          progress: progress,
          completedWorkouts: completedWorkouts,
          totalWorkouts: totalWorkouts,
        ),
        if (goal.subGoals.isNotEmpty || goal.parentGoalId == null) ...[
          const SizedBox(height: 16),
          _SubGoalsSection(goal: goal),
        ],
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            S.of(context).goalWorkouts,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (goal.workouts.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  S.of(context).planNoWorkoutsScheduled,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          )
        else
          ...goal.workouts.map(
            (workout) => _WorkoutCard(
              workout: workout,
              goalId: goal.id,
            ),
          ),
      ],
    );
  }
}

class _SubGoalsSection extends ConsumerWidget {
  const _SubGoalsSection({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final s = S.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  s.goalSubGoalsTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, size: 22),
                onPressed: () => _showAddSubGoalDialog(context, ref),
                tooltip: s.goalSubGoalAdd,
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        if (goal.subGoals.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  s.goalSubGoalsEmpty,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          )
        else
          ...goal.subGoals.map(
            (subGoal) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: Card(
                child: ListTile(
                  dense: true,
                  leading: Icon(
                    subGoal.priority == 'MILESTONE'
                        ? Icons.flag
                        : subGoal.priority == 'TUNE_UP'
                            ? Icons.directions_run
                            : Icons.subdirectory_arrow_right,
                    size: 20,
                    color: theme.colorScheme.primary,
                  ),
                  title: Text(
                    subGoal.name,
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: subGoal.raceDate != null
                      ? Text(
                          '${subGoal.raceDate!.day.toString().padLeft(2, '0')}/${subGoal.raceDate!.month.toString().padLeft(2, '0')}/${subGoal.raceDate!.year}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        )
                      : null,
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => _confirmDeleteSubGoal(
                      context,
                      ref,
                      subGoal,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  void _confirmDeleteSubGoal(
    BuildContext context,
    WidgetRef ref,
    SubGoal subGoal,
  ) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(S.of(context).goalSubGoalDelete),
        content: Text(S.of(context).goalSubGoalDeleteConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(S.of(context).actionCancel),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final repo = ref.read(goalRepositoryProvider);
                await repo.deleteSubGoal(goal.id, subGoal.id);
                ref.invalidate(goalDetailProvider(goal.id));
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: Text(S.of(context).actionDelete),
          ),
        ],
      ),
    );
  }

  void _showAddSubGoalDialog(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();
    final s = S.of(context);
    String selectedPriority = 'SECONDARY';

    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(s.goalSubGoalAdd),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: s.goalSubGoalName,
                  hintText: s.goalSubGoalNameHint,
                  border: const OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: selectedPriority,
                decoration: InputDecoration(
                  labelText: s.goalSubGoalPriority,
                  border: const OutlineInputBorder(),
                ),
                items: [
                  DropdownMenuItem(
                    value: 'SECONDARY',
                    child: Text(s.goalSubGoalPrioritySecondary),
                  ),
                  DropdownMenuItem(
                    value: 'TUNE_UP',
                    child: Text(s.goalSubGoalPriorityTuneUp),
                  ),
                  DropdownMenuItem(
                    value: 'MILESTONE',
                    child: Text(s.goalSubGoalPriorityMilestone),
                  ),
                ],
                onChanged: (v) {
                  if (v != null) setDialogState(() => selectedPriority = v);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(s.actionCancel),
            ),
            FilledButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isEmpty) return;
                Navigator.of(dialogContext).pop();
                try {
                  final repo = ref.read(goalRepositoryProvider);
                  await repo.createSubGoal(
                    goal.id,
                    name: name,
                    priority: selectedPriority,
                    sport: goal.sport,
                  );
                  ref.invalidate(goalDetailProvider(goal.id));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(s.goalSubGoalCreated)),
                    );
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(s.goalSubGoalCreateFailed(e.toString())),
                      ),
                    );
                  }
                }
              },
              child: Text(s.actionSave),
            ),
          ],
        ),
      ),
    );
  }
}

class _GoalHeader extends StatelessWidget {
  const _GoalHeader({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    goal.name,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    raceTypeLabel(goal.raceType ?? RaceType.customDistance),
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.event,
                  size: 18,
                  color: AppColors.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Text(
                  _formatDate(goal.raceDate ?? goal.createdAt),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                if (goal.targetTime != null) ...[
                  const SizedBox(width: 20),
                  const Icon(
                    Icons.timer,
                    size: 18,
                    color: AppColors.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    formatDuration(goal.targetTime!),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
            if (goal.currentVdot != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.favorite,
                    size: 18,
                    color: AppColors.error,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    S.of(context).goalVdotValue(goal.currentVdot!.toStringAsFixed(1)),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  if (goal.predictedTime != null) ...[
                    const SizedBox(width: 20),
                    const Icon(
                      Icons.timeline,
                      size: 18,
                      color: AppColors.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      S.of(context).goalPredictedTime(formatDuration(goal.predictedTime!)),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ],
            const SizedBox(height: 8),
            Wrap(
              spacing: 14,
              runSpacing: 6,
              children: _buildPlanMetadata(context, theme),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildPlanMetadata(BuildContext context, ThemeData theme) {
    final s = S.of(context);
    final items = <Widget>[];

    if (goal.weeklyMileageGoal != null && goal.weeklyMileageGoal! > 0) {
      items.add(_planMetadataChip(
        Icons.straighten,
        s.goalWeeklyMileageDisplay(goal.weeklyMileageGoal!.toStringAsFixed(0)),
        theme,
      ));
    }

    items.add(_planMetadataChip(
      Icons.schedule,
      s.onboardingWeeksCount(goal.planWeeks),
      theme,
    ));

    items.add(_planMetadataChip(
      Icons.directions_run,
      s.goalRunsPerWeekDisplay(goal.runsPerWeek),
      theme,
    ));

    final phase = _deriveCurrentPhase();
    if (phase != null) {
      items.add(_planMetadataChip(
        Icons.fitness_center,
        _phaseLabel(phase, s),
        theme,
        isHighlighted: true,
      ));
    }

    return items;
  }

  Widget _planMetadataChip(
    IconData icon,
    String label,
    ThemeData theme, {
    bool isHighlighted = false,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 16,
          color: isHighlighted ? AppColors.primary : AppColors.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: isHighlighted ? AppColors.primary : AppColors.onSurfaceVariant,
            fontWeight: isHighlighted ? FontWeight.w600 : null,
          ),
        ),
      ],
    );
  }

  String? _deriveCurrentPhase() {
    final now = DateTime.now();
    Workout? closest;
    for (final w in goal.workouts) {
      if (w.phase == null || w.phase!.isEmpty) continue;
      if (closest == null ||
          w.scheduledDate.difference(now).abs() <
              closest.scheduledDate.difference(now).abs()) {
        closest = w;
      }
    }
    return closest?.phase;
  }

  String _phaseLabel(String phase, S s) {
    switch (phase.toUpperCase()) {
      case 'BASE':
        return s.trainingPhaseBase;
      case 'BUILD':
        return s.trainingPhaseBuild;
      case 'PEAK':
        return s.trainingPhasePeak;
      case 'TAPER':
        return s.trainingPhaseTaper;
      case 'RACE':
        return s.trainingPhaseRace;
      case 'RECOVERY':
        return s.trainingPhaseRecovery;
      default:
        return phase;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

class _RaceCountdownCard extends StatelessWidget {
  const _RaceCountdownCard({
    required this.daysUntilRace,
    required this.progress,
    required this.completedWorkouts,
    required this.totalWorkouts,
  });

  final int daysUntilRace;
  final double progress;
  final int completedWorkouts;
  final int totalWorkouts;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(
                    value: progress.clamp(0.0, 1.0),
                    strokeWidth: 6,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.primary,
                    ),
                  ),
                  Center(
                    child: Text(
                      daysUntilRace > 0 ? '$daysUntilRace' : '0',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    daysUntilRace > 0 ? S.of(context).goalDaysToRaceDay : S.of(context).planRaceDay,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: daysUntilRace > 0
                          ? null
                          : AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    S.of(context).goalWorkoutsCompletedCount(completedWorkouts, totalWorkouts),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    S.of(context).goalPercentComplete((progress * 100).toStringAsFixed(0)),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkoutCard extends ConsumerWidget {
  const _WorkoutCard({
    required this.workout,
    required this.goalId,
  });

  final Workout workout;
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final color = WorkoutTheme.color(workout.workoutType);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(
                WorkoutTheme.icon(workout.workoutType),
                color: color,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          WorkoutTheme.label(context, workout.workoutType),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatDate(workout.scheduledDate),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    workout.description,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (workout.targetDistance > 0) ...[
                        const Icon(
                          Icons.straighten,
                          size: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatDistance(workout.targetDistance),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (workout.targetPace > 0) ...[
                        const Icon(
                          Icons.speed,
                          size: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatPace(workout.targetPace),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _CompletionCheckbox(
              workout: workout,
              goalId: goalId,
              color: color,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
  }
}

class _CompletionCheckbox extends ConsumerStatefulWidget {
  const _CompletionCheckbox({
    required this.workout,
    required this.goalId,
    required this.color,
  });

  final Workout workout;
  final String goalId;
  final Color color;

  @override
  ConsumerState<_CompletionCheckbox> createState() =>
      _CompletionCheckboxState();
}

class _CompletionCheckboxState extends ConsumerState<_CompletionCheckbox> {
  late bool _isCompleted;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _isCompleted = widget.workout.isCompleted;
  }

  @override
  void didUpdateWidget(covariant _CompletionCheckbox oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.workout.isCompleted != widget.workout.isCompleted) {
      _isCompleted = widget.workout.isCompleted;
    }
  }

  Future<void> _toggle() async {
    if (_isUpdating) return;
    final previousState = _isCompleted;
    setState(() {
      _isCompleted = !_isCompleted;
      _isUpdating = true;
    });

    try {
      final repo = ref.read(goalRepositoryProvider);
      await repo.updateWorkout(
        widget.workout.id,
        UpdateWorkoutRequest(isCompleted: _isCompleted),
      );
      ref.invalidate(goalDetailProvider(widget.goalId));
    } catch (_) {
      if (mounted) {
        setState(() {
          _isCompleted = previousState;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).goalFailedToUpdateWorkout)),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUpdating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggle,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _isCompleted ? widget.color : Colors.transparent,
          border: Border.all(
            color: _isCompleted ? widget.color : AppColors.onSurfaceVariant,
            width: 2,
          ),
        ),
        child: _isUpdating
            ? const Padding(
                padding: EdgeInsets.all(6),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.onPrimary,
                ),
              )
            : _isCompleted
                ? const Icon(
                    Icons.check,
                    size: 16,
                    color: AppColors.onPrimary,
                  )
                : null,
      ),
    );
  }
}

class _GoalDetailError extends StatelessWidget {
  const _GoalDetailError({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              S.of(context).statusError,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(S.of(context).actionRetry),
            ),
          ],
        ),
      ),
    );
  }
}
