import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class BodyScreen extends ConsumerWidget {
  const BodyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final measurementsAsync = ref.watch(bodyMeasurementsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Body'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            onPressed: () => _showAddDialog(context, ref),
            icon: const Icon(Icons.add, color: AppColors.primary),
          ),
        ],
      ),
      body: measurementsAsync.when(
        data: (measurements) {
          if (measurements.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.monitor_weight_outlined, size: 64, color: AppColors.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text('No measurements yet', style: theme.textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => _showAddDialog(context, ref),
                    child: const Text('Add First Measurement'),
                  ),
                ],
              ),
            );
          }
          final sorted = List<BodyMeasurement>.from(measurements)
            ..sort((a, b) => a.date.compareTo(b.date));
          final recent = sorted.length > 30 ? sorted.sublist(sorted.length - 30) : sorted;
          final latest = sorted.last;
          final prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Stats row
                _StatsRow(latest: latest, prev: prev),
                const SizedBox(height: 16),
                // BMI card
                _BmiCard(weight: latest.weight),
                const SizedBox(height: 16),
                // Weight chart
                _WeightChart(measurements: recent),
                const SizedBox(height: 16),
                // Body fat chart
                _BodyFatChart(measurements: recent),
                const SizedBox(height: 16),
                // Measurements history
                _HistorySection(sorted: sorted),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _showAddDialog(BuildContext context, WidgetRef ref) {
    final weightCtl = TextEditingController();
    final bfCtl = TextEditingController();
    final waistCtl = TextEditingController();
    final chestCtl = TextEditingController();
    final hipsCtl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceDarkVariant,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.onSurfaceVariant, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 20),
            Text('Log Measurement', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: TextField(controller: weightCtl, decoration: const InputDecoration(labelText: 'Weight (kg)'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: bfCtl, decoration: const InputDecoration(labelText: 'Body Fat (%)'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: waistCtl, decoration: const InputDecoration(labelText: 'Waist (cm)'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: chestCtl, decoration: const InputDecoration(labelText: 'Chest (cm)'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: hipsCtl, decoration: const InputDecoration(labelText: 'Hips (cm)'), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
            ]),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  final m = BodyMeasurement(
                    id: 0,
                    date: DateTime.now(),
                    weight: double.tryParse(weightCtl.text) ?? 0.0,
                    bodyFat: double.tryParse(bfCtl.text) ?? 0.0,
                    chest: double.tryParse(chestCtl.text),
                    waist: double.tryParse(waistCtl.text),
                    hips: double.tryParse(hipsCtl.text),
                  );
                  await ref.read(healthRepositoryProvider).saveBodyMeasurement(m);
                  try {
                    await ref.read(healthApiRepositoryProvider).syncBodyMeasurement(m);
                  } catch (e) {
                    debugPrint('[BodyScreen] Sync body measurement failed: $e');
                  }
                  ref.invalidate(bodyMeasurementsProvider);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                },
                child: const Text('Save'),
              ),
            ),
          ],
        ),
      ),
    ).whenComplete(() {
      weightCtl.dispose();
      bfCtl.dispose();
      waistCtl.dispose();
      chestCtl.dispose();
      hipsCtl.dispose();
    });
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.latest, required this.prev});
  final BodyMeasurement latest;
  final BodyMeasurement? prev;

  @override
  Widget build(BuildContext context) {
    final weightDiff = prev != null ? latest.weight - prev!.weight : 0.0;
    final bfDiff = prev != null ? latest.bodyFat - prev!.bodyFat : 0.0;

    return Row(
      children: [
        Expanded(child: _StatCard(label: 'Weight', value: '${latest.weight.toStringAsFixed(1)} kg',
          diff: prev != null ? '${weightDiff > 0 ? '+' : ''}${weightDiff.toStringAsFixed(1)} kg' : null,
          diffPositive: weightDiff < 0)),
        const SizedBox(width: 10),
        Expanded(child: _StatCard(label: 'Body Fat', value: '${latest.bodyFat.toStringAsFixed(1)}%',
          diff: prev != null ? '${bfDiff > 0 ? '+' : ''}${bfDiff.toStringAsFixed(1)}%' : null,
          diffPositive: bfDiff < 0)),
        if (latest.waist != null) ...[
          const SizedBox(width: 10),
          Expanded(child: _StatCard(label: 'Waist', value: '${latest.waist!.toStringAsFixed(1)} cm')),
        ],
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, this.diff, this.diffPositive});
  final String label;
  final String value;
  final String? diff;
  final bool? diffPositive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          if (diff != null)
            Text(diff!, style: theme.textTheme.bodySmall?.copyWith(
              color: diffPositive == true ? AppColors.success : AppColors.error,
            )),
        ],
      ),
    );
  }
}

