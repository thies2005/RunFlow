import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/race_detection_providers.dart';

class RaceDetectionBanner extends ConsumerWidget {
  const RaceDetectionBanner({
    required this.onActivitySelected,
    super.key,
  });

  final void Function(Activity) onActivitySelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final detectedRaces = ref.watch(detectedRaceActivitiesProvider);

    if (detectedRaces.isEmpty) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      color: const Color(0xFFF44336).withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFF44336), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, size: 18, color: Color(0xFFF44336)),
                const SizedBox(width: 8),
                Text(
                  'Potential Race Effort${detectedRaces.length > 1 ? 's' : ''} Detected',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFF44336),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'We noticed some high-intensity runs that match race distances. Tap to review.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            ...detectedRaces.take(3).map((activity) => _DetectedRaceTile(
              activity: activity,
              onTap: () => onActivitySelected(activity),
            )),
          ],
        ),
      ),
    );
  }
}

class _DetectedRaceTile extends StatelessWidget {
  const _DetectedRaceTile({
    required this.activity,
    required this.onTap,
  });

  final Activity activity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: const Color(0xFFF44336).withValues(alpha: 0.15),
                child: const Icon(
                  Icons.emoji_events,
                  size: 16,
                  color: Color(0xFFF44336),
                ),
              ),
              const SizedBox(width: 10),
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
                    Text(
                      '${formatDistance(activity.distance)} · ${formatDuration(activity.movingTime)}${pace != null ? ' · ${formatPace(pace)}' : ''}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
