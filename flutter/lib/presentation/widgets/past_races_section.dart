import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';

class PastRacesSection extends ConsumerWidget {
  const PastRacesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (data) {
        final completedGoals = data.goals
            .where((g) => g.completedAt != null || !g.isActive)
            .toList();

        if (completedGoals.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Past Races',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
            const SizedBox(height: 8),
            ...completedGoals.map((goal) => _PastRaceCard(goal: goal)),
          ],
        );
      },
    );
  }
}

class _PastRaceCard extends StatelessWidget {
  const _PastRaceCard({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completedWorkouts =
        goal.workouts.where((w) => w.isCompleted).length;
    final totalWorkouts = goal.workouts.length;
    final completionRate =
        totalWorkouts > 0 ? (completedWorkouts / totalWorkouts * 100).round() : 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.success.withValues(alpha: 0.15),
                  child: const Icon(
                    Icons.emoji_events_outlined,
                    color: AppColors.success,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        goal.name,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _raceTypeLabel(goal.raceType ?? RaceType.customDistance),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Completed',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.success,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _InfoChip(
                  icon: Icons.event,
                  label: formatRelativeDate(goal.raceDate ?? goal.createdAt),
                ),
                const SizedBox(width: 12),
                if (goal.targetTime != null)
                  _InfoChip(
                    icon: Icons.timer_outlined,
                    label: formatDuration(goal.targetTime!),
                  ),
                const SizedBox(width: 12),
                _InfoChip(
                  icon: Icons.fitness_center,
                  label: '$completionRate% done',
                ),
              ],
            ),
            if (goal.predictedTime != null) ...[
              const SizedBox(height: 8),
              Text(
                'Predicted: ${formatDuration(goal.predictedTime!)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _raceTypeLabel(RaceType type) {
    return switch (type) {
      RaceType.fiveK => '5K',
      RaceType.tenK => '10K',
      RaceType.halfMarathon => 'Half Marathon',
      RaceType.marathon => 'Marathon',
      RaceType.fiftyK => '50K',
      RaceType.fiftyMile => '50 Mile',
      RaceType.hundredK => '100K',
      RaceType.hundredMile => '100 Mile',
      RaceType.twelveHour => '12 Hour',
      RaceType.twentyFourHour => '24 Hour',
      RaceType.backyardUltra => 'Backyard Ultra',
      RaceType.customDistance => 'Custom',
      RaceType.sprintTri => 'Sprint Tri',
      RaceType.olympicTri => 'Olympic Tri',
      RaceType.halfIronman => 'Half Ironman',
      RaceType.fullIronman => 'Full Ironman',
      RaceType.customTri => 'Custom Tri',
    };
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
        ),
      ],
    );
  }
}
