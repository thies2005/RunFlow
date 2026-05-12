import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';

Color _stateColor(ReadinessState state) {
  switch (state) {
    case ReadinessState.excellent:
      return AppColors.success;
    case ReadinessState.good:
      return AppColors.peaked;
    case ReadinessState.moderate:
      return AppColors.warning;
    case ReadinessState.reduced:
      return AppColors.fatigued;
    case ReadinessState.rest:
      return AppColors.error;
    case ReadinessState.unavailable:
      return AppColors.onSurfaceVariant;
  }
}

String _stateLabel(ReadinessState state) {
  switch (state) {
    case ReadinessState.excellent:
      return 'Excellent';
    case ReadinessState.good:
      return 'Good';
    case ReadinessState.moderate:
      return 'Moderate';
    case ReadinessState.reduced:
      return 'Reduced';
    case ReadinessState.rest:
      return 'Rest';
    case ReadinessState.unavailable:
      return 'Unknown';
  }
}

String _confidenceLabel(DataConfidence confidence) {
  switch (confidence) {
    case DataConfidence.full:
      return 'Full';
    case DataConfidence.partial:
      return 'Partial';
    case DataConfidence.estimated:
      return 'Estimated';
    case DataConfidence.unavailable:
      return '\u2014';
  }
}

class ReadinessDetailScreen extends ConsumerStatefulWidget {
  const ReadinessDetailScreen({super.key});

  @override
  ConsumerState<ReadinessDetailScreen> createState() =>
      _ReadinessDetailScreenState();
}