class _BmiCard extends ConsumerWidget {
  const _BmiCard({required this.weight});
  final double weight;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final profileHeight = ref.watch(profileProvider).value?.height;
    final height = (profileHeight ?? 175.0) / 100.0;
    final bmi = weight / (height * height);
    final category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    final color = bmi < 18.5 ? AppColors.warning : bmi < 25 ? AppColors.success : bmi < 30 ? AppColors.fatigued : AppColors.error;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('BMI', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(bmi.toStringAsFixed(1), style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700, color: color)),
                Text(category, style: theme.textTheme.bodySmall?.copyWith(color: color)),
              ],
            ),
          ),
          SizedBox(
            width: 100,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (bmi / 40).clamp(0.0, 1.0),
                minHeight: 10,
                backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.measurements});
  final List<BodyMeasurement> measurements;

  @override
  Widget build(BuildContext context) {
    if (measurements.length < 2) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final spots = measurements.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.weight)).toList();
    final minY = measurements.map((m) => m.weight).reduce((a, b) => a < b ? a : b) - 1;
    final maxY = measurements.map((m) => m.weight).reduce((a, b) => a > b ? a : b) + 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Weight Trend', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          SizedBox(
            height: 160,
            child: LineChart(LineChartData(
              minY: minY, maxY: maxY,
              gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => FlLine(color: AppColors.onSurfaceVariant.withValues(alpha: 0.1), strokeWidth: 1)),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (v, _) => Text(v.toStringAsFixed(1), style: theme.textTheme.bodySmall))),
                bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [LineChartBarData(
                spots: spots, isCurved: true, color: AppColors.primary, barWidth: 2,
                dotData: FlDotData(show: measurements.length <= 10),
                belowBarData: BarAreaData(show: true, color: AppColors.primary.withValues(alpha: 0.08)),
              )],
            )),
          ),
        ],
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
    final spots = measurements.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.bodyFat)).toList();
    final minY = measurements.map((m) => m.bodyFat).reduce((a, b) => a < b ? a : b) - 1;
    final maxY = measurements.map((m) => m.bodyFat).reduce((a, b) => a > b ? a : b) + 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Body Fat Trend', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          SizedBox(
            height: 140,
            child: LineChart(LineChartData(
              minY: minY, maxY: maxY,
              gridData: const FlGridData(show: false),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(1)}%', style: theme.textTheme.bodySmall))),
                bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [LineChartBarData(
                spots: spots, isCurved: true, color: AppColors.peaked, barWidth: 2,
                dotData: FlDotData(show: measurements.length <= 10),
                belowBarData: BarAreaData(show: true, color: AppColors.peaked.withValues(alpha: 0.08)),
              )],
            )),
          ),
        ],
      ),
    );
  }
}

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.sorted});
  final List<BodyMeasurement> sorted;

  String _fmt(DateTime t) => '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}/${t.year}';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('History', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 8),
        ...sorted.reversed.take(10).map((m) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(12)),
          child: Row(
            children: [
              const Icon(Icons.monitor_weight, color: AppColors.primary, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${m.weight.toStringAsFixed(1)} kg · ${m.bodyFat.toStringAsFixed(1)}% bf',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    Text(_fmt(m.date), style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              if (m.waist != null)
                Text('W: ${m.waist!.toStringAsFixed(1)}cm', style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
            ],
          ),
        )),
      ],
    );
  }
}
