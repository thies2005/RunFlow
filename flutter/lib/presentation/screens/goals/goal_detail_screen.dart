import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class GoalDetailScreen extends ConsumerWidget {
  const GoalDetailScreen({required this.goalId, super.key});

  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalAsync = ref.watch(goalDetailProvider(goalId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Goal Details'),
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
        title: const Text('Delete Goal'),
        content: const Text('Are you sure you want to delete this goal? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
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
                    SnackBar(content: Text('Failed to delete goal: $e')),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Delete'),
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
    final daysUntilRace = goal.raceDate.difference(DateTime.now()).inDays;
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
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Workouts',
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
                  'No workouts scheduled yet',
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
                    raceTypeLabel(goal.raceType),
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
                  _formatDate(goal.raceDate),
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
                    'VDOT: ${goal.currentVdot!.toStringAsFixed(1)}',
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
                      'Predicted: ${formatDuration(goal.predictedTime!)}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
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
                    backgroundColor: AppColors.surfaceDarkVariant,
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
                    daysUntilRace > 0 ? 'days to race day' : 'Race day!',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: daysUntilRace > 0
                          ? null
                          : AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$completedWorkouts of $totalWorkouts workouts completed',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}% complete',
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

  Color _workoutColor() {
    switch (workout.workoutType) {
      case WorkoutType.easy:
        return AppColors.success;
      case WorkoutType.long:
        return const Color(0xFF2196F3);
      case WorkoutType.tempo:
        return const Color(0xFFFF9800);
      case WorkoutType.interval:
        return const Color(0xFFF44336);
      case WorkoutType.recovery:
        return const Color(0xFF009688);
      case WorkoutType.race:
        return const Color(0xFF9C27B0);
      case WorkoutType.other:
        return AppColors.onSurfaceVariant;
    }
  }

  IconData _workoutIcon() {
    switch (workout.workoutType) {
      case WorkoutType.easy:
        return Icons.directions_run;
      case WorkoutType.long:
        return Icons.route;
      case WorkoutType.tempo:
        return Icons.speed;
      case WorkoutType.interval:
        return Icons.flash_on;
      case WorkoutType.recovery:
        return Icons.self_improvement;
      case WorkoutType.race:
        return Icons.emoji_events;
      case WorkoutType.other:
        return Icons.fitness_center;
    }
  }

  String _workoutLabel() {
    switch (workout.workoutType) {
      case WorkoutType.easy:
        return 'Easy';
      case WorkoutType.long:
        return 'Long';
      case WorkoutType.tempo:
        return 'Tempo';
      case WorkoutType.interval:
        return 'Interval';
      case WorkoutType.recovery:
        return 'Recovery';
      case WorkoutType.race:
        return 'Race';
      case WorkoutType.other:
        return 'Other';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final color = _workoutColor();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(
                _workoutIcon(),
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
                          _workoutLabel(),
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
          const SnackBar(content: Text('Failed to update workout')),
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
              'Something went wrong',
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
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