class _ReadinessDetailScreenState
    extends ConsumerState<ReadinessDetailScreen> {
  double _exhaustionLevel = 5;
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final readinessAsync = ref.watch(readinessProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Morning Readiness')),
      body: readinessAsync.when(
        data: (record) {
          if (record == null || record.state == ReadinessState.unavailable) {
            return _buildEmpty(context);
          }
          return _buildContent(context, record);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _buildEmpty(context),
      ),
    );
  }

  Widget _buildEmpty(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.monitor_heart_outlined,
            size: 48,
            color: AppColors.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'No readiness data',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => ref.read(readinessProvider.notifier).refresh(),
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, DailyReadinessRecord record) {
    return RefreshIndicator(
      onRefresh: () => ref.read(readinessProvider.notifier).refresh(),
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _ScoreHeader(record: record),
                const SizedBox(height: 24),
                _ComponentBreakdown(record: record),
                const SizedBox(height: 24),
                if (record.reasons.isNotEmpty) ...[
                  _ReasonsSection(reasons: record.reasons),
                  const SizedBox(height: 24),
                ],
                const _HistoryChart(),
                const SizedBox(height: 24),
                const _WorkoutAdaptationCard(),
                const SizedBox(height: 24),
                if (record.subjective == null ||
                    record.subjective!.enteredAt == null)
                  _SubjectiveFeelSection(
                    exhaustionLevel: _exhaustionLevel,
                    onExhaustionChanged: (v) =>
                        setState(() => _exhaustionLevel = v),
                    noteController: _noteController,
                    onSubmit: () {
                      ref.read(readinessProvider.notifier).saveSubjectiveInput(
                            SubjectiveInput(
                              exhaustionLevel: _exhaustionLevel.round(),
                              note: _noteController.text.isEmpty
                                  ? null
                                  : _noteController.text,
                              enteredAt: DateTime.now(),
                            ),
                          );
                    },
                  ),
                const SizedBox(height: 16),
                _OverrideActions(record: record),
                const SizedBox(height: 24),
                _Footer(
                  record: record,
                  onRefresh: () =>
                      ref.read(readinessProvider.notifier).refresh(),
                ),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreHeader extends StatelessWidget {
  const _ScoreHeader({required this.record});

  final DailyReadinessRecord record;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _stateColor(record.state);
    final score = record.compositeScore.round();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.15),
            ),
            alignment: Alignment.center,
            child: Text(
              '$score',
              style: theme.textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: color,
                height: 1,
              ),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _stateLabel(record.state),
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                _ConfidenceBadge(confidence: record.confidence),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ConfidenceBadge extends StatelessWidget {
  const _ConfidenceBadge({required this.confidence});

  final DataConfidence confidence;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = _confidenceLabel(confidence);
    final color = confidence == DataConfidence.full
        ? AppColors.success
        : confidence == DataConfidence.partial
            ? AppColors.warning
            : AppColors.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ComponentBreakdown extends StatelessWidget {
  const _ComponentBreakdown({required this.record});

  final DailyReadinessRecord record;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scores = <ReadinessComponent, ComponentScore>{};
    for (final s in record.componentScores) {
      scores[s.component] = s;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Component Breakdown',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        _ComponentRow(
          icon: Icons.favorite_outline,
          label: 'HRR',
          score: scores[ReadinessComponent.hrr],
          details: [
            if (record.rhr?.todayRhr != null)
              'Today: ${record.rhr!.todayRhr!.round()} bpm',
            if (record.rhr?.baselineRhr != null)
              'Baseline: ${record.rhr!.baselineRhr!.round()} bpm',
            if (record.rhr?.rhrDelta != null)
              '\u0394 ${record.rhr!.rhrDelta! > 0 ? '+' : ''}${record.rhr!.rhrDelta!.round()}',
          ],
        ),
        const SizedBox(height: 8),
        _ComponentRow(
          icon: Icons.nightlight_round,
          label: 'Sleep',
          score: scores[ReadinessComponent.sleep],
          details: [
            if (record.sleep?.totalDurationMinutes != null)
              '${(record.sleep!.totalDurationMinutes! / 60).toStringAsFixed(1)}h',
            if (record.sleep?.deepPercent != null)
              '${record.sleep!.deepPercent!.round()}% deep',
            if (record.sleep?.remPercent != null)
              '${record.sleep!.remPercent!.round()}% REM',
          ],
        ),
        const SizedBox(height: 8),
        _ComponentRow(
          icon: Icons.fitness_center_outlined,
          label: 'Load',
          score: scores[ReadinessComponent.load],
          details: [
            if (record.load?.todayTrimp != null)
              'TRIMP: ${record.load!.todayTrimp!.round()}',
            if (record.load?.atl != null)
              'ATL: ${record.load!.atl!.round()}',
            if (record.load?.ctl != null)
              'CTL: ${record.load!.ctl!.round()}',
            if (record.load?.tsb != null)
              'TSB: ${record.load!.tsb! > 0 ? '+' : ''}${record.load!.tsb!.round()}',
            if (record.load?.workloadRatio != null)
              'Ratio: ${record.load!.workloadRatio!.toStringAsFixed(1)}',
          ],
        ),
        const SizedBox(height: 8),
        _ComponentRow(
          icon: Icons.sentiment_satisfied_outlined,
          label: 'Feel',
          score: scores[ReadinessComponent.subjective],
          details: [
            if (record.subjective?.exhaustionLevel != null)
              'Exhaustion: ${record.subjective!.exhaustionLevel}/10',
          ],
        ),
      ],
    );
  }
}

class _ComponentRow extends StatelessWidget {
  const _ComponentRow({
    required this.icon,
    required this.label,
    required this.score,
    required this.details,
  });

