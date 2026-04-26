import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';

class RacePredictionChart extends ConsumerWidget {
  const RacePredictionChart({super.key});

  static const _distances = [
    (label: '5K', meters: 5000.0, color: Color(0xFF4CAF50)),
    (label: '10K', meters: 10000.0, color: Color(0xFF2196F3)),
    (label: 'Half', meters: 21097.5, color: Color(0xFFFF9800)),
    (label: 'Marathon', meters: 42195.0, color: Color(0xFFF44336)),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final predictionsAsync = ref.watch(racePredictionsProvider);
    final theme = Theme.of(context);

    return predictionsAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (predictions) {
        if (predictions.isEmpty) return const SizedBox.shrink();

        final barGroups = <BarChartGroupData>[];
        var index = 0;
        for (final entry in predictions.entries) {
          final minutes = entry.value.inSeconds / 60.0;
          barGroups.add(
            BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: minutes,
                  color: _distances[index].color,
                  width: 40,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(6),
                    topRight: Radius.circular(6),
                  ),
                ),
              ],
            ),
          );
          index++;
        }

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.timeline, size: 18, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Race Predictions',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      'Based on current VDOT',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 220,
                  child: BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: barGroups.last.barRods.first.toY * 1.15,
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipItem: (group, groupIndex, rod, rodIndex) {
                            final totalSeconds = (rod.toY * 60).round();
                            final h = totalSeconds ~/ 3600;
                            final m = (totalSeconds % 3600) ~/ 60;
                            final s = totalSeconds % 60;
                            final timeStr = h > 0
                                ? '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}'
                                : '$m:${s.toString().padLeft(2, '0')}';
                            return BarTooltipItem(
                              '${_distances[group.x].label}\n$timeStr',
                              TextStyle(
                                color: _distances[group.x].color,
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              ),
                            );
                          },
                        ),
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 48,
                            interval: _calcInterval(barGroups),
                            getTitlesWidget: (value, meta) {
                              final h = value ~/ 60;
                              final m = (value % 60).round();
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: Text(
                                  h > 0 ? '${h}h${m}m' : '${m}m',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppColors.onSurfaceVariant,
                                    fontSize: 10,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              final idx = value.toInt();
                              if (idx < 0 || idx >= _distances.length) {
                                return const SizedBox.shrink();
                              }
                              return Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  _distances[idx].label,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: _distances[idx].color,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 11,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: _calcInterval(barGroups),
                        getDrawingHorizontalLine: (value) => FlLine(
                          color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: barGroups,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ...predictions.entries.toList().asMap().entries.map((entry) {
                  final idx = entry.key;
                  final pred = entry.value.value;
                  final hours = pred.inHours;
                  final minutes = pred.inMinutes.remainder(60);
                  final seconds = pred.inSeconds.remainder(60);
                  final timeStr = hours > 0
                      ? '$hours h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s'
                      : '$minutes:${seconds.toString().padLeft(2, '0')}';
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: _distances[idx].color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 80,
                          child: Text(
                            _distances[idx].label,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            timeStr,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  double _calcInterval(List<BarChartGroupData> groups) {
    if (groups.isEmpty) return 30;
    final maxY = groups.map((g) => g.barRods.first.toY).reduce((a, b) => a > b ? a : b);
    if (maxY <= 30) return 5;
    if (maxY <= 60) return 10;
    if (maxY <= 180) return 30;
    return 60;
  }
}
