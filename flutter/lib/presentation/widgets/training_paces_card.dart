import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';

class TrainingPacesCard extends ConsumerWidget {
  const TrainingPacesCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(analyticsStatsProvider);
    final theme = Theme.of(context);

    return statsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (stats) {
        final vdot = stats.currentVdot ?? stats.effectiveVO2max;
        if (vdot <= 0) return const SizedBox.shrink();

        final easyPace = _computePace(vdot, 0.60);
        final easyUpperPace = _computePace(vdot, 0.70);
        final tempoPace = _computePace(vdot, 0.80);
        final thresholdPace = _computePace(vdot, 0.88);
        final intervalPace = _computePace(vdot, 0.95);
        final racePace = _computePace(vdot, 1.00);

        final zones = [
          _PaceZone(
            label: 'Easy',
            range: '${formatPace(easyUpperPace)} – ${formatPace(easyPace)}',
            icon: Icons.directions_run,
            color: AppColors.success,
            description: 'Aerobic base building',
          ),
          _PaceZone(
            label: 'Tempo',
            range: '${formatPace(tempoPace)} – ${formatPace(easyUpperPace)}',
            icon: Icons.speed,
            color: const Color(0xFFFF9800),
            description: 'Steady state effort',
          ),
          _PaceZone(
            label: 'Threshold',
            range: '${formatPace(thresholdPace)} – ${formatPace(tempoPace)}',
            icon: Icons.trending_up,
            color: const Color(0xFF2196F3),
            description: 'Lactate threshold',
          ),
          _PaceZone(
            label: 'Interval',
            range: '${formatPace(intervalPace)} – ${formatPace(thresholdPace)}',
            icon: Icons.flash_on,
            color: const Color(0xFFF44336),
            description: 'VO2max intervals',
          ),
          _PaceZone(
            label: 'Race Pace',
            range: '${formatPace(racePace)} – ${formatPace(intervalPace)}',
            icon: Icons.emoji_events,
            color: const Color(0xFF9C27B0),
            description: '5K race effort',
          ),
        ];

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.timer, size: 18, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Training Paces',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      'VDOT ${vdot.toStringAsFixed(1)}',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ...zones.map((zone) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _PaceZoneRow(zone: zone),
                )),
              ],
            ),
          ),
        );
      },
    );
  }

  double _computePace(double vdot, double fraction) {
    if (vdot <= 0) return 0;
    final vo2Fraction = vdot * fraction;
    if (vo2Fraction <= 0) return 0;
    final velocity = (-0.182258 +
            (0.182258 * 0.182258 - 4 * 0.000104 * (-4.60 - vo2Fraction)))
        .abs() /
        (2 * 0.000104);
    if (velocity <= 0) return 0;
    return 1000 / velocity;
  }
}

class _PaceZone {
  const _PaceZone({
    required this.label,
    required this.range,
    required this.icon,
    required this.color,
    required this.description,
  });

  final String label;
  final String range;
  final IconData icon;
  final Color color;
  final String description;
}

class _PaceZoneRow extends StatelessWidget {
  const _PaceZoneRow({required this.zone});

  final _PaceZone zone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: zone.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(zone.icon, size: 16, color: zone.color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    zone.label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: zone.color,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      zone.range,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              Text(
                zone.description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
