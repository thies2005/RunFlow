import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/widgets/manual_activity_sheet.dart';

class ActivityListScreen extends ConsumerStatefulWidget {
  const ActivityListScreen({super.key});

  @override
  ConsumerState<ActivityListScreen> createState() => _ActivityListScreenState();
}

class _ActivityListScreenState extends ConsumerState<ActivityListScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(activitiesProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final activitiesAsync = ref.watch(activitiesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).activitiesTitle),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(activitiesProvider.notifier).refresh(),
        child: Column(
          children: [
            const _FilterChips(),
            Expanded(
              child: activitiesAsync.when(
                loading: () => const _ActivityListSkeleton(),
                error: (error, _) => _ActivityListError(
                  message: error.toString(),
                  onRetry: () =>
                      ref.read(activitiesProvider.notifier).refresh(),
                ),
                data: (data) {
                  if (data.activities.isEmpty) {
                    return const _EmptyState();
                  }
                  return _ActivityListView(
                    activities: data.activities,
                    hasMore: data.hasMore,
                    isLoadingMore: data.isLoadingMore,
                    scrollController: _scrollController,
                  );
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (_) => const ManualActivitySheet(),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _FilterChips extends ConsumerWidget {
  const _FilterChips();

  static const _filterTypes = ActivityType.values;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedType = ref.watch(
      activitiesProvider.select((s) => s.value?.filterType),
    );

    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(S.of(context).activitiesAll),
              selected: selectedType == null,
              onSelected: (_) {
                ref.read(activitiesProvider.notifier).filterByType(null);
              },
            ),
          ),
          ..._filterTypes.map(
            (type) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(activityTypeLabel(type)),
                selected: selectedType == type,
                avatar: Icon(
                  activityTypeIcon(type),
                  size: 16,
                ),
                onSelected: (_) {
                  ref
                      .read(activitiesProvider.notifier)
                      .filterByType(selectedType == type ? null : type);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityListView extends StatelessWidget {
  const _ActivityListView({
    required this.activities,
    required this.hasMore,
    required this.isLoadingMore,
    required this.scrollController,
  });

  final List<Activity> activities;
  final bool hasMore;
  final bool isLoadingMore;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      controller: scrollController,
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: activities.length + (hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= activities.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        return _ActivityCard(activity: activities[index]);
      },
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.activity});

  final Activity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return Card(
      child: InkWell(
        onTap: () => context.push('/activities/${activity.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: Icon(
                  activityTypeIcon(activity.type),
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
                      activity.name,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.straighten,
                          size: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatDistance(activity.distance),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Icon(
                          Icons.speed,
                          size: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          formatPace(pace),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatRelativeDate(activity.startDate),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatDuration(activity.movingTime),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
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
              Icons.directions_run,
              size: 64,
              color: AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              S.of(context).activitiesNoActivities,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              S.of(context).activitiesSyncMessage,
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

class _ActivityListError extends StatelessWidget {
  const _ActivityListError({
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

class _ActivityListSkeleton extends StatelessWidget {
  const _ActivityListSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: List.filled(6, const _ShimmerCard()),
    );
  }
}

class _ShimmerCard extends StatelessWidget {
  const _ShimmerCard();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: c,
              child: const SizedBox.shrink(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 14,
                      width: 180,
                      color: c,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 12,
                      width: 120,
                      color: c,
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
