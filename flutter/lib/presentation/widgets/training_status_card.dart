import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/race_models.dart';
import 'package:runflow_flutter/presentation/providers/race_providers.dart';

class TrainingStatusCard extends ConsumerWidget {
  const TrainingStatusCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(trainingStatusProvider);

    return statusAsync.when(
      loading: () => const _TrainingStatusSkeleton(),
      error: (_, _) => const _NoDataCard(),
      data: (data) {
        final hasData =
            data.ctl > 0 || data.atl > 0 || data.effectiveVO2max > 0;
        if (!hasData) return const _NoDataCard();
        return _TrainingStatusContent(data: data);
      },
    );
  }
}

class _TrainingStatusContent extends StatelessWidget {
  const _TrainingStatusContent({required this.data});

  final TrainingStatusData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Training Status',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _TopMetric(
                    icon: Icons.trending_up,
                    label: 'Shape',
                    value: '${data.shapePercent.toStringAsFixed(0)}%',
                    iconBgColor: AppColors.success,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TopMetric(
                    icon: Icons.favorite,
                    label: 'VO2max',
                    value: data.effectiveVO2max > 0
                        ? data.effectiveVO2max.toStringAsFixed(1)
                        : '-',
                    iconBgColor: const Color(0xFF009688),
                    badge: data.correctionFactor != 1.0
                        ? '${data.correctionFactor.toStringAsFixed(1)}x'
                        : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _WorkloadBalanceDiagram(ratio: data.workloadRatio),
            const SizedBox(height: 16),
            _MetricsList(data: data),
          ],
        ),
      ),
    );
  }
}

