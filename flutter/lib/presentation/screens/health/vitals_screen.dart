import 'dart:async';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';

class VitalsScreen extends ConsumerWidget {
  const VitalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vitalsAsync = ref.watch(vitalsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).healthVitals),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: AppColors.primary),
            tooltip: S.of(context).vitalsSyncFromHc,
            onPressed: () => ref.read(vitalsProvider.notifier).refresh(),
          ),
        ],
      ),
      body: vitalsAsync.when(
        data: (vitals) =>
            vitals.hasData ? _VitalsContent(vitals: vitals) : _ConnectPrompt(onSync: () async {
              final granted =
                  await ref.read(healthPermissionsProvider.notifier).requestPermissions();
              if (granted) {
                unawaited(ref.read(vitalsProvider.notifier).refresh());
              }
            }),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _ConnectPrompt(onSync: () async {
          final granted =
              await ref.read(healthPermissionsProvider.notifier).requestPermissions();
          if (granted) {
            unawaited(ref.read(vitalsProvider.notifier).refresh());
          }
        }),
      ),
    );
  }
}

class _VitalsContent extends StatelessWidget {
  const _VitalsContent({required this.vitals});
  final VitalsData vitals;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Metrics row
          Row(children: [
            if (vitals.restingHeartRate != null)
              Expanded(
                child: _VitalCard(
                  icon: Icons.favorite,
                  label: S.of(context).vitalsRestingHr,
                  value: vitals.restingHeartRate!.toInt().toString(),
                  unit: 'bpm',
                  color: AppColors.error,
                  subtext: _hrCategory(context, vitals.restingHeartRate!),
                ),
              ),
            if (vitals.restingHeartRate != null && vitals.hrv != null)
              const SizedBox(width: 10),
            if (vitals.hrv != null)
              Expanded(
                child: _VitalCard(
                  icon: Icons.monitor_heart,
                  label: 'HRV',
                  value: vitals.hrv!.toStringAsFixed(0),
                  unit: 'ms',
                  color: AppColors.success,
                  subtext: _hrvCategory(context, vitals.hrv!),
                ),
              ),
          ]),
          if (vitals.spo2 != null) ...[
            const SizedBox(height: 10),
            _VitalCard(
              icon: Icons.air,
              label: S.of(context).vitalsBloodOxygen,
                  value: vitals.spo2!.toStringAsFixed(1),
              unit: '%',
              color: AppColors.peaked,
              subtext: vitals.spo2! >= 95 ? S.of(context).vitalsNormal : S.of(context).vitalsLowSeeDoctor,
            ),
          ],
          const SizedBox(height: 16),
          // 7-Day HR Trend chart
          if (vitals.hrTrend.isNotEmpty) ...[
            _HrTrendChart(hrTrend: vitals.hrTrend),
            const SizedBox(height: 16),
          ],
          // 7-Day HRV Trend chart
          if (vitals.hrvTrend.isNotEmpty) ...[
            _HrvTrendChart(hrvTrend: vitals.hrvTrend),
            const SizedBox(height: 16),
          ],
          // Last synced
          if (vitals.lastSynced != null)
            Center(
              child: Text(
                S.of(context).vitalsSynced(_fmtTime(vitals.lastSynced!)),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
              ),
            ),
        ],
      ),
    );
  }

  String _hrCategory(BuildContext context, double hr) {
    final s = S.of(context);
    if (hr < 50) return s.vitalsAthletic;
    if (hr < 60) return s.vitalsExcellent;
    if (hr < 70) return s.vitalsGood;
    if (hr < 80) return s.vitalsAverage;
    return s.vitalsAboveAverage;
  }

  String _hrvCategory(BuildContext context, double hrv) {
    final s = S.of(context);
    if (hrv > 70) return s.vitalsExcellentRecovery;
    if (hrv > 50) return s.vitalsGoodRecovery;
    if (hrv > 30) return s.vitalsModerate;
    return s.vitalsLowConsiderRest;
  }

  String _fmtTime(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')} '
      '${t.day}/${t.month}/${t.year}';
}

