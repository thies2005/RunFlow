import 'dart:math';

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

        final maxHr = stats.hrMax;

        final easyFast = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 0.79),
        );
        final easySlow = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 0.65),
        );
        final marathon = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 0.78),
        );
        final threshold = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 0.88),
        );
        final interval = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 1.0),
        );
        final repetition = _velocityToPace(
          _velocityAtPercentVO2max(vdot, 1.05),
        );

        final zones = <_PaceZone>[
          _PaceZone(
            label: 'EASY (E)',
            paceText: '${formatPace(easyFast)} – ${formatPace(easySlow)}',
            color: AppColors.success,
            hrRange: maxHr > 0
                ? '${(maxHr * 0.65).round()}-${(maxHr * 0.79).round()} bpm'
                : null,
            hrPercent: '65-79% HRmax',
          ),
          _PaceZone(
            label: 'MARATHON (M)',
            paceText: formatPace(marathon),
            color: const Color(0xFF2196F3),
            hrRange: maxHr > 0
                ? '${(maxHr * 0.78).round()}-${(maxHr * 0.82).round()} bpm'
                : null,
            hrPercent: '78-82% HRmax',
          ),
          _PaceZone(
            label: 'THRESHOLD (T)',
            paceText: formatPace(threshold),
            color: const Color(0xFFFFC107),
            hrRange: maxHr > 0
                ? '${(maxHr * 0.88).round()}-${(maxHr * 0.92).round()} bpm'
                : null,
            hrPercent: '88-92% HRmax',
          ),
          _PaceZone(
            label: 'INTERVAL (I)',
            paceText: formatPace(interval),
            color: const Color(0xFFFF9800),
            hrRange: maxHr > 0
                ? '${(maxHr * 0.98).round()}-${(maxHr * 1.0).round()} bpm'
                : null,
            hrPercent: '98-100% HRmax',
          ),
          _PaceZone(
            label: 'REPETITION (R)',
            paceText: formatPace(repetition),
            color: const Color(0xFFF44336),
            hrRange:
                maxHr > 0 ? '>${(maxHr * 1.0).round()} bpm' : null,
            hrPercent: '100%+ HRmax',
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
                    const Icon(
                      Icons.favorite,
                      size: 18,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Training Paces & Heart Rate',
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
                Row(
                  children: [
                    Expanded(child: _PaceZoneCard(zone: zones[0])),
                    const SizedBox(width: 8),
                    Expanded(child: _PaceZoneCard(zone: zones[1])),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _PaceZoneCard(zone: zones[2])),
                    const SizedBox(width: 8),
                    Expanded(child: _PaceZoneCard(zone: zones[3])),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: _PaceZoneCard(zone: zones[4])),
                    const SizedBox(width: 8),
                    const Expanded(child: SizedBox.shrink()),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  double _velocityAtPercentVO2max(double vdot, double percentVO2max) {
    final vo2 = vdot * percentVO2max;
    const b = 0.182258;
    const a = 0.000104;
    final c = -4.60 - vo2;
    final discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return 0;
    return (-b + sqrt(discriminant)) / (2 * a);
  }

  double _velocityToPace(double velocityMetersPerMin) {
    if (velocityMetersPerMin <= 0) return 0;
    return (1000 / velocityMetersPerMin) * 60;
  }
}

class _PaceZone {
  const _PaceZone({
    required this.label,
    required this.paceText,
    required this.color,
    required this.hrRange,
    required this.hrPercent,
  });

  final String label;
  final String paceText;
  final Color color;
  final String? hrRange;
  final String hrPercent;
}

class _PaceZoneCard extends StatelessWidget {
  const _PaceZoneCard({required this.zone});

  final _PaceZone zone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: zone.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: zone.color.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            zone.label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: zone.color,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            zone.paceText,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            zone.hrRange ?? '-',
            style: theme.textTheme.bodySmall?.copyWith(
              color: zone.color,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            zone.hrPercent,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
