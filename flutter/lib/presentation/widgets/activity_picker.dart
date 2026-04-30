import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

class ActivityPickerSheet extends ConsumerStatefulWidget {
  const ActivityPickerSheet({
    required this.onActivitySelected,
    this.excludeIds = const [],
    super.key,
  });

  final void Function(Activity) onActivitySelected;
  final List<String> excludeIds;

  @override
  ConsumerState<ActivityPickerSheet> createState() =>
      _ActivityPickerSheetState();
}

class _ActivityPickerSheetState extends ConsumerState<ActivityPickerSheet> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final activitiesAsync = ref.watch(activitiesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Text(
                    'Select Activity',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Search activities...',
                  prefixIcon: Icon(Icons.search),
                  isDense: true,
                ),
                onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
              ),
            ),
            Expanded(
              child: activitiesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, _) => const Center(child: Text('Failed to load activities')),
                data: (state) {
                  var activities = state.activities
                      .where((a) => a.type == ActivityType.run)
                      .where((a) => !widget.excludeIds.contains(a.id))
                      .toList();

                  if (_searchQuery.isNotEmpty) {
                    activities = activities
                        .where((a) => a.name.toLowerCase().contains(_searchQuery))
                        .toList();
                  }

                  if (activities.isEmpty) {
                    return Center(
                      child: Text(
                        'No activities found',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    controller: scrollController,
                    itemCount: activities.length,
                    itemBuilder: (context, index) {
                      final activity = activities[index];
                      return _ActivityTile(
                        activity: activity,
                        onTap: () {
                          widget.onActivitySelected(activity);
                          Navigator.pop(context);
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({
    required this.activity,
    required this.onTap,
  });

  final Activity activity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      leading: CircleAvatar(
        radius: 20,
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
        '${formatDistance(activity.distance)} · ${formatDuration(activity.movingTime)} · ${_formatDate(activity.startDate)}',
        style: theme.textTheme.bodySmall?.copyWith(
          color: AppColors.onSurfaceVariant,
        ),
      ),
      trailing: const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
      onTap: onTap,
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
