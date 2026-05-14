import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalsAsync = ref.watch(goalsProvider);

    return goalsAsync.when(
      loading: () => const _PlanSkeleton(),
      error: (error, _) => _PlanError(
        message: error.toString(),
        onRetry: () => ref.invalidate(goalsProvider),
      ),
      data: (goalsResponse) {
        final activeGoal = goalsResponse.goals.where((g) => g.isActive).firstOrNull;
        
        if (activeGoal == null) {
          return _NoPlanState(
            onCreateGoal: () => context.push('/goals/new'),
          );
        }
        
        return _PlanContent(goal: activeGoal);
      },
    );
  }
}

class _PlanContent extends ConsumerStatefulWidget {
  const _PlanContent({required this.goal});

  final Goal goal;

  @override
  ConsumerState<_PlanContent> createState() => _PlanContentState();
}

class _PlanContentState extends ConsumerState<_PlanContent> {
  bool _reorderMode = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goal = widget.goal;
    final daysUntilRace = goal.raceDate.difference(DateTime.now()).inDays;
    final completedWorkouts = goal.workouts.where((w) => w.isCompleted).length;
    final totalWorkouts = goal.workouts.length;
    final progress = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0.0;

    final workoutsByDate = <DateTime, List<Workout>>{};
    for (final w in goal.workouts) {
      final date = DateTime(w.scheduledDate.year, w.scheduledDate.month, w.scheduledDate.day);
      workoutsByDate.putIfAbsent(date, () => []).add(w);
    }
    final sortedDates = workoutsByDate.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: Text(goal.name),
        actions: [
          if (!_reorderMode)
            FilledButton.tonal(
              onPressed: () => setState(() => _reorderMode = true),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.swap_vert, size: 18),
                const SizedBox(width: 4),
                Text(S.of(context).planReorderWorkouts, style: const TextStyle(fontSize: 13)),
              ]),
            ),
          if (!_reorderMode)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: OutlinedButton(
                onPressed: () => context.push('/goals/${goal.id}'),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.info_outline, size: 16),
                  const SizedBox(width: 4),
                  Text(S.of(context).planGoalDetailsTooltip, style: const TextStyle(fontSize: 13)),
                ]),
              ),
            ),
          if (!_reorderMode)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'delete') {
                  _confirmDelete();
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'delete',
                  child: ListTile(
                    leading: const Icon(Icons.delete_outline, color: AppColors.error),
                    title: Text(S.of(context).actionDelete),
                  ),
                ),
              ],
            ),
          if (_reorderMode)
            TextButton(
              onPressed: () => setState(() => _reorderMode = false),
              child: Text(S.of(context).actionDone),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(goalsProvider);
          ref.invalidate(dashboardProvider);
          await ref.read(goalsProvider.future);
        },
        child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          raceTypeLabel(goal.raceType),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        daysUntilRace > 0 ? S.of(context).planDaysToGo(daysUntilRace) : S.of(context).planRaceDay,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: daysUntilRace > 0 ? AppColors.onSurfaceVariant : AppColors.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$completedWorkouts/$totalWorkouts',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              S.of(context).planWorkoutsDone,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        width: 60,
                        height: 60,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CircularProgressIndicator(
                              value: progress,
                              strokeWidth: 6,
                              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                            Center(
                              child: Text(
                                '${(progress * 100).toInt()}%',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    S.of(context).planTrainingPlanTitle,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (_reorderMode)
                  Text(
                    S.of(context).planDragWorkoutsToReorder,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (goal.workouts.isEmpty)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
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
          else if (_reorderMode)
            _buildReorderableList(sortedDates, workoutsByDate)
          else
            ...sortedDates.map((date) {
              final dayWorkouts = workoutsByDate[date]!;
              final isToday = _isToday(date);
              final isPast = date.isBefore(DateTime.now());

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, isToday ? 12 : 8, 16, 4),
                    child: Row(
                      children: [
                        Text(
                          _formatDateHeader(context, date),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: isToday ? AppColors.primary : (isPast ? AppColors.onSurfaceVariant : theme.textTheme.bodyMedium?.color),
                            fontWeight: isToday ? FontWeight.w600 : FontWeight.w500,
                          ),
                        ),
                        if (isToday) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              S.of(context).planToday,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: AppColors.onPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  ...dayWorkouts.map((workout) => _PlanWorkoutCard(
                    workout: workout,
                    goalId: goal.id,
                    isToday: isToday,
                  )),
                ],
              );
            }),
        ],
      ),
      ),
    );
  }

  void _confirmDelete() {
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
                await ref.read(goalsProvider.notifier).deleteGoal(widget.goal.id);
                if (mounted) context.go('/dashboard');
              } catch (e) {
                if (mounted) {
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

  Widget _buildReorderableList(
    List<DateTime> sortedDates,
    Map<DateTime, List<Workout>> workoutsByDate,
  ) {
    final theme = Theme.of(context);
    final allWorkouts = <Workout>[];
    for (final date in sortedDates) {
      allWorkouts.addAll(workoutsByDate[date]!);
    }

    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: allWorkouts.length,
      onReorder: (oldIndex, newIndex) {
        if (newIndex > oldIndex) newIndex--;
        if (oldIndex == newIndex) return;

        setState(() {
          final workout = allWorkouts.removeAt(oldIndex);
          allWorkouts.insert(newIndex, workout);
        });

        final reorderedIds = allWorkouts.map((w) => w.id).toList();
        _persistReorder(reorderedIds, sortedDates);
      },
      proxyDecorator: (child, index, animation) {
        return AnimatedBuilder(
          animation: animation,
          builder: (context, child) {
            final double scale = 1.0 + (animation.value * 0.05);
            return Transform.scale(
              scale: scale,
              child: Opacity(opacity: 0.9, child: child),
            );
          },
          child: child,
        );
      },
      itemBuilder: (context, index) {
        final workout = allWorkouts[index];
        return Card(
          key: ValueKey(workout.id),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: ListTile(
            leading: const Icon(Icons.drag_handle, color: AppColors.onSurfaceVariant),
            title: Text(
              workout.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              '${formatDistance(workout.targetDistance)} · ${formatPace(workout.targetPace)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _persistReorder(
    List<String> workoutIds,
    List<DateTime> sortedDates,
  ) async {
    final workoutsPerDate = sortedDates.length;
    if (workoutsPerDate == 0) return;

    for (var i = 0; i < workoutIds.length; i++) {
      final dateIndex = (i * workoutsPerDate / workoutIds.length).floor();
      final targetDate = dateIndex < sortedDates.length
          ? sortedDates[dateIndex]
          : sortedDates.last;
      try {
        await ref
            .read(goalsProvider.notifier)
            .reorderWorkout(workoutIds[i], targetDate);
      } catch (e) {
        logger.error('[PlanScreen] Reorder failed for ${workoutIds[i]}: $e');
      }
    }
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatDateHeader(BuildContext context, DateTime date) {
    final s = S.of(context);
    final weekdays = [s.dayMon, s.dayTue, s.dayWed, s.dayThu, s.dayFri, s.daySat, s.daySun];
    final months = [s.monthJan, s.monthFeb, s.monthMar, s.monthApr, s.monthMay, s.monthJun, s.monthJul, s.monthAug, s.monthSep, s.monthOct, s.monthNov, s.monthDec];
    return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
  }
}

class _PlanWorkoutCard extends ConsumerWidget {
  const _PlanWorkoutCard({
    required this.workout,
    required this.goalId,
    required this.isToday,
  });

  final Workout workout;
  final String goalId;
  final bool isToday;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final color = _workoutColor();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: () => _showWorkoutActions(context, ref),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: workout.isCompleted
                    ? AppColors.success.withValues(alpha: 0.15)
                    : color.withValues(alpha: 0.15),
                child: Icon(
                  workout.isCompleted ? Icons.check : _workoutIcon(),
                  color: workout.isCompleted ? AppColors.success : color,
                  size: 18,
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
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            _workoutLabel(context),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (workout.isCompleted) ...[
                          const SizedBox(width: 8),
                          Text(
                             S.of(context).statusCompleted,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.success,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      workout.description,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                        decoration: workout.isCompleted ? TextDecoration.lineThrough : null,
                        color: workout.isCompleted ? AppColors.onSurfaceVariant : null,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (workout.targetDistance > 0) ...[
                          const Icon(Icons.straighten, size: 14, color: AppColors.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            formatDistance(workout.targetDistance),
                            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (workout.targetPace > 0) ...[
                          const Icon(Icons.speed, size: 14, color: AppColors.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            formatPace(workout.targetPace),
                            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  void _showWorkoutActions(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: Text(S.of(context).planEditWorkoutTitle),
              onTap: () {
                Navigator.pop(ctx);
                _showEditModal(context, ref);
              },
            ),
            if (!workout.isCompleted)
              ListTile(
                leading: const Icon(Icons.play_arrow),
                title: Text(S.of(context).planStartWorkoutAction),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/record?workoutId=${workout.id}');
                },
              ),
            if (!workout.isCompleted)
              ListTile(
                leading: const Icon(Icons.check),
                title: Text(S.of(context).planMarkComplete),
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    await ref.read(goalRepositoryProvider).updateWorkout(
                      workout.id,
                      UpdateWorkoutRequest(
                        description: workout.description,
                        targetDistance: workout.targetDistance,
                        targetPace: workout.targetPace,
                        targetDuration: workout.targetDuration,
                        workoutType: workout.workoutType,
                        isCompleted: true,
                      ),
                    );
                    ref.invalidate(dashboardProvider);
                  } catch (e) {
                    logger.error('[_PlanWorkoutCard] Mark complete failed: $e');
                  }
                },
              ),
          ],
        ),
      ),
    );
  }

  void _showEditModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _EditWorkoutSheet(
        workout: workout,
        goalId: goalId,
        onSave: (updatedWorkout) async {
          try {
            await ref.read(goalRepositoryProvider).updateWorkout(
              workout.id,
              updatedWorkout,
            );
            ref.invalidate(dashboardProvider);
            if (context.mounted) Navigator.pop(ctx);
          } catch (e) {
            logger.error('[_PlanWorkoutCard] Edit workout failed: $e');
          }
        },
      ),
    );
  }

  Color _workoutColor() {
    return switch (workout.workoutType) {
      WorkoutType.easy => AppColors.success,
      WorkoutType.long => const Color(0xFF2196F3),
      WorkoutType.tempo => const Color(0xFFFF9800),
      WorkoutType.interval => const Color(0xFFF44336),
      WorkoutType.recovery => const Color(0xFF009688),
      WorkoutType.race => const Color(0xFF9C27B0),
      WorkoutType.other => AppColors.onSurfaceVariant,
    };
  }

  IconData _workoutIcon() {
    return switch (workout.workoutType) {
      WorkoutType.easy => Icons.directions_run,
      WorkoutType.long => Icons.route,
      WorkoutType.tempo => Icons.speed,
      WorkoutType.interval => Icons.flash_on,
      WorkoutType.recovery => Icons.self_improvement,
      WorkoutType.race => Icons.emoji_events,
      WorkoutType.other => Icons.fitness_center,
    };
  }

  String _workoutLabel(BuildContext context) {
    final s = S.of(context);
    return switch (workout.workoutType) {
      WorkoutType.easy => s.workoutTypeEasy,
      WorkoutType.long => s.workoutTypeLong,
      WorkoutType.tempo => s.workoutTypeTempo,
      WorkoutType.interval => s.workoutTypeInterval,
      WorkoutType.recovery => s.workoutTypeRecovery,
      WorkoutType.race => s.workoutTypeRace,
      WorkoutType.other => s.workoutTypeOther,
    };
  }
}

class _NoPlanState extends StatelessWidget {
  const _NoPlanState({required this.onCreateGoal});

  final VoidCallback onCreateGoal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(S.of(context).navPlan)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today_outlined, size: 64, color: AppColors.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                S.of(context).planNoActivePlan,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                S.of(context).planCreateTrainingGoal,
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onCreateGoal,
                icon: const Icon(Icons.add),
                label: Text(S.of(context).planCreateGoal),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlanError extends StatelessWidget {
  const _PlanError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(S.of(context).navPlan)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text(S.of(context).statusError, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(message, style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: Text(S.of(context).actionRetry)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlanSkeleton extends StatelessWidget {
  const _PlanSkeleton();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Scaffold(
      appBar: AppBar(title: Text(S.of(context).navPlan)),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 80,
                        height: 16,
                        decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4)),
                      ),
                      const Spacer(),
                      Container(width: 80, height: 12, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(width: 60, height: 24, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
                      const Spacer(),
                      Container(width: 50, height: 50, decoration: BoxDecoration(shape: BoxShape.circle, color: c)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(width: 120, height: 18, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
          ),
          const SizedBox(height: 8),
          ...List.filled(3, Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  CircleAvatar(radius: 18, backgroundColor: c),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(width: 60, height: 12, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
                        const SizedBox(height: 4),
                        Container(width: 120, height: 14, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )),
         ],
       ),
     );
  }
}

class _EditWorkoutSheet extends StatefulWidget {
  const _EditWorkoutSheet({
    required this.workout,
    required this.goalId,
    required this.onSave,
  });

  final Workout workout;
  final String goalId;
  final Future<void> Function(UpdateWorkoutRequest) onSave;

  @override
  State<_EditWorkoutSheet> createState() => _EditWorkoutSheetState();
}

class _EditWorkoutSheetState extends State<_EditWorkoutSheet> {
  late TextEditingController _descController;
  late TextEditingController _distanceController;
  late TextEditingController _paceController;
  late TextEditingController _durationController;
  WorkoutType _selectedType = WorkoutType.easy;

  @override
  void initState() {
    super.initState();
    _descController = TextEditingController(text: widget.workout.description);
    _distanceController = TextEditingController(text: (widget.workout.targetDistance / 1000).toStringAsFixed(1));
    _paceController = TextEditingController(text: widget.workout.targetPace.toStringAsFixed(0));
    _durationController = TextEditingController(text: (widget.workout.targetDuration ~/ 60).toString());
    _selectedType = widget.workout.workoutType;
  }

  @override
  void dispose() {
    _descController.dispose();
    _distanceController.dispose();
    _paceController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  String? _getSuggestedValue() {
    final distanceKm = _distanceController.text.isNotEmpty
        ? double.tryParse(_distanceController.text)
        : null;
    final paceSecKm = _paceController.text.isNotEmpty
        ? double.tryParse(_paceController.text)
        : null;
    final durationMin = _durationController.text.isNotEmpty
        ? double.tryParse(_durationController.text)
        : null;

    if (distanceKm != null && distanceKm > 0 && paceSecKm != null && paceSecKm > 0 && durationMin == null) {
      final suggested = (distanceKm * paceSecKm / 60).round();
      return 'duration:$suggested';
    } else if (distanceKm != null && distanceKm > 0 && durationMin != null && durationMin > 0 && paceSecKm == null) {
      final suggested = (durationMin * 60 / distanceKm).round();
      return 'pace:$suggested';
    } else if (paceSecKm != null && paceSecKm > 0 && durationMin != null && durationMin > 0 && distanceKm == null) {
      final suggested = (durationMin * 60 / paceSecKm).toStringAsFixed(1);
      return 'distance:$suggested';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              S.of(context).planEditWorkoutTitle,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<WorkoutType>(
              initialValue: _selectedType,
              decoration: InputDecoration(labelText: S.of(context).planWorkoutType),
              items: WorkoutType.values.map((type) => DropdownMenuItem(
                value: type,
                child: Text(type.name.toUpperCase()),
              )).toList(),
              onChanged: (value) {
                if (value != null) setState(() => _selectedType = value);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              decoration: InputDecoration(labelText: S.of(context).planDescription),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _distanceController,
              decoration: InputDecoration(labelText: S.of(context).planTargetDistanceKm),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _paceController,
              decoration: InputDecoration(labelText: S.of(context).planTargetPaceSecKm),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _durationController,
              decoration: InputDecoration(labelText: S.of(context).planTargetDurationMin),
              keyboardType: TextInputType.number,
            ),
            ListenableBuilder(
              listenable: Listenable.merge([_distanceController, _paceController, _durationController]),
              builder: (context, _) {
                final suggestion = _getSuggestedValue();
                if (suggestion == null) return const SizedBox.shrink();
                final s = S.of(context);
                String text;
                if (suggestion.startsWith('duration:')) {
                  text = s.planSuggestedDurationMin(suggestion.substring(9));
                } else if (suggestion.startsWith('pace:')) {
                  text = s.planSuggestedPaceSecKm(suggestion.substring(5));
                } else {
                  text = s.planSuggestedDistanceKm(suggestion.substring(9));
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    text,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  widget.onSave(UpdateWorkoutRequest(
                    description: _descController.text,
                    targetDistance: (double.tryParse(_distanceController.text) ?? 0) * 1000,
                    targetPace: double.tryParse(_paceController.text) ?? 0,
                    targetDuration: (int.tryParse(_durationController.text) ?? 0) * 60,
                    workoutType: _selectedType,
                  ));
                },
                child: Text(S.of(context).actionSave),
              ),
            ),
          ],
        ),
      ),
    );
  }
}