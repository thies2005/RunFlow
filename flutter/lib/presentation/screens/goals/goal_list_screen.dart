import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class GoalListScreen extends ConsumerWidget {
  const GoalListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goalsAsync = ref.watch(goalsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).goalList),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(goalsProvider.notifier).refresh(),
        child: goalsAsync.when(
          loading: () => const _GoalListSkeleton(),
          error: (error, _) => _GoalListError(
            message: error.toString(),
            onRetry: () => ref.read(goalsProvider.notifier).refresh(),
          ),
          data: (data) {
            if (data.goals.isEmpty) {
              return const _EmptyState();
            }
            return _GoalListContent(goals: data.goals);
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/goals/new'),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _GoalListContent extends StatelessWidget {
  const _GoalListContent({required this.goals});

  final List<Goal> goals;

  @override
  Widget build(BuildContext context) {
    final activeGoals = goals.where((g) => g.isActive).toList();
    final completedGoals = goals.where((g) => !g.isActive).toList();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 80),
      children: [
        if (activeGoals.isNotEmpty) ...[
          _SectionHeader(title: S.of(context).goalActiveGoals),
          ...activeGoals.map((goal) => _GoalCard(goal: goal)),
        ],
        if (completedGoals.isNotEmpty) ...[
          const SizedBox(height: 16),
          _SectionHeader(title: S.of(context).goalCompletedGoals),
          ...completedGoals.map((goal) => _GoalCard(goal: goal, isCompleted: true)),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({required this.goal, this.isCompleted = false});

  final Goal goal;
  final bool isCompleted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final daysUntilRace = goal.raceDate.difference(DateTime.now()).inDays;
    final completedWorkouts =
        goal.workouts.where((w) => w.isCompleted).length;
    final totalWorkouts = goal.workouts.length;
    final progress =
        totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0.0;

    return Card(
      color: isCompleted
          ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5)
          : null,
      child: InkWell(
        onTap: () => context.push('/goals/${goal.id}'),
        borderRadius: BorderRadius.circular(12),
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
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isCompleted ? AppColors.onSurfaceVariant : null,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: isCompleted
                          ? AppColors.onSurfaceVariant.withValues(alpha: 0.15)
                          : AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      raceTypeLabel(goal.raceType),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: isCompleted
                            ? AppColors.onSurfaceVariant
                            : AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.event,
                    size: 16,
                    color: isCompleted
                        ? AppColors.onSurfaceVariant
                        : AppColors.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isCompleted
                        ? S.of(context).statusCompleted
                        : daysUntilRace > 0
                            ? S.of(context).goalDaysToGoShort(daysUntilRace)
                            : S.of(context).planRaceDay,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: daysUntilRace > 0 || isCompleted
                          ? AppColors.onSurfaceVariant
                          : AppColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    S.of(context).goalWorkoutsCount(completedWorkouts, totalWorkouts),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isCompleted ? AppColors.onSurfaceVariant : AppColors.primary,
                  ),
                  minHeight: 6,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.flag_outlined,
              size: 64,
              color: AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              S.of(context).goalNoGoals,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              S.of(context).goalCreateSubtitle,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _GoalListError extends StatelessWidget {
  const _GoalListError({
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

class _GoalListSkeleton extends StatelessWidget {
  const _GoalListSkeleton();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 80),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Container(
              height: 18,
              width: 120,
              color: c,
            ),
          ),
        ),
        ...List.filled(
          3,
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Container(
                            height: 16,
                            color: c,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          width: 60,
                          height: 24,
                          color: c,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 12,
                      width: 160,
                      color: c,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 6,
                      color: c,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
