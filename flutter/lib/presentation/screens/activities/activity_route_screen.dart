import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/route_streams.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/widgets/runflow_map.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class ActivityRouteScreen extends ConsumerWidget {
  const ActivityRouteScreen({required this.activityId, super.key});

  final String activityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activityAsync = ref.watch(activityDetailProvider(activityId));

    return activityAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 16),
              Text(
                'No route data available for this activity.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
      data: (activity) {
        final gpsPoints = gpsPointsFromStreams(activity);

        if (gpsPoints.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: Text(activity.name)),
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.map_outlined, size: 64, color: AppColors.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'No route data available for this activity.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
            ? 1000 / activity.averageSpeed!
            : null;

        return Scaffold(
          appBar: AppBar(title: Text(activity.name)),
          body: Column(
            children: [
              Expanded(
                child: RunFlowMap(
                  gpsPoints: gpsPoints,
                  autoFitBounds: true,
                  showMarkers: true,
                  showAttribution: true,
                  showKmMarkers: true,
                  height: double.infinity,
                ),
              ),
              SafeArea(
                child: Card(
                  margin: const EdgeInsets.all(16),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _StatItem(
                          label: 'Distance',
                          value: formatDistance(activity.distance),
                          icon: Icons.straighten,
                        ),
                        _StatItem(
                          label: 'Duration',
                          value: formatDuration(activity.movingTime),
                          icon: Icons.timer,
                        ),
                        if (pace != null)
                          _StatItem(
                            label: 'Pace',
                            value: formatPace(pace),
                            icon: Icons.speed,
                          ),
                        if (activity.totalElevation > 0)
                          _StatItem(
                            label: 'Elevation',
                            value: '${activity.totalElevation.toStringAsFixed(0)} m',
                            icon: Icons.terrain,
                          ),
                        if (activity.averageHr != null)
                          _StatItem(
                            label: 'Avg HR',
                            value: '${activity.averageHr!.round()} bpm',
                            icon: Icons.favorite,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
