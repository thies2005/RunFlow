import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';

class WeekScheduleCard extends ConsumerWidget {
  const WeekScheduleCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (data) {
        final now = DateTime.now();
        final weekStart =
            DateTime(now.year, now.month, now.day)
                .subtract(Duration(days: now.weekday - 1));
        final weekEnd = weekStart.add(const Duration(days: 7));

        final weekWorkouts = <Workout>[];
        for (final goal in data.goals.where((g) => g.isActive)) {
          for (final workout in goal.workouts) {
            if (!workout.scheduledDate.isBefore(weekStart) &&
                workout.scheduledDate.isBefore(weekEnd)) {
              weekWorkouts.add(workout);
            }
          }
        }

        weekWorkouts
            .sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));

        if (weekWorkouts.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'This Week',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children:
                      weekWorkouts.map((w) => _WorkoutRow(workout: w)).toList(),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _WorkoutRow extends StatelessWidget {
  const _WorkoutRow({required this.workout});

  final Workout workout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dayName = _dayName(workout.scheduledDate.weekday);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(
              dayName,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: workout.isCompleted
                    ? AppColors.onSurfaceVariant
                    : AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: workout.isCompleted ? AppColors.success : AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  workout.description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    decoration:
                        workout.isCompleted ? TextDecoration.lineThrough : null,
                    color: workout.isCompleted
                        ? AppColors.onSurfaceVariant
                        : null,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${workout.workoutType.name.toUpperCase()} · ${workout.targetDistance.toStringAsFixed(1)} km'
                  '${workout.targetPace > 0 ? ' · ${formatPace(workout.targetPace)}' : ''}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          if (workout.isCompleted)
            const Icon(Icons.check_circle, size: 18, color: AppColors.success),
        ],
      ),
    );
  }

  String _dayName(int weekday) {
    return switch (weekday) {
      1 => 'Mon',
      2 => 'Tue',
      3 => 'Wed',
      4 => 'Thu',
      5 => 'Fri',
      6 => 'Sat',
      7 => 'Sun',
      _ => '',
    };
  }
}
