import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/widgets/race_countdown_card.dart';
import 'package:runflow_flutter/presentation/widgets/training_status_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('RunFlow'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              ref.read(dashboardProvider.notifier).triggerSync();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
        child: dashboardAsync.when(
          loading: () => const _DashboardSkeleton(),
          error: (error, _) => _DashboardError(
            message: error.toString(),
            onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
          ),
          data: (data) => _DashboardContent(data: data),
        ),
      ),
    );
  }
}

class _DashboardContent extends ConsumerWidget {
  const _DashboardContent({required this.data});

  final DashboardResponse data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _StatsCard(stats: data.stats, syncStatus: data.syncStatus),
        const SizedBox(height: 16),
        const RaceCountdownCard(),
        const SizedBox(height: 16),
        const TrainingStatusCard(),
        if (data.todayWorkout != null) ...[
          const SizedBox(height: 16),
          _TodayWorkoutCard(workout: data.todayWorkout!),
        ],
        const SizedBox(height: 16),
        _RecentActivitiesSection(activities: data.recentActivities),
        const SizedBox(height: 16),
        const _SyncStatusCard(),
      ],
    );
  }
}

class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.stats, required this.syncStatus});

  final AnalyticsStats stats;
  final SyncStatus syncStatus;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: () => context.push('/analytics'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'This Week',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: AppColors.onSurfaceVariant,
                  ),
                ],
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    label: 'Weekly Mileage',
                    value: '${stats.currentWeekMileage.toStringAsFixed(1)} km',
                    icon: Icons.straighten,
                    color: AppColors.primary,
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    label: 'Activities',
                    value: '${syncStatus.totalActivities}',
                    icon: Icons.directions_run,
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
                    label: 'VO2max',
                    value: stats.effectiveVO2max.toStringAsFixed(1),
                    icon: Icons.favorite,
                    color: AppColors.error,
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    label: 'TSB',
                    value: stats.tsb.toStringAsFixed(1),
                    icon: Icons.battery_charging_full,
                    color: _tsbColor(stats.tsb),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatItem(
                    label: 'CTL (Fitness)',
                    value: stats.ctl.toStringAsFixed(1),
                    icon: Icons.trending_up,
                    color: AppColors.success,
                  ),
                ),
                Expanded(
                  child: _StatItem(
                    label: 'ATL (Fatigue)',
                    value: stats.atl.toStringAsFixed(1),
                    icon: Icons.trending_down,
                    color: AppColors.fatigued,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      ),
    );
  }

  Color _tsbColor(double tsb) {
    if (tsb >= 25) return AppColors.peaked;
    if (tsb >= 5) return AppColors.fresh;
    if (tsb >= -10) return AppColors.neutral;
    if (tsb >= -30) return AppColors.fatigued;
    return AppColors.veryFatigued;
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _TodayWorkoutCard extends ConsumerWidget {
  const _TodayWorkoutCard({required this.workout});

  final Workout workout;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: () => _showStartWorkoutDialog(context, ref, workout),
        borderRadius: BorderRadius.circular(12),
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
                      workout.isCompleted ? 'Completed' : "Today's Workout",
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: workout.isCompleted ? AppColors.success : AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (!workout.isCompleted)
                    IconButton(
                      icon: const Icon(Icons.swap_horiz, size: 20),
                      onPressed: () => _showWorkoutSwitcher(context, ref),
                      tooltip: 'Switch workout',
                      color: AppColors.onSurfaceVariant,
                    ),
                  const Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: AppColors.onSurfaceVariant,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                    child: Icon(
                      _workoutTypeIcon(workout.workoutType),
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          workout.description,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _workoutDetails(workout),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatItem(
                      label: 'Target Distance',
                      value: '${workout.targetDistance.toStringAsFixed(1)} km',
                      icon: Icons.straighten,
                      color: AppColors.primary,
                    ),
                  ),
                  Expanded(
                    child: _StatItem(
                      label: 'Target Pace',
                      value: formatPace(workout.targetPace),
                      icon: Icons.speed,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showWorkoutSwitcher(BuildContext context, WidgetRef ref) {
    final goals = ref.read(goalsProvider).value;
    if (goals == null) return;

    final pendingWorkouts = <Workout>[];
    for (final goal in goals.goals) {
      for (final w in goal.workouts) {
        if (!w.isCompleted) {
          pendingWorkouts.add(w);
        }
      }
    }

    pendingWorkouts.sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));

    if (pendingWorkouts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No pending workouts available')),
      );
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      builder: (context) => _WorkoutSwitcherSheet(
        workouts: pendingWorkouts,
        currentWorkoutId: workout.id,
        onSelect: (selected) async {
          Navigator.pop(context);
          if (selected.id == workout.id) return;

          logger.log('Switching workout from ${workout.id} to ${selected.id}');

          try {
            await ref.read(goalRepositoryProvider).updateWorkout(
              workout.id,
              UpdateWorkoutRequest(
                description: selected.description,
                targetDistance: selected.targetDistance,
                targetPace: selected.targetPace,
                targetDuration: selected.targetDuration,
                workoutType: selected.workoutType,
              ),
            );
            ref.invalidate(dashboardProvider);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Workout updated')),
              );
            }
          } catch (e) {
            logger.log('Failed to switch workout: $e');
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Failed to update: $e')),
              );
            }
          }
        },
      ),
    );
  }

  void _showStartWorkoutDialog(BuildContext context, WidgetRef ref, Workout workout) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Start ${workout.description}?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${workout.workoutType.name.toUpperCase()} · ${workout.targetDistance.toStringAsFixed(1)} km'),
            if (workout.targetPace > 0) Text('Target Pace: ${formatPace(workout.targetPace)}'),
            const SizedBox(height: 12),
            const Text('This will start recording your workout with GPS tracking.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.push('/record?workoutId=${workout.id}');
            },
            child: const Text('Start Workout'),
          ),
        ],
      ),
    );
  }

  IconData _workoutTypeIcon(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => Icons.directions_run,
      WorkoutType.long => Icons.route,
      WorkoutType.tempo => Icons.timer,
      WorkoutType.interval => Icons.flash_on,
      WorkoutType.recovery => Icons.healing,
      WorkoutType.race => Icons.flag,
      WorkoutType.other => Icons.fitness_center,
    };
  }

  String _workoutDetails(Workout workout) {
    final parts = <String>[];
    parts.add(workout.workoutType.name.toUpperCase());
    if (workout.targetDuration > 0) {
      parts.add(formatDuration(workout.targetDuration));
    }
    return parts.join(' · ');
  }
}

