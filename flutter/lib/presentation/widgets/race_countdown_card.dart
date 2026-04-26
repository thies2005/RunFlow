import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/race_models.dart';
import 'package:runflow_flutter/presentation/providers/race_providers.dart';

class RaceCountdownCard extends ConsumerWidget {
  const RaceCountdownCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(raceCountdownProvider);

    if (data == null) return _NoGoalCard();

    if (data.isPostRace && !data.hasRaceResult && !data.isOverdue) {
      return _PostRacePendingCard(data: data);
    }

    if (data.isOverdue) return _OverdueCard(data: data);

    return _ActiveCountdownCard(data: data);
  }
}

class _ActiveCountdownCard extends StatelessWidget {
  const _ActiveCountdownCard({required this.data});

  final RaceCountdownData data;

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
                Text(
                  'Race Goal',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    data.raceType,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              data.goalName,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(
                  Icons.event,
                  size: 14,
                  color: AppColors.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  _formatDate(data.raceDate),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _CountdownBox(
                    value: '${data.daysToRace}',
                    label: 'days to go',
                    isAccent: true,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _CountdownBox(
                    value: '${data.weeksToRace}',
                    label: 'weeks',
                    isAccent: false,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  'Training Progress',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                Text(
                  'Week ${data.weeksCompleted} of ${data.planWeeks}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: data.progressPercent / 100,
                backgroundColor: AppColors.surfaceDarkVariant,
                valueColor: const AlwaysStoppedAnimation<Color>(
                  AppColors.primary,
                ),
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (data.targetTimeSeconds != null)
                  Expanded(
                    child: _TimeMetric(
                      icon: Icons.flag,
                      label: 'Goal',
                      value: _formatTime(data.targetTimeSeconds!),
                      iconColor: AppColors.primary,
                    ),
                  ),
                if (data.targetTimeSeconds != null &&
                    data.projectedTimeSeconds != null)
                  const SizedBox(width: 12),
                if (data.projectedTimeSeconds != null)
                  Expanded(
                    child: _TimeMetric(
                      icon: Icons.timer,
                      label: 'Projected Finish',
                      value: _formatTime(data.projectedTimeSeconds!),
                      iconColor: AppColors.success,
                      subtitle: data.projectedVdot != null
                          ? 'Target VO2max ${data.projectedVdot!.toStringAsFixed(1)}'
                          : null,
                    ),
                  ),
              ],
            ),
            if (data.plannedWeekMileage > 0) ...[
              const SizedBox(height: 16),
              _WeeklyMileageTracker(
                current: data.currentWeekMileage,
                planned: data.plannedWeekMileage,
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[date.month]} ${date.day}, ${date.year}';
  }

  String _formatTime(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) {
      return '$hours:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }
    return '$minutes:${secs.toString().padLeft(2, '0')}';
  }
}

class _CountdownBox extends StatelessWidget {
  const _CountdownBox({
    required this.value,
    required this.label,
    required this.isAccent,
  });

  final String value;
  final String label;
  final bool isAccent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: isAccent
            ? AppColors.primary.withValues(alpha: 0.1)
            : AppColors.surfaceDarkVariant.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: isAccent ? AppColors.primary : AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeMetric extends StatelessWidget {
  const _TimeMetric({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
    this.subtitle,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color iconColor;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
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
                    fontSize: 10,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _WeeklyMileageTracker extends StatelessWidget {
  const _WeeklyMileageTracker({
    required this.current,
    required this.planned,
  });

  final double current;
  final double planned;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percent = planned > 0 ? (current / planned).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceDarkVariant.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                "This Week's Mileage",
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              Text(
                '${current.toStringAsFixed(1)} / ${planned.toStringAsFixed(1)} km',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent,
              backgroundColor: AppColors.surfaceDarkVariant,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.success,
              ),
              minHeight: 5,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoGoalCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.flag, size: 48, color: AppColors.onSurfaceVariant),
            const SizedBox(height: 12),
            Text(
              'No race goal set',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PostRacePendingCard extends ConsumerWidget {
  const _PostRacePendingCard({required this.data});

  final RaceCountdownData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final completionRate = data.totalWorkouts > 0
        ? ((data.completedWorkouts / data.totalWorkouts) * 100).round()
        : 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Race Goal',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    data.raceType,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.flag, size: 20, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data.isRaceDay ? 'Race Day!' : 'Race Week!',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          data.daysToRace == 0
                              ? 'Today is race day!'
                              : 'The race was ${data.daysToRace.abs()} days ago.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _buildCompletionBar(theme, completionRate),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () =>
                    context.push('/race-result/${data.goalId}'),
                icon: const Icon(Icons.emoji_events, size: 18),
                label: const Text('Link Race Result'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletionBar(ThemeData theme, int rate) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Training Completion',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            Text(
              '$rate%',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: rate / 100,
            backgroundColor: AppColors.surfaceDarkVariant,
            valueColor: AlwaysStoppedAnimation<Color>(
              rate >= 80
                  ? AppColors.success
                  : rate >= 60
                      ? AppColors.warning
                      : AppColors.error,
            ),
            minHeight: 5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${data.completedWorkouts}/${data.totalWorkouts} workouts completed',
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}

class _OverdueCard extends StatelessWidget {
  const _OverdueCard({required this.data});

  final RaceCountdownData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(
              Icons.flag,
              size: 48,
              color: AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 12),
            Text(
              data.goalName,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              data.raceType,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This training block has concluded.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
