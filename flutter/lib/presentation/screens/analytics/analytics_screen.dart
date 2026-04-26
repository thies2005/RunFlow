import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';
import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/widgets/circular_gauge.dart';
import 'package:runflow_flutter/presentation/widgets/charts/combined_analytics_chart.dart';
import 'package:runflow_flutter/presentation/widgets/metric_card.dart';

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
        title: const Text('Analytics'),
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
              _RacePredictionsCard(),
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
                  label: 'VDOT',
                  value: stats.currentVdot?.toStringAsFixed(1) ?? '--',
                  icon: Icons.speed,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: MetricCard(
                  label: 'CTL',
                  value: stats.ctl.toStringAsFixed(1),
                  subtitle: 'Fitness',
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
                  subtitle: 'Fatigue',
                  icon: Icons.trending_down,
                  color: AppColors.fatigued,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: MetricCard(
                  label: 'TSB',
                  value: stats.tsb.toStringAsFixed(1),
                  subtitle: 'Form',
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
    final status = tsbStatus(tsb);
    final color = _statusColor(status);

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
                'Training Form: $status',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(
              'TSB ${tsb.toStringAsFixed(1)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
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
                label: Text(days == 365 ? '1Y' : '${days}D'),
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
              'No history data available',
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
              'Fitness Trend',
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
                  'Race Predictions',
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

class _MarathonShapeSection extends StatelessWidget {
  const _MarathonShapeSection({required this.stats});

  final AnalyticsStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shape = stats.marathonShape;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Marathon Shape',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: CircularGauge(
                value: shape,
                label: 'Shape Score',
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
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
        label: 'Weekly Mileage',
        value: '${stats.currentWeekMileage.toStringAsFixed(1)} km',
        icon: Icons.straighten,
        color: AppColors.primary,
      ),
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
                'Something went wrong',
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
                label: const Text('Retry'),
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
