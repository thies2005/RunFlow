import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';
import 'package:runflow_flutter/domain/entities/analytics_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/heatmap_providers.dart';
import 'package:runflow_flutter/presentation/widgets/charts/combined_analytics_chart.dart';
import 'package:runflow_flutter/presentation/widgets/charts/hr_zone_distribution_chart.dart';
import 'package:runflow_flutter/presentation/widgets/heatmap_map.dart';
import 'package:runflow_flutter/presentation/widgets/metric_card.dart';
import 'package:runflow_flutter/presentation/widgets/shape_calibration_sheet.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/widgets/training_paces_card.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(analyticsStatsProvider);
    final selectedDays = ref.watch(selectedDateRangeProvider);
    final historyAsync = ref.watch(
      analyticsHistoryProvider(days: selectedDays),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).analyticsTitle),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(analyticsStatsProvider);
          ref.invalidate(
            analyticsHistoryProvider(days: selectedDays),
          );
        },
        child: statsAsync.when(
          loading: () => const _AnalyticsSkeleton(),
          error: (error, _) => _AnalyticsError(
            message: error.toString(),
            onRetry: () {
              ref.invalidate(analyticsStatsProvider);
              ref.invalidate(
                analyticsHistoryProvider(days: selectedDays),
              );
            },
          ),
          data: (stats) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              _SummaryCardsRow(stats: stats),
              const SizedBox(height: 16),
              _FormIndicator(tsb: stats.tsb),
              const SizedBox(height: 16),
              _DateRangeSelector(),
              const SizedBox(height: 16),
              historyAsync.when(
                loading: () => const SizedBox(
                  height: 300,
                  child: Card(
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
                error: (_, _) => const SizedBox.shrink(),
                data: (history) => RepaintBoundary(
                  child: _FitnessChart(history: history),
                ),
              ),
              const SizedBox(height: 16),
              const CombinedAnalyticsChart(),
              const SizedBox(height: 16),
              const _HeatmapSection(),
              const SizedBox(height: 16),
              const _HrZoneDistributionSection(),
              const SizedBox(height: 16),
              _RacePredictionsCard(),
              const SizedBox(height: 16),
              const TrainingPacesCard(),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _MarathonShapeSection(stats: stats),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _WeeklyMileageCard(stats: stats),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCardsRow extends StatelessWidget {
  const _SummaryCardsRow({required this.stats});

  final AnalyticsStats stats;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: MetricCard(
                  label: S.of(context).analyticsVdot,
                  value: (stats.currentVdot ?? stats.effectiveVO2max).toStringAsFixed(1),
                  icon: Icons.speed,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: MetricCard(
                  label: 'CTL',
                  value: stats.ctl.toStringAsFixed(1),
                  subtitle: S.of(context).analyticsFitness,
                  icon: Icons.trending_up,
                  color: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: MetricCard(
                  label: 'ATL',
                  value: stats.atl.toStringAsFixed(1),
                  subtitle: S.of(context).analyticsFatigue,
                  icon: Icons.trending_down,
                  color: AppColors.fatigued,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: MetricCard(
                  label: 'TSB',
                  value: stats.tsb.toStringAsFixed(1),
                  subtitle: S.of(context).analyticsForm,
                  icon: Icons.battery_charging_full,
                  color: _tsbColor(stats.tsb),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _tsbColor(double tsb) {
    if (tsb >= 25) return AppColors.peaked;
    if (tsb >= 5) return AppColors.fresh;
    if (tsb >= -10) return AppColors.neutral;
    if (tsb >= -30) return AppColors.fatigued;
    return AppColors.veryFatigued;
  }
}

class _FormIndicator extends StatelessWidget {
  const _FormIndicator({required this.tsb});

  final double tsb;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rawStatus = tsbStatus(tsb);
    final localizedStatus = _localizedStatus(context);
    final color = _statusColor(rawStatus);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                S.of(context).analyticsTrainingForm(localizedStatus),
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(
              S.of(context).analyticsTsbValue(tsb.toStringAsFixed(1)),
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _localizedStatus(BuildContext context) {
    if (tsb >= 25) return S.of(context).tsbPeaked;
    if (tsb >= 5) return S.of(context).tsbFresh;
    if (tsb >= -10) return S.of(context).tsbNeutral;
    if (tsb >= -30) return S.of(context).tsbFatigued;
    return S.of(context).tsbVeryFatigued;
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'Peaked':
        return AppColors.peaked;
      case 'Fresh':
        return AppColors.fresh;
      case 'Neutral':
        return AppColors.neutral;
      case 'Fatigued':
        return AppColors.fatigued;
      case 'Very Fatigued':
        return AppColors.veryFatigued;
      default:
        return AppColors.neutral;
    }
  }
}

class _DateRangeSelector extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedDateRangeProvider);
    const ranges = [30, 60, 90, 365];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: ranges.map((days) {
            final isSelected = selected == days;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(days == 365 ? S.of(context).analyticsDateRange1Y : S.of(context).analyticsDateRangeDays(days)),
                selected: isSelected,
                onSelected: (_) {
                  ref.read(selectedDateRangeProvider.notifier).setDays(days);
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _FitnessChart extends StatelessWidget {
  const _FitnessChart({required this.history});

  final List<FitnessHistory> history;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (history.isEmpty) {
      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Text(
              S.of(context).analyticsNoHistory,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ),
      );
    }

    final ctlSpots = <FlSpot>[];
    final atlSpots = <FlSpot>[];
    final tsbSpots = <FlSpot>[];

    for (var i = 0; i < history.length; i++) {
      ctlSpots.add(FlSpot(i.toDouble(), history[i].metrics.ctl));
      atlSpots.add(FlSpot(i.toDouble(), history[i].metrics.atl));
      tsbSpots.add(FlSpot(i.toDouble(), history[i].metrics.tsb));
    }

    final minY = [
      ...ctlSpots.map((e) => e.y),
      ...atlSpots.map((e) => e.y),
      ...tsbSpots.map((e) => e.y),
    ].reduce((a, b) => a < b ? a : b);

    final maxY = [
      ...ctlSpots.map((e) => e.y),
      ...atlSpots.map((e) => e.y),
      ...tsbSpots.map((e) => e.y),
    ].reduce((a, b) => a > b ? a : b);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              S.of(context).analyticsFitnessTrend,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            _ChartLegend(),
            const SizedBox(height: 12),
            SizedBox(
              height: 220,
              child: LineChart(
                LineChartData(
                  minY: minY - 5,
                  maxY: maxY + 5,
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipItems: (spots) {
                        return spots.map((spot) {
                          Color color;
                          switch (spot.barIndex) {
                            case 0:
                              color = AppColors.success;
                            case 1:
                              color = AppColors.fatigued;
                            case 2:
                              color = AppColors.peaked;
                            default:
                              color = AppColors.onSurface;
                          }
                          return LineTooltipItem(
                            spot.y.toStringAsFixed(1),
                            TextStyle(color: color, fontWeight: FontWeight.w600),
                          );
                        }).toList();
                      },
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 20,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        interval: 20,
                        getTitlesWidget: (value, meta) => Text(
                          value.toStringAsFixed(0),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: (history.length / 5).ceilToDouble(),
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= history.length) {
                            return const SizedBox.shrink();
                          }
                          final date = history[index].date;
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '${date.day}/${date.month}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 10,
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
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    _buildLine(ctlSpots, AppColors.success),
                    _buildLine(atlSpots, AppColors.fatigued),
                    _buildLine(tsbSpots, AppColors.peaked),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  LineChartBarData _buildLine(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      preventCurveOverShooting: true,
      color: color,
      barWidth: 2,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(show: false),
    );
  }
}

class _ChartLegend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _legendItem(AppColors.success, 'CTL'),
        const SizedBox(width: 16),
        _legendItem(AppColors.fatigued, 'ATL'),
        const SizedBox(width: 16),
        _legendItem(AppColors.peaked, 'TSB'),
      ],
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _RacePredictionsCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final predictionsAsync = ref.watch(racePredictionsProvider);
    final theme = Theme.of(context);

    return predictionsAsync.when(
      loading: () => const Card(
        margin: EdgeInsets.symmetric(horizontal: 16),
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
          error: (_, _) => const SizedBox.shrink(),
      data: (predictions) {
        if (predictions.isEmpty) return const SizedBox.shrink();

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  S.of(context).analyticsRacePredictions,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                ...predictions.entries.map(
                  (entry) => _PredictionRow(
                    label: entry.key,
                    duration: entry.value,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PredictionRow extends StatelessWidget {
  const _PredictionRow({
    required this.label,
    required this.duration,
  });

  final String label;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    final timeStr = hours > 0
        ? '$hours h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s'
        : '$minutes:${seconds.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
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
  }
}

class _MarathonShapeSection extends ConsumerWidget {
  const _MarathonShapeSection({required this.stats});

  final AnalyticsStats stats;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final shape = stats.marathonShape;
    final selectedDays = ref.watch(selectedDateRangeProvider);
    final historyAsync = ref.watch(analyticsHistoryProvider(days: selectedDays));

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  S.of(context).analyticsMarathonShape,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: theme.colorScheme.surface,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    builder: (_) => const ShapeCalibrationSheet(),
                  ),
                  icon: const Icon(Icons.tune, size: 18),
                  label: Text(S.of(context).analyticsCalibrate),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _shapeLegendItem(AppColors.primary, S.of(context).analyticsMarathonShape),
                const SizedBox(width: 16),
                _shapeLegendItem(const Color(0xFFF59E0B), 'VO2max'),
                const SizedBox(width: 16),
                Text(
                  '${shape.toStringAsFixed(0)}%',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: shape >= 80 ? AppColors.success : shape >= 50 ? AppColors.primary : AppColors.warning,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            historyAsync.when(
              data: (history) {
                if (history.isEmpty) {
                  return _buildEmptyChart(context, theme);
                }
                return _buildShapeChart(context, theme, history, shape);
              },
              loading: () => const SizedBox(
                height: 200,
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
              error: (_, _) => _buildEmptyChart(context, theme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyChart(BuildContext context, ThemeData theme) {
    return SizedBox(
      height: 200,
      child: Center(
        child: Text(
          S.of(context).analyticsNoHistory,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  Widget _buildShapeChart(BuildContext context, ThemeData theme, List<FitnessHistory> history, double currentShape) {
    final shapeSpots = <FlSpot>[];
    final vo2Spots = <FlSpot>[];
    final currentCtl = stats.ctl;

    for (var i = 0; i < history.length; i++) {
      final ctl = history[i].metrics.ctl;
      // Use a more realistic shape estimation: shape scales with CTL but with
      // diminishing returns. If CTL is zero or very small, shape is minimal.
      // The relationship is: estimatedShape = currentShape * (ctl / currentCtl)
      // but dampened so it doesn't exceed 100 or produce huge values.
      double estimatedShape;
      if (currentCtl > 1 && ctl > 0) {
        // Use ratio but cap it at 1.2x to prevent overshoot
        final ratio = (ctl / currentCtl).clamp(0.0, 1.5);
        estimatedShape = currentShape * ratio;
      } else if (ctl > 0) {
        // If currentCtl is near zero, estimate based on CTL alone
        estimatedShape = (ctl / 80.0 * 100).clamp(0.0, 100.0);
      } else {
        estimatedShape = 0;
      }
      shapeSpots.add(FlSpot(i.toDouble(), estimatedShape.clamp(0.0, 100.0)));
      final estimatedVo2 = ctl > 0 ? 30 + (ctl / 2) : stats.effectiveVO2max;
      vo2Spots.add(FlSpot(i.toDouble(), estimatedVo2));
    }

    final allY = [...shapeSpots.map((e) => e.y), ...vo2Spots.map((e) => e.y)];
    final minY = allY.reduce((a, b) => a < b ? a : b) - 5;
    final maxY = allY.reduce((a, b) => a > b ? a : b) + 5;

    return SizedBox(
      height: 220,
      child: LineChart(
        LineChartData(
          minY: minY,
          maxY: maxY,
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (spots) {
                return spots.map((spot) {
                  final color = spot.barIndex == 0
                      ? AppColors.primary
                      : const Color(0xFFF59E0B);
                  return LineTooltipItem(
                    spot.y.toStringAsFixed(1),
                    TextStyle(color: color, fontWeight: FontWeight.w600),
                  );
                }).toList();
              },
            ),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (value) => FlLine(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
              strokeWidth: 1,
            ),
          ),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 40,
                getTitlesWidget: (value, meta) => Text(
                  value.toStringAsFixed(0),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: (history.length / 5).ceilToDouble(),
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= history.length) {
                    return const SizedBox.shrink();
                  }
                  final date = history[index].date;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '${date.day}/${date.month}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 10,
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
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: shapeSpots,
              isCurved: true,
              preventCurveOverShooting: true,
              color: AppColors.primary,
              barWidth: 2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                color: AppColors.primary.withValues(alpha: 0.08),
              ),
            ),
            LineChartBarData(
              spots: vo2Spots,
              isCurved: true,
              preventCurveOverShooting: true,
              color: const Color(0xFFF59E0B),
              barWidth: 2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _shapeLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _WeeklyMileageCard extends StatelessWidget {
  const _WeeklyMileageCard({required this.stats});

  final AnalyticsStats stats;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: MetricCard(
         label: S.of(context).analyticsWeeklyMileageLabel,
        value: '${stats.currentWeekMileage.toStringAsFixed(1)} km',
        icon: Icons.straighten,
        color: AppColors.primary,
      ),
    );
  }
}

class _HrZoneDistributionSection extends ConsumerWidget {
  const _HrZoneDistributionSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(activitiesProvider);
    final selectedDays = ref.watch(selectedDateRangeProvider);

    return activitiesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (state) {
        final now = DateTime.now();
        final cutoff = now.subtract(Duration(days: selectedDays));
        final filtered = state.activities
            .where((a) => a.startDate.isAfter(cutoff) && a.hasHeartrate)
            .toList();

        var z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;
        for (final a in filtered) {
          z1 += a.hrZone1Time;
          z2 += a.hrZone2Time;
          z3 += a.hrZone3Time;
          z4 += a.hrZone4Time;
          z5 += a.hrZone5Time;
        }

        return HrZoneDistributionChart(
          zoneTimes: [z1, z2, z3, z4, z5, 0, 0],
        );
      },
    );
  }
}

class _AnalyticsError extends StatelessWidget {
  const _AnalyticsError({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Center(
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
      ),
    );
  }
}

class _AnalyticsSkeleton extends StatelessWidget {
  const _AnalyticsSkeleton();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(child: _shimmerBlock(height: 90, color: c)),
              const SizedBox(width: 8),
              Expanded(child: _shimmerBlock(height: 90, color: c)),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(child: _shimmerBlock(height: 90, color: c)),
              const SizedBox(width: 8),
              Expanded(child: _shimmerBlock(height: 90, color: c)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerBlock(height: 48, color: c),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: List.filled(
              4,
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _shimmerBlock(width: 60, height: 36, color: c),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerBlock(height: 300, color: c),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerBlock(height: 200, color: c),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerBlock(height: 280, color: c),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _shimmerBlock(height: 200, color: c),
        ),
      ],
    );
  }

  Widget _shimmerBlock({double? width, required double height, required Color color}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: width,
        height: height,
        color: color,
      ),
    );
  }
}

class _HeatmapSection extends ConsumerWidget {
  const _HeatmapSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedDays = ref.watch(selectedDateRangeProvider);
    final routesAsync = ref.watch(heatmapRoutesProvider(days: selectedDays));

    return routesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (routes) {
        if (routes.isEmpty) return const SizedBox.shrink();

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Your Running Heatmap',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.fullscreen, size: 20),
                      onPressed: () => context.push('/analytics/heatmap'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                HeatmapMap(routes: routes, height: 280),
              ],
            ),
          ),
        );
      },
    );
  }
}
