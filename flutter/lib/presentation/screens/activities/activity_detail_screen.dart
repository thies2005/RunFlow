import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/widgets/ai_feedback_section.dart';
import 'package:runflow_flutter/presentation/widgets/charts/hr_zone_chart.dart';
import 'package:runflow_flutter/presentation/widgets/charts/hr_time_chart.dart';
import 'package:runflow_flutter/presentation/widgets/charts/pace_chart.dart';
import 'package:runflow_flutter/presentation/widgets/charts/elevation_chart.dart';
import 'package:runflow_flutter/presentation/widgets/runflow_map.dart';

class ActivityDetailScreen extends ConsumerWidget {
  const ActivityDetailScreen({required this.activityId, super.key});

  final String activityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activityAsync = ref.watch(activityDetailProvider(activityId));

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).activityDetailTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/activities');
            }
          },
        ),
      ),
      body: activityAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ActivityDetailError(
          message: error.toString(),
          onRetry: () => ref.invalidate(activityDetailProvider(activityId)),
        ),
        data: (activity) => _ActivityDetailContent(
          activity: activity,
          activityId: activityId,
        ),
      ),
    );
  }
}

class _ActivityDetailContent extends StatelessWidget {
  const _ActivityDetailContent({required this.activity, required this.activityId});

  final Activity activity;
  final String activityId;

  @override
  Widget build(BuildContext context) {
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _HeaderSection(activity: activity),
        if (_hasLatLngStreams(activity))
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: RunFlowMap(
              gpsPoints: _parseLatLngStreams(activity),
              height: 220,
              showMarkers: true,
            ),
          ),
        const SizedBox(height: 16),
        _MetricsGrid(activity: activity, pace: pace),
        if (activity.trainingType != null) ...[
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _InfoBadge(
              icon: Icons.label,
              label: S.of(context).activityTrainingType,
              value: activity.trainingType!,
              color: AppColors.primary,
            ),
          ),
        ],
        if (activity.estimatedVdot != null) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _InfoBadge(
              icon: Icons.speed,
              label: S.of(context).activityEstimatedVdot,
              value: activity.estimatedVdot!.toStringAsFixed(1),
              color: AppColors.success,
            ),
          ),
        ],
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: HrZoneChart(
            zone1: activity.hrZone1Time,
            zone2: activity.hrZone2Time,
            zone3: activity.hrZone3Time,
            zone4: activity.hrZone4Time,
            zone5: activity.hrZone5Time,
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AiFeedbackSection(activityId: activityId),
        ),
        if (activity.streams != null) ...[
          if (activity.streams!['time'] != null && activity.streams!['heartrate'] != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: HrTimeChart(
                  timeData: (activity.streams!['time'] as List).map((e) => (e as num).toDouble()).toList(),
                  hrData: (activity.streams!['heartrate'] as List).map((e) => (e as num).toDouble()).toList(),
                ),
              ),
            ),
          if (activity.streams!['time'] != null && activity.streams!['velocity_smooth'] != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: PaceChart(
                  timeData: (activity.streams!['time'] as List).map((e) => (e as num).toDouble()).toList(),
                  velocityData: (activity.streams!['velocity_smooth'] as List).map((e) => (e as num).toDouble()).toList(),
                ),
              ),
            ),
          if (activity.streams!['time'] != null && activity.streams!['altitude'] != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: ElevationChart(
                  timeData: (activity.streams!['time'] as List).map((e) => (e as num).toDouble()).toList(),
                  altitudeData: (activity.streams!['altitude'] as List).map((e) => (e as num).toDouble()).toList(),
                ),
              ),
            ),
         ],
       ],
     );
   }

  bool _hasLatLngStreams(Activity activity) {
    final streams = activity.streams;
    if (streams == null) return false;
    final latlng = streams['latlng'];
    if (latlng is! List || latlng.isEmpty) return false;
    return true;
  }

  List<GpsPoint> _parseLatLngStreams(Activity activity) {
    final latlng = activity.streams?['latlng'];
    if (latlng is! List) return const [];
    final points = <GpsPoint>[];
    for (var i = 0; i < latlng.length; i++) {
      final pair = latlng[i];
      if (pair is List && pair.length >= 2) {
        final lat = (pair[0] as num).toDouble();
        final lng = (pair[1] as num).toDouble();
        if (lat != 0.0 || lng != 0.0) {
          points.add(GpsPoint(
            latitude: lat,
            longitude: lng,
            speed: 0,
            timestamp: DateTime.fromMillisecondsSinceEpoch(
              activity.startDate.millisecondsSinceEpoch +
                  (i * 1000),
            ),
          ));
        }
      }
    }
    return points;
  }
}

class _HeaderSection extends StatelessWidget {
  const _HeaderSection({required this.activity});

  final Activity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              child: Icon(
                activityTypeIcon(activity.type),
                color: AppColors.primary,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.name,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today,
                        size: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${activity.startDate.day}/${activity.startDate.month}/${activity.startDate.year}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        activityTypeIcon(activity.type),
                        size: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        activityTypeLabel(activity.type),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
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

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.activity, required this.pace});

  final Activity activity;
  final double? pace;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _MetricCard(
            icon: Icons.straighten,
            label: S.of(context).distance,
            value: formatDistance(activity.distance),
            color: AppColors.primary,
          ),
          _MetricCard(
            icon: Icons.speed,
            label: S.of(context).pace,
            value: formatPace(pace),
            color: AppColors.primary,
          ),
          _MetricCard(
            icon: Icons.timer,
            label: S.of(context).duration,
            value: formatDuration(activity.movingTime),
            color: AppColors.primary,
          ),
          _MetricCard(
            icon: Icons.terrain,
            label: S.of(context).elevation,
            value: '${activity.totalElevation.toStringAsFixed(0)} m',
            color: AppColors.fatigued,
          ),
          if (activity.averageHr != null)
            _MetricCard(
              icon: Icons.favorite,
              label: S.of(context).avgHr,
              value: '${activity.averageHr!.round()} bpm',
              color: AppColors.error,
            ),
          if (activity.maxHr != null)
            _MetricCard(
              icon: Icons.favorite_border,
              label: S.of(context).maxHr,
              value: '${activity.maxHr} bpm',
              color: AppColors.error,
            ),
          if (activity.averageCadence != null)
            _MetricCard(
              icon: Icons.directions_run,
              label: S.of(context).cadence,
              value: '${activity.averageCadence!.round()} spm',
              color: AppColors.success,
            ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: (MediaQuery.of(context).size.width - 40) / 2,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
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
              const SizedBox(height: 8),
              Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  const _InfoBadge({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 12),
            Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                value,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityDetailError extends StatelessWidget {
  const _ActivityDetailError({
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
