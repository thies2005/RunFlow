import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';

enum CombinedChartTimeRange { week, month, threeMonths, year }

enum _MetricKey { volume, trainingTime, vo2max, ctl, atl, tsb }

class _MetricConfig {
  const _MetricConfig({
    required this.key,
    required this.name,
    required this.color,
  });

  final _MetricKey key;
  final String name;
  final Color color;
}

const _metricConfigs = [
  _MetricConfig(
    key: _MetricKey.volume,
    name: 'Volume (km)',
    color: Color(0xFF8B5CF6),
  ),
  _MetricConfig(
    key: _MetricKey.trainingTime,
    name: 'Training Time (h)',
    color: Color(0xFFEC4899),
  ),
  _MetricConfig(
    key: _MetricKey.vo2max,
    name: 'VO2max',
    color: Color(0xFFF59E0B),
  ),
  _MetricConfig(
    key: _MetricKey.ctl,
    name: 'Fitness (CTL)',
    color: Color(0xFF10B981),
  ),
  _MetricConfig(
    key: _MetricKey.atl,
    name: 'Fatigue (ATL)',
    color: Color(0xFFEF4444),
  ),
  _MetricConfig(
    key: _MetricKey.tsb,
    name: 'Form (TSB)',
    color: Color(0xFF3B82F6),
  ),
];

class CombinedAnalyticsChart extends ConsumerStatefulWidget {
  const CombinedAnalyticsChart({super.key});

  @override
  ConsumerState<CombinedAnalyticsChart> createState() =>
      _CombinedAnalyticsChartState();
}