class _TopMetric extends StatelessWidget {
  const _TopMetric({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconBgColor,
    this.badge,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color iconBgColor;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconBgColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 20, color: iconBgColor),
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
              Row(
                children: [
                  Text(
                    value,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (badge != null) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00BCD4).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: const Color(0xFF00BCD4).withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        badge!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: const Color(0xFF00BCD4),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _WorkloadBalanceDiagram extends StatelessWidget {
  const _WorkloadBalanceDiagram({required this.ratio});

  final double ratio;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _workloadStatus(ratio);
    final markerPercent = (ratio / 2.0 * 100).clamp(0.0, 100.0);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.speed, size: 14, color: status.color),
              const SizedBox(width: 6),
              Text(
                'Workload Balance',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: status.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: status.color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              return SizedBox(
                height: 8,
                width: width,
                child: Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: width * 0.40,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.grey.withValues(alpha: 0.1),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(4),
                            bottomLeft: Radius.circular(4),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: width * 0.40,
                      child: Container(
                        width: width * 0.25,
                        height: 8,
                        color: AppColors.success.withValues(alpha: 0.2),
                      ),
                    ),
                    Positioned(
                      left: width * 0.65,
                      child: Container(
                        width: width * 0.10,
                        height: 8,
                        color: AppColors.warning.withValues(alpha: 0.2),
                      ),
                    ),
                    Positioned(
                      left: width * 0.75,
                      child: Container(
                        width: width * 0.25,
                        height: 8,
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.2),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(4),
                            bottomRight: Radius.circular(4),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: (markerPercent / 100 * width) - 8,
                      top: -4,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: status.color,
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.white.withValues(alpha: 0.4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Low',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 10,
                ),
              ),
              Expanded(
                child: Center(
                  child: Text(
                    'Sweet Spot (0.8 - 1.3)',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.success.withValues(alpha: 0.6),
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
              Text(
                ratio > 2 ? ratio.toStringAsFixed(2) : '2.0+',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  _WorkloadInfo _workloadStatus(double ratio) {
    if (ratio <= 0) {
      return const _WorkloadInfo(
        label: 'No Data',
        color: AppColors.onSurfaceVariant,
      );
    }
    if (ratio < 0.8) {
      return const _WorkloadInfo(label: 'Recovery', color: Color(0xFF009688));
    }
    if (ratio <= 1.3) {
      return const _WorkloadInfo(label: 'Optimal', color: AppColors.success);
    }
    if (ratio <= 1.5) {
      return const _WorkloadInfo(label: 'Caution', color: AppColors.warning);
    }
    return const _WorkloadInfo(label: 'Overload', color: AppColors.error);
  }
}

class _MetricsList extends StatelessWidget {
  const _MetricsList({required this.data});

  final TrainingStatusData data;

  @override
  Widget build(BuildContext context) {
    final tsbInfo = _tsbInfo(data.tsb);

    return Column(
      children: [
        _MetricBar(
          label: 'Fatigue (ATL)',
          percent: data.atlPercent,
          value: data.atl > 0 ? data.atl.toStringAsFixed(0) : '-',
          color: AppColors.error,
        ),
        const SizedBox(height: 12),
        _MetricBar(
          label: 'Fitness (CTL)',
          percent: data.ctlPercent,
          value: data.ctl > 0 ? data.ctl.toStringAsFixed(0) : '-',
          color: const Color(0xFF2196F3),
        ),
        const SizedBox(height: 12),
        _TsbBar(
          label: 'Stress Balance',
          tsb: data.tsb,
          color: tsbInfo.color,
        ),
        const SizedBox(height: 12),
        _MetricBar(
          label: 'Weekly TRIMP',
          percent: data.easyTrimp > 0 ? (data.easyTrimp / 5).clamp(0, 100) : 0,
          value: data.easyTrimp > 0 ? data.easyTrimp.toStringAsFixed(0) : '-',
          color: const Color(0xFF9C27B0),
        ),
      ],
    );
  }

  _TsbDisplayInfo _tsbInfo(double tsb) {
    if (tsb >= 25) {
      return const _TsbDisplayInfo(color: AppColors.peaked);
    }
    if (tsb >= 5) {
      return const _TsbDisplayInfo(color: AppColors.fresh);
    }
    if (tsb >= -10) {
      return const _TsbDisplayInfo(color: AppColors.neutral);
    }
    if (tsb >= -30) {
      return const _TsbDisplayInfo(color: AppColors.fatigued);
    }
    return const _TsbDisplayInfo(color: AppColors.veryFatigued);
  }
}

class _MetricBar extends StatelessWidget {
  const _MetricBar({
    required this.label,
    required this.percent,
    required this.value,
    required this.color,
  });

  final String label;
  final double percent;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: (percent / 100).clamp(0.0, 1.0),
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 4,
            ),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 36,
          child: Text(
            value,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _TsbBar extends StatelessWidget {
  const _TsbBar({
    required this.label,
    required this.tsb,
    required this.color,
  });

  final String label;
  final double tsb;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final absPercent =
                  tsb.abs().clamp(0.0, 50.0) / 50.0;

              return SizedBox(
                height: 4,
                child: Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    Center(
                      child: Container(
                        width: 1,
                        color: AppColors.onSurfaceVariant
                            .withValues(alpha: 0.1),
                      ),
                    ),
                    Positioned(
                      left: tsb >= 0 ? width / 2 : width / 2 - absPercent * width / 2,
                      child: Container(
                        width: absPercent * width / 2,
                        height: 4,
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 36,
          child: Text(
            '${tsb >= 0 ? '+' : ''}${tsb.toStringAsFixed(0)}',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _NoDataCard extends StatelessWidget {
  const _NoDataCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            const Icon(
              Icons.directions_run,
              size: 48,
              color: AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 12),
            Text(
              'No Training Data',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Sync activities to see training status',
              style: theme.textTheme.bodySmall?.copyWith(
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

class _TrainingStatusSkeleton extends StatelessWidget {
  const _TrainingStatusSkeleton();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Container(
                width: 120,
                height: 18,
                color: c,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Container(height: 60, color: c),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Container(height: 60, color: c),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Container(height: 80, color: c),
            ),
            const SizedBox(height: 16),
            ...List.filled(
              4,
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Container(height: 8, color: c),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkloadInfo {
  const _WorkloadInfo({required this.label, required this.color});
  final String label;
  final Color color;
}

class _TsbDisplayInfo {
  const _TsbDisplayInfo({required this.color});
  final Color color;
}
