import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/race_detection_providers.dart';

class RaceActivityPickerSheet extends ConsumerStatefulWidget {
  const RaceActivityPickerSheet({
    required this.onActivitySelected,
    this.preselectedId,
    super.key,
  });

  final void Function(Activity) onActivitySelected;
  final String? preselectedId;

  @override
  ConsumerState<RaceActivityPickerSheet> createState() =>
      _RaceActivityPickerSheetState();
}

class _RaceActivityPickerSheetState
    extends ConsumerState<RaceActivityPickerSheet> {
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.preselectedId;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final candidates = ref.watch(recentRaceCandidatesProvider);

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
                    'Select Race Activity',
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
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                'Choose the activity that was your race effort.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ),
            Expanded(
              child: candidates.isEmpty
                  ? Center(
                      child: Text(
                        'No activities found',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: scrollController,
                      itemCount: candidates.length,
                      itemBuilder: (context, index) {
                        final activity = candidates[index];
                        final isSelected = activity.id == _selectedId;
                        return _RaceActivityTile(
                          activity: activity,
                          isSelected: isSelected,
                          onTap: () => setState(() => _selectedId = activity.id),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _selectedId != null
                      ? () {
                          final activity = candidates.firstWhere(
                            (a) => a.id == _selectedId,
                          );
                          widget.onActivitySelected(activity);
                          Navigator.pop(context);
                        }
                      : null,
                  child: const Text('Confirm Selection'),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RaceActivityTile extends StatelessWidget {
  const _RaceActivityTile({
    required this.activity,
    required this.isSelected,
    required this.onTap,
  });

  final Activity activity;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
      color: isSelected
          ? AppColors.primary.withValues(alpha: 0.1)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isSelected
            ? const BorderSide(color: AppColors.primary)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: isSelected
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.surfaceDarkVariant,
                child: Icon(
                  Icons.directions_run,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
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
                    const SizedBox(height: 2),
                    Text(
                      '${formatDistance(activity.distance)} · ${formatDuration(activity.movingTime)}${pace != null ? ' · ${formatPace(pace)}' : ''}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      _formatDate(activity.startDate),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: AppColors.primary),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[date.month]} ${date.day}, ${date.year}';
  }
}