  final IconData icon;
  final String label;
  final ComponentScore? score;
  final List<String> details;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final available = score != null && score!.isAvailable;
    final value = available ? '${score!.score.round()}' : '\u2014';
    final color = available ? _stateColor(ReadinessState.good) : AppColors.onSurfaceVariant;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.onSurface,
                ),
              ),
              const Spacer(),
              Text(
                value,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: available ? score!.score / 100 : 0,
              minHeight: 4,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          if (details.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              details.join(' \u00b7 '),
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ReasonsSection extends StatelessWidget {
  const _ReasonsSection({required this.reasons});

  final List<String> reasons;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Reasons',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        ...reasons.map(
          (r) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withValues(alpha: 0.6),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    r,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _HistoryChart extends ConsumerWidget {
  const _HistoryChart();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final start = today.subtract(const Duration(days: 6));
    final range = ReadinessHistoryRange(start: start, end: today);
    final historyAsync = ref.watch(readinessHistoryProvider(range));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '7-Day History',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: historyAsync.when(
            data: (records) {
              if (records.isEmpty) {
                return Center(
                  child: Text(
                    'No history yet',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                );
              }

              final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              final dayMap = <int, DailyReadinessRecord>{};
              for (final r in records) {
                final offset = r.date.difference(start).inDays;
                if (offset >= 0 && offset <= 6) {
                  dayMap[offset] = r;
                }
              }

              if (dayMap.isEmpty) {
                return Center(
                  child: Text(
                    'No history yet',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                );
              }

              final spots = dayMap.entries
                  .map((e) => FlSpot(e.key.toDouble(), e.value.compositeScore))
                  .toList();

              return LineChart(
                LineChartData(
                  minY: 0,
                  maxY: 100,
                  minX: 0,
                  maxX: 6,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 20,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: theme.colorScheme.surfaceContainerHighest,
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        getTitlesWidget: (value, meta) => Text(
                          '${value.toInt()}',
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
                        reservedSize: 24,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= 0 && idx <= 6) {
                            final date = start.add(Duration(days: idx));
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                weekdays[date.weekday - 1],
                                style:
                                    theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.onSurfaceVariant,
                                  fontSize: 10,
                                ),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
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
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary.withValues(alpha: 0.3),
                            AppColors.primary.withValues(alpha: 0.05),
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ],
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipItems: (spots) => spots
                          .map(
                            (s) => LineTooltipItem(
                              '${s.y.round()}',
                              const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => Center(
              child: Text(
                'No history yet',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _WorkoutAdaptationCard extends ConsumerWidget {
  const _WorkoutAdaptationCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(readinessProvider.notifier);
    final adapted = notifier.adaptedWorkout;
    if (adapted == null) return const SizedBox.shrink();

    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Workout Adaptation',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.warning.withValues(alpha: 0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Planned',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          adapted.originalType,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward, size: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Adapted',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          adapted.adaptedType,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.warning,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                adapted.reason,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () => ref
                          .read(readinessProvider.notifier)
                          .acceptAdaptation(adapted.originalWorkoutId),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.success,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Accept'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => ref
                          .read(readinessProvider.notifier)
                          .overrideHarder(null),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Override'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => ref
                          .read(readinessProvider.notifier)
                          .overrideEasier(null),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Rest'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SubjectiveFeelSection extends StatelessWidget {
  const _SubjectiveFeelSection({
    required this.exhaustionLevel,
    required this.onExhaustionChanged,
    required this.noteController,
    required this.onSubmit,
  });

  final double exhaustionLevel;
  final ValueChanged<double> onExhaustionChanged;
  final TextEditingController noteController;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How do you feel?',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Exhaustion',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${exhaustionLevel.round()}/10',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: exhaustionLevel > 7
                          ? AppColors.error
                          : exhaustionLevel > 4
                              ? AppColors.warning
                              : AppColors.success,
                    ),
                  ),
                ],
              ),
              Slider(
                value: exhaustionLevel,
                min: 1,
                max: 10,
                divisions: 9,
                onChanged: onExhaustionChanged,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: noteController,
                decoration: InputDecoration(
                  hintText: 'Add a note (optional)',
                  hintStyle: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  isDense: true,
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onSubmit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Submit'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OverrideActions extends ConsumerWidget {
  const _OverrideActions({required this.record});

  final DailyReadinessRecord record;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Override',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () =>
                    ref.read(readinessProvider.notifier).overrideHarder(null),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  side: const BorderSide(color: AppColors.warning),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text('Harder'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () =>
                    ref.read(readinessProvider.notifier).overrideEasier(null),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text('Easier'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.record, required this.onRefresh});

  final DailyReadinessRecord record;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lastSynced = record.computedAt;

    return Row(
      children: [
        const Icon(Icons.sync, size: 14, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            lastSynced != null
                ? 'Last synced: ${lastSynced.hour.toString().padLeft(2, '0')}:${lastSynced.minute.toString().padLeft(2, '0')}'
                : 'Not synced',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        TextButton(
          onPressed: onRefresh,
          child: Text(
            'Refresh',
            style: theme.textTheme.labelSmall?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