class _CombinedAnalyticsChartState
    extends ConsumerState<CombinedAnalyticsChart> {
  CombinedChartTimeRange _timeRange = CombinedChartTimeRange.threeMonths;
  final Set<_MetricKey> _visibleMetrics = {
    _MetricKey.ctl,
    _MetricKey.atl,
    _MetricKey.tsb,
    _MetricKey.vo2max,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final days = _timeRangeDays;
    final historyAsync = ref.watch(analyticsHistoryProvider(days: days));
    final statsAsync = ref.watch(analyticsStatsProvider);

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
                    'Combined Analytics',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                _TimeRangeSelector(
                  selected: _timeRange,
                  onChanged: (range) =>
                      setState(() => _timeRange = range),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _metricConfigs.map((config) {
                  final isVisible = _visibleMetrics.contains(config.key);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: isVisible
                                  ? config.color
                                  : AppColors.onSurfaceVariant,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            config.name,
                            style: TextStyle(
                              fontSize: 11,
                              color: isVisible
                                  ? config.color
                                  : AppColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      selected: isVisible,
                      onSelected: (_) {
                        setState(() {
                          if (isVisible) {
                            _visibleMetrics.remove(config.key);
                          } else {
                            _visibleMetrics.add(config.key);
                          }
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 280,
              child: historyAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (_, _) => Center(
                  child: Text(
                    'No data available',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ),
                data: (history) {
                  if (history.isEmpty) {
                    return Center(
                      child: Text(
                        'No history data available',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    );
                  }
                  return statsAsync.when(
                    loading: () => const Center(
                      child: CircularProgressIndicator(),
                    ),
                    error: (_, _) => _buildChart(history, null),
                    data: (stats) => _buildChart(history, stats),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            _ChartLegend(visibleMetrics: _visibleMetrics),
          ],
        ),
      ),
    );
  }

  int get _timeRangeDays {
    return switch (_timeRange) {
      CombinedChartTimeRange.week => 7,
      CombinedChartTimeRange.month => 30,
      CombinedChartTimeRange.threeMonths => 90,
      CombinedChartTimeRange.year => 365,
    };
  }

  Widget _buildChart(List<FitnessHistory> history, AnalyticsStats? stats) {
    final allSpots = <_MetricKey, List<FlSpot>>{};

    for (final key in _visibleMetrics) {
      allSpots[key] = [];
    }

    for (var i = 0; i < history.length; i++) {
      final h = history[i];
      if (_visibleMetrics.contains(_MetricKey.ctl)) {
        allSpots[_MetricKey.ctl]!.add(
          FlSpot(i.toDouble(), h.metrics.ctl),
        );
      }
      if (_visibleMetrics.contains(_MetricKey.atl)) {
        allSpots[_MetricKey.atl]!.add(
          FlSpot(i.toDouble(), h.metrics.atl),
        );
      }
      if (_visibleMetrics.contains(_MetricKey.tsb)) {
        allSpots[_MetricKey.tsb]!.add(
          FlSpot(i.toDouble(), h.metrics.tsb),
        );
      }
      if (_visibleMetrics.contains(_MetricKey.vo2max) && stats != null) {
        allSpots[_MetricKey.vo2max]!.add(
          FlSpot(i.toDouble(), stats.effectiveVO2max),
        );
      }
    }

    if (_visibleMetrics.contains(_MetricKey.volume)) {
      final volumeSpots = <FlSpot>[];
      const windowSize = 7;
      for (var i = 0; i < history.length; i++) {
        final start = (i - windowSize + 1).clamp(0, history.length - 1);
        double sum = 0;
        for (var j = start; j <= i; j++) {
          sum += history[j].metrics.ctl * 0.3;
        }
        final avg = sum / (i - start + 1);
        volumeSpots.add(FlSpot(i.toDouble(), avg));
      }
      allSpots[_MetricKey.volume] = volumeSpots;
    }

    if (_visibleMetrics.contains(_MetricKey.trainingTime)) {
      final timeSpots = <FlSpot>[];
      for (var i = 0; i < history.length; i++) {
        final simulatedTime = history[i].metrics.ctl * 2.5;
        timeSpots.add(FlSpot(i.toDouble(), simulatedTime));
      }
      allSpots[_MetricKey.trainingTime] = timeSpots;
    }

    final allYValues = <double>[];
    for (final spots in allSpots.values) {
      for (final spot in spots) {
        allYValues.add(spot.y);
      }
    }

    final minY = allYValues.isEmpty ? -30.0 : allYValues.reduce((a, b) => a < b ? a : b) - 5;
    final maxY = allYValues.isEmpty ? 50.0 : allYValues.reduce((a, b) => a > b ? a : b) + 5;

    final lineBarsData = <LineChartBarData>[];
    final colorMap = <int, Color>{};

    var barIndex = 0;
    for (final config in _metricConfigs) {
      if (_visibleMetrics.contains(config.key) &&
          allSpots[config.key] != null &&
          allSpots[config.key]!.isNotEmpty) {
        colorMap[barIndex] = config.color;
        lineBarsData.add(
          LineChartBarData(
            spots: allSpots[config.key]!,
            isCurved: true,
            preventCurveOverShooting: true,
            color: config.color,
            barWidth: 2,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
        );
        barIndex++;
      }
    }

    return LineChart(
      LineChartData(
        minY: minY,
        maxY: maxY,
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (spots) {
              return spots.map((spot) {
                final color = colorMap[spot.barIndex] ?? AppColors.onSurface;
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
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
        lineBarsData: lineBarsData,
      ),
    );
  }
}

class _TimeRangeSelector extends StatelessWidget {
  const _TimeRangeSelector({
    required this.selected,
    required this.onChanged,
  });

  final CombinedChartTimeRange selected;
  final ValueChanged<CombinedChartTimeRange> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: CombinedChartTimeRange.values.map((range) {
          final isSelected = range == selected;
          return Padding(
            padding: const EdgeInsets.only(left: 4),
            child: ChoiceChip(
              label: Text(_rangeLabel(range)),
              selected: isSelected,
              onSelected: (_) => onChanged(range),
              visualDensity: VisualDensity.compact,
            ),
          );
        }).toList(),
      ),
    );
  }

  String _rangeLabel(CombinedChartTimeRange range) {
    return switch (range) {
      CombinedChartTimeRange.week => '1W',
      CombinedChartTimeRange.month => '1M',
      CombinedChartTimeRange.threeMonths => '3M',
      CombinedChartTimeRange.year => '1Y',
    };
  }
}

class _ChartLegend extends StatelessWidget {
  const _ChartLegend({required this.visibleMetrics});

  final Set<_MetricKey> visibleMetrics;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 12,
      runSpacing: 4,
      children: _metricConfigs
          .where((config) => visibleMetrics.contains(config.key))
          .map((config) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 3,
              decoration: BoxDecoration(
                color: config.color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 4),
            Text(
              config.name,
              style: TextStyle(
                fontSize: 10,
                color: config.color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        );
      }).toList(),
    );
  }
}