class _VitalCard extends StatelessWidget {
  const _VitalCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
    required this.subtext,
  });

  final IconData icon;
  final String label;
  final String value;
  final String unit;
  final Color color;
  final String subtext;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color.withValues(alpha: 0.12),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppColors.onSurfaceVariant)),
            ),
          ]),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(value,
                  style: theme.textTheme.displaySmall
                      ?.copyWith(fontWeight: FontWeight.w800, color: color, fontSize: 36)),
              const SizedBox(width: 4),
              Text(unit,
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: AppColors.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 4),
          Text(subtext,
              style: theme.textTheme.labelSmall
                  ?.copyWith(color: color.withValues(alpha: 0.8))),
        ],
      ),
    );
  }
}

class _HrTrendChart extends StatelessWidget {
  const _HrTrendChart({required this.hrTrend});
  final Map<DateTime, double> hrTrend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sorted = hrTrend.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final spots = sorted.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.value);
    }).toList();

    final minY = sorted.map((e) => e.value).reduce((a, b) => a < b ? a : b) - 5;
    final maxY = sorted.map((e) => e.value).reduce((a, b) => a > b ? a : b) + 5;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).vitals7DayRestingHr,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          SizedBox(
            height: 140,
            child: LineChart(LineChartData(
              minY: minY,
              maxY: maxY,
              gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                      strokeWidth: 1)),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 36,
                        getTitlesWidget: (v, _) => Text(
                              v.toInt().toString(),
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 10),
                            ))),
                bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) {
                          final idx = v.toInt();
                          if (idx < 0 || idx >= sorted.length) {
                            return const SizedBox.shrink();
                          }
                          final d = sorted[idx].key;
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '${d.day}/${d.month}',
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 9, color: AppColors.onSurfaceVariant),
                            ),
                          );
                        })),
                topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: AppColors.error,
                  barWidth: 2,
                  dotData: FlDotData(show: spots.length <= 7),
                  belowBarData: BarAreaData(
                      show: true,
                      color: AppColors.error.withValues(alpha: 0.08)),
                )
              ],
            )),
          ),
        ],
      ),
    );
  }
}

// ─── Connect prompt ───────────────────────────────────────────────────────────

class _HrvTrendChart extends StatelessWidget {
  const _HrvTrendChart({required this.hrvTrend});
  final Map<DateTime, double> hrvTrend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sorted = hrvTrend.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final spots = sorted.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.value);
    }).toList();

    final minY = sorted.map((e) => e.value).reduce((a, b) => a < b ? a : b) - 5;
    final maxY = sorted.map((e) => e.value).reduce((a, b) => a > b ? a : b) + 5;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).vitals7DayHrvTrend,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          SizedBox(
            height: 140,
            child: LineChart(LineChartData(
              minY: minY,
              maxY: maxY,
              gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                      strokeWidth: 1)),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 36,
                        getTitlesWidget: (v, _) => Text(
                              v.toInt().toString(),
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 10),
                            ))),
                bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) {
                          final idx = v.toInt();
                          if (idx < 0 || idx >= sorted.length) {
                            return const SizedBox.shrink();
                          }
                          final d = sorted[idx].key;
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '${d.day}/${d.month}',
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(fontSize: 9, color: AppColors.onSurfaceVariant),
                            ),
                          );
                        })),
                topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: AppColors.success,
                  barWidth: 2,
                  dotData: FlDotData(show: spots.length <= 7),
                  belowBarData: BarAreaData(
                      show: true,
                      color: AppColors.success.withValues(alpha: 0.08)),
                )
              ],
            )),
          ),
        ],
      ),
    );
  }
}

class _ConnectPrompt extends StatefulWidget {
  const _ConnectPrompt({required this.onSync});
  final Future<void> Function() onSync;

  @override
  State<_ConnectPrompt> createState() => _ConnectPromptState();
}

class _ConnectPromptState extends State<_ConnectPrompt> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.error.withValues(alpha: 0.1),
              ),
              child: const Icon(Icons.monitor_heart_outlined,
                  size: 40, color: AppColors.error),
            ),
            const SizedBox(height: 24),
            Text(S.of(context).vitalsConnectTitle,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              S.of(context).vitalsConnectMessage,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: AppColors.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _loading
                    ? null
                    : () async {
                        setState(() => _loading = true);
                        await widget.onSync();
                        if (mounted) setState(() => _loading = false);
                      },
                icon: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.sync),
                label: Text(_loading ? S.of(context).vitalsConnecting : S.of(context).vitalsConnectHc),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.pop(),
              child: Text(S.of(context).healthDismiss,
                  style: const TextStyle(color: AppColors.onSurfaceVariant)),
            ),
          ],
        ),
      ),
    );
  }
}
