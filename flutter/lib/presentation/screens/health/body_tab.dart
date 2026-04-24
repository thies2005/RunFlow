import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class BodyTab extends ConsumerWidget {
  const BodyTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final measurementsAsync = ref.watch(bodyMeasurementsProvider);
    final theme = Theme.of(context);

    return measurementsAsync.when(
      data: (measurements) {
        final sorted = List<BodyMeasurement>.from(measurements)
          ..sort((a, b) => a.date.compareTo(b.date));
        final recent = sorted.length > 30 ? sorted.sublist(sorted.length - 30) : sorted;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Body Measurements',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton.filledTonal(
                    onPressed: () => _showAddMeasurementDialog(context, ref),
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (sorted.isNotEmpty) ...[
                _buildSummaryCards(theme, sorted),
                const SizedBox(height: 16),
                _WeightChart(measurements: recent),
                const SizedBox(height: 16),
                _BodyFatChart(measurements: recent),
              ] else
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.monitor_weight_outlined,
                          size: 48,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No measurements yet',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        FilledButton(
                          onPressed: () =>
                              _showAddMeasurementDialog(context, ref),
                          child: const Text('Add First Measurement'),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              if (sorted.isNotEmpty) ...[
                Text(
                  'History',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ...sorted.reversed.take(10).map((m) => Card(
                      child: ListTile(
                        leading: const Icon(
                          Icons.monitor_weight,
                          color: AppColors.primary,
                        ),
                        title: Text('${m.weight.toStringAsFixed(1)} kg'),
                        subtitle: Text(
                          '${m.bodyFat.toStringAsFixed(1)}% body fat - ${_formatDate(m.date)}',
                        ),
                        trailing: m.waist != null
                            ? Text(
                                'W: ${m.waist!.toStringAsFixed(1)}cm',
                                style: theme.textTheme.bodySmall,
                              )
                            : null,
                      ),
                    )),
              ],
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  Widget _buildSummaryCards(ThemeData theme, List<BodyMeasurement> sorted) {
    final latest = sorted.last;
    final prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    final weightDiff = prev != null ? latest.weight - prev.weight : 0.0;
    final bfDiff = prev != null ? latest.bodyFat - prev.bodyFat : 0.0;

    return Row(
      children: [
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Weight',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${latest.weight.toStringAsFixed(1)} kg',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (weightDiff != 0.0)
                    Text(
                      '${weightDiff > 0 ? '+' : ''}${weightDiff.toStringAsFixed(1)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: weightDiff < 0 ? AppColors.success : AppColors.error,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Body Fat',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${latest.bodyFat.toStringAsFixed(1)}%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (bfDiff != 0.0)
                    Text(
                      '${bfDiff > 0 ? '+' : ''}${bfDiff.toStringAsFixed(1)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: bfDiff < 0 ? AppColors.success : AppColors.error,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showAddMeasurementDialog(BuildContext context, WidgetRef ref) {
    final weightCtl = TextEditingController();
    final bfCtl = TextEditingController();
    final chestCtl = TextEditingController();
    final waistCtl = TextEditingController();
    final hipsCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Measurement'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: weightCtl,
                decoration: const InputDecoration(labelText: 'Weight (kg)'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: bfCtl,
                decoration: const InputDecoration(labelText: 'Body Fat (%)'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: chestCtl,
                decoration: const InputDecoration(labelText: 'Chest (cm) - optional'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: waistCtl,
                decoration: const InputDecoration(labelText: 'Waist (cm) - optional'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: hipsCtl,
                decoration: const InputDecoration(labelText: 'Hips (cm) - optional'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final measurement = BodyMeasurement(
                id: 0,
                date: DateTime.now(),
                weight: double.tryParse(weightCtl.text) ?? 0.0,
                bodyFat: double.tryParse(bfCtl.text) ?? 0.0,
                chest: double.tryParse(chestCtl.text),
                waist: double.tryParse(waistCtl.text),
                hips: double.tryParse(hipsCtl.text),
              );
              ref.read(healthRepositoryProvider).saveBodyMeasurement(measurement);
              ref.invalidate(bodyMeasurementsProvider);
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime t) =>
      '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}/${t.year}';
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.measurements});

  final List<BodyMeasurement> measurements;

  @override
  Widget build(BuildContext context) {
    if (measurements.length < 2) return const SizedBox.shrink();
    final theme = Theme.of(context);

    final spots = measurements
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.weight))
        .toList();

    final minY = measurements.map((m) => m.weight).reduce((a, b) => a < b ? a : b) - 1;
    final maxY = measurements.map((m) => m.weight).reduce((a, b) => a > b ? a : b) + 1;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Weight Trend',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 160,
              child: LineChart(
                LineChartData(
                  minY: minY,
                  maxY: maxY,
                  gridData: const FlGridData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (v, _) => Text(
                          v.toStringAsFixed(1),
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ),
                    bottomTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 2,
                      dotData: FlDotData(show: measurements.length <= 10),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.primary.withValues(alpha: 0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BodyFatChart extends StatelessWidget {
  const _BodyFatChart({required this.measurements});

  final List<BodyMeasurement> measurements;

  @override
  Widget build(BuildContext context) {
    if (measurements.length < 2) return const SizedBox.shrink();
    final theme = Theme.of(context);

    final spots = measurements
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.bodyFat))
        .toList();

    final minY = measurements.map((m) => m.bodyFat).reduce((a, b) => a < b ? a : b) - 1;
    final maxY = measurements.map((m) => m.bodyFat).reduce((a, b) => a > b ? a : b) + 1;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Body Fat Trend',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 160,
              child: LineChart(
                LineChartData(
                  minY: minY,
                  maxY: maxY,
                  gridData: const FlGridData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (v, _) => Text(
                          '${v.toStringAsFixed(1)}%',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ),
                    bottomTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppColors.peaked,
                      barWidth: 2,
                      dotData: FlDotData(show: measurements.length <= 10),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.peaked.withValues(alpha: 0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