class _WorkoutSwitcherSheet extends StatelessWidget {
  const _WorkoutSwitcherSheet({
    required this.workouts,
    required this.currentWorkoutId,
    required this.onSelect,
  });

  final List<Workout> workouts;
  final String currentWorkoutId;
  final void Function(Workout) onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Switch Workout',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Select a different workout to replace today\'s workout',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          ...workouts.map((w) => ListTile(
            leading: CircleAvatar(
              backgroundColor: w.id == currentWorkoutId
                  ? AppColors.primary.withValues(alpha: 0.15)
                  : AppColors.surfaceDarkVariant,
              child: Icon(
                _workoutTypeIcon(w.workoutType),
                color: w.id == currentWorkoutId
                    ? AppColors.primary
                    : AppColors.onSurfaceVariant,
                size: 20,
              ),
            ),
            title: Text(
              w.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: w.id == currentWorkoutId ? FontWeight.w600 : null,
              ),
            ),
            subtitle: Text(
              '${w.workoutType.name.toUpperCase()} · ${w.targetDistance.toStringAsFixed(1)} km',
              style: theme.textTheme.bodySmall,
            ),
            trailing: w.id == currentWorkoutId
                ? const Icon(Icons.check, color: AppColors.primary)
                : null,
            onTap: () => onSelect(w),
          )),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  IconData _workoutTypeIcon(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => Icons.directions_run,
      WorkoutType.long => Icons.route,
      WorkoutType.tempo => Icons.timer,
      WorkoutType.interval => Icons.flash_on,
      WorkoutType.recovery => Icons.healing,
      WorkoutType.race => Icons.flag,
      WorkoutType.other => Icons.fitness_center,
    };
  }
}

