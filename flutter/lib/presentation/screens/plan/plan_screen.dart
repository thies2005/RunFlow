import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const _PlanSkeleton(),
      error: (error, _) => _PlanError(
        message: error.toString(),
        onRetry: () => ref.invalidate(dashboardProvider),
      ),
      data: (dashboard) {
        final activeGoal = dashboard.goals.where((g) => g.isActive).firstOrNull;
        
        if (activeGoal == null) {
          return _NoPlanState(
            onCreateGoal: () => context.go('/goals/new'),
          );
        }
        
        return _PlanContent(goal: activeGoal);
      },
    );
  }
}

class _PlanContent extends ConsumerWidget {
  const _PlanContent({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
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
          IconButton(
            icon: const Icon(Icons.list),
            onPressed: () => context.go('/goals/${goal.id}'),
            tooltip: 'Goal details',
          ),
        ],
      ),
      body: ListView(
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
                        daysUntilRace > 0 ? '$daysUntilRace days to go' : 'Race day!',
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
                              'workouts done',
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
                              backgroundColor: AppColors.surfaceDarkVariant,
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
            child: Text(
              'Training Plan',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
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
                    'No workouts scheduled yet',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            )
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
                          _formatDateHeader(date),
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
                              'TODAY',
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
    );
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  String _formatDateHeader(DateTime date) {
    final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
                            _workoutLabel(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (workout.isCompleted) ...[
                          const SizedBox(width: 8),
                          Text(
                            'Completed',
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
                            '${workout.targetDistance.toStringAsFixed(1)} km',
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
              title: const Text('Edit Workout'),
              onTap: () {
                Navigator.pop(ctx);
                _showEditModal(context, ref);
              },
            ),
            if (!workout.isCompleted)
              ListTile(
                leading: const Icon(Icons.play_arrow),
                title: const Text('Start Workout'),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/record?workoutId=${workout.id}');
                },
              ),
            if (!workout.isCompleted)
              ListTile(
                leading: const Icon(Icons.check),
                title: const Text('Mark Complete'),
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
                      ),
                    );
                    ref.invalidate(dashboardProvider);
                  } catch (_) {}
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
          } catch (_) {}
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

  String _workoutLabel() {
    return switch (workout.workoutType) {
      WorkoutType.easy => 'Easy',
      WorkoutType.long => 'Long',
      WorkoutType.tempo => 'Tempo',
      WorkoutType.interval => 'Interval',
      WorkoutType.recovery => 'Recovery',
      WorkoutType.race => 'Race',
      WorkoutType.other => 'Other',
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
      appBar: AppBar(title: const Text('Plan')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today_outlined, size: 64, color: AppColors.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'No Active Plan',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Create a training goal to get your personalized plan.',
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onCreateGoal,
                icon: const Icon(Icons.add),
                label: const Text('Create Goal'),
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
      appBar: AppBar(title: const Text('Plan')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text('Something went wrong', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(message, style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
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
      appBar: AppBar(title: const Text('Plan')),
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
    _distanceController = TextEditingController(text: widget.workout.targetDistance.toStringAsFixed(1));
    _paceController = TextEditingController(text: widget.workout.targetPace.toStringAsFixed(0));
    _durationController = TextEditingController(text: widget.workout.targetDuration.toString());
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
              'Edit Workout',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<WorkoutType>(
              initialValue: _selectedType,
              decoration: const InputDecoration(labelText: 'Workout Type'),
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
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _distanceController,
              decoration: const InputDecoration(labelText: 'Target Distance (km)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _durationController,
              decoration: const InputDecoration(labelText: 'Target Duration (min)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  widget.onSave(UpdateWorkoutRequest(
                    description: _descController.text,
                    targetDistance: double.tryParse(_distanceController.text) ?? widget.workout.targetDistance,
                    targetPace: widget.workout.targetPace,
                    targetDuration: int.tryParse(_durationController.text) ?? widget.workout.targetDuration,
                    workoutType: _selectedType,
                  ));
                },
                child: const Text('Save'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}