class _RecentActivitiesSection extends StatelessWidget {
  const _RecentActivitiesSection({required this.activities});

  final List<Activity> activities;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayed = activities.take(5).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Recent Activities',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (displayed.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No activities yet',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          )
        else
          ...displayed.map((activity) => _ActivityTile(activity: activity)),
      ],
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.activity});

  final Activity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
          child: Icon(
            activityTypeIcon(activity.type),
            color: AppColors.primary,
            size: 20,
          ),
        ),
        title: Text(
          activity.name,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${formatDistance(activity.distance)} · ${formatDuration(activity.movingTime)}${pace != null ? ' · ${formatPace(pace)}' : ''}',
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        trailing: Text(
          formatRelativeDate(activity.startDate),
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        onTap: () => context.push('/activities/${activity.id}'),
      ),
    );
  }
}

class _SyncStatusCard extends ConsumerWidget {
  const _SyncStatusCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final syncStatus = ref.watch(
      dashboardProvider.select((s) => s.value?.syncStatus),
    );

    if (syncStatus == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              syncStatus.syncInProgress
                  ? Icons.sync
                  : Icons.cloud_done_outlined,
              size: 20,
              color: syncStatus.syncInProgress
                  ? AppColors.warning
                  : AppColors.success,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    syncStatus.syncInProgress
                        ? 'Syncing...'
                        : 'Last synced',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    formatSyncTime(syncStatus.lastSyncAt),
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            TextButton.icon(
              onPressed: syncStatus.syncInProgress
                  ? null
                  : () => ref.read(dashboardProvider.notifier).triggerSync(),
              icon: syncStatus.syncInProgress
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.sync, size: 18),
              label: Text(syncStatus.syncInProgress ? 'Syncing' : 'Sync Now'),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardError extends StatelessWidget {
  const _DashboardError({
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

class _DashboardSkeleton extends StatelessWidget {
  const _DashboardSkeleton();

  @override
  Widget build(BuildContext context) {
    final shimmerColor = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _shimmerLine(width: 100, height: 18, color: shimmerColor),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _shimmerBlock(height: 60, color: shimmerColor)),
                    const SizedBox(width: 12),
                    Expanded(child: _shimmerBlock(height: 60, color: shimmerColor)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _shimmerBlock(height: 60, color: shimmerColor)),
                    const SizedBox(width: 12),
                    Expanded(child: _shimmerBlock(height: 60, color: shimmerColor)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerLine(width: 140, height: 18, color: shimmerColor),
        ),
        const SizedBox(height: 8),
        ...List.filled(3, const Card(child: _ShimmerTile())),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: _shimmerBlock(height: 48, color: shimmerColor),
          ),
        ),
      ],
    );
  }

  Widget _shimmerLine({required double width, required double height, required Color color}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: Container(
        width: width,
        height: height,
        color: color,
      ),
    );
  }

  Widget _shimmerBlock({required double height, required Color color}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: height,
        color: color,
      ),
    );
  }
}

class _ShimmerTile extends StatelessWidget {
  const _ShimmerTile();

  @override
  Widget build(BuildContext context) {
    final shimmerColor = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: shimmerColor,
        child: const SizedBox.shrink(),
      ),
      title: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Container(
          height: 14,
          color: shimmerColor,
        ),
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Container(
            height: 12,
            width: 120,
            color: shimmerColor,
          ),
        ),
      ),
    );
  }
}
