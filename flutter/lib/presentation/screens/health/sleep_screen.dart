import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';

class SleepScreen extends ConsumerWidget {
  const SleepScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sleepAsync = ref.watch(sleepProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).healthSleep),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: AppColors.primary),
            tooltip: S.of(context).vitalsSyncFromHc,
            onPressed: () =>
                ref.read(sleepProvider.notifier).refresh(),
          ),
        ],
      ),
      body: sleepAsync.when(
        data: (sleep) => sleep.hasData
            ? _SleepContent(sleep: sleep)
            : _SleepConnectPrompt(onSync: () async {
                final granted = await ref
                    .read(healthPermissionsProvider.notifier)
                    .requestPermissions();
                if (granted) {
                  unawaited(ref.read(sleepProvider.notifier).refresh());
                }
              }),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _SleepConnectPrompt(onSync: () async {
          final granted = await ref
              .read(healthPermissionsProvider.notifier)
              .requestPermissions();
          if (granted) {
            unawaited(ref.read(sleepProvider.notifier).refresh());
          }
        }),
      ),
    );
  }
}

class _SleepContent extends StatelessWidget {
  const _SleepContent({required this.sleep});
  final SleepData sleep;

  String _fmtTime(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalMin = sleep.lastNightMinutes;
    final hours = totalMin ~/ 60;
    final mins = totalMin % 60;
    final stagesTotal =
        sleep.deepMinutes + sleep.remMinutes + sleep.lightMinutes;
    final deepPct = stagesTotal > 0 ? sleep.deepMinutes / stagesTotal : 0.0;
    final remPct = stagesTotal > 0 ? sleep.remMinutes / stagesTotal : 0.0;
    final lightPct = stagesTotal > 0 ? sleep.lightMinutes / stagesTotal : 0.0;
    final sleepQuality = _sleepQuality(context, totalMin.toDouble());

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero summary card
          _SleepSummaryCard(
            hours: hours,
            mins: mins,
            quality: sleepQuality.$1,
            qualityColor: sleepQuality.$2,
            startTime: sleep.lastNightStart != null
                ? _fmtTime(sleep.lastNightStart!)
                : null,
            endTime: sleep.lastNightEnd != null
                ? _fmtTime(sleep.lastNightEnd!)
                : null,
          ),
          const SizedBox(height: 16),
          // Stages
          if (stagesTotal > 0)
            _SleepStagesCard(
              deepMinutes: sleep.deepMinutes,
              remMinutes: sleep.remMinutes,
              lightMinutes: sleep.lightMinutes,
              deepPct: deepPct,
              remPct: remPct,
              lightPct: lightPct,
            ),
          if (stagesTotal > 0) const SizedBox(height: 16),
          // 7-day chart
          if (sleep.recentSessions.isNotEmpty) ...[
            _SleepWeekChart(sessions: sleep.recentSessions),
            const SizedBox(height: 16),
          ],
          // Advice
          _SleepAdviceCard(hours: hours),
          const SizedBox(height: 12),
          if (sleep.lastSynced != null)
            Center(
              child: Text(
                S.of(context).sleepSynced(_fmtTime(sleep.lastSynced!)),
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: AppColors.onSurfaceVariant),
              ),
            ),
        ],
      ),
    );
  }

  (String, Color) _sleepQuality(BuildContext context, double minutes) {
    final s = S.of(context);
    if (minutes >= 480) return (s.sleepExcellent, AppColors.success);
    if (minutes >= 420) return (s.sleepGoodQuality, AppColors.success);
    if (minutes >= 360) return (s.sleepFair, AppColors.warning);
    return (s.sleepPoor, AppColors.error);
  }
}

class _SleepSummaryCard extends StatelessWidget {
  const _SleepSummaryCard({
    required this.hours,
    required this.mins,
    required this.quality,
    required this.qualityColor,
    this.startTime,
    this.endTime,
  });

  final int hours;
  final int mins;
  final String quality;
  final Color qualityColor;
  final String? startTime;
  final String? endTime;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.peaked.withValues(alpha: 0.18),
            Theme.of(context).colorScheme.surfaceContainerHighest
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.peaked.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.nightlight_round,
              color: AppColors.peaked, size: 44),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(S.of(context).sleepLastNight,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: AppColors.onSurfaceVariant)),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('${hours}h',
                        style: theme.textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface)),
                    const SizedBox(width: 4),
                    Text('${mins}m',
                        style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurfaceVariant)),
                  ],
                ),
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: qualityColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(quality,
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: qualityColor)),
                  ),
                  if (startTime != null && endTime != null) ...[
                    const SizedBox(width: 8),
                    Text('$startTime – $endTime',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: AppColors.onSurfaceVariant)),
                  ],
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SleepStagesCard extends StatelessWidget {
  const _SleepStagesCard({
    required this.deepMinutes,
    required this.remMinutes,
    required this.lightMinutes,
    required this.deepPct,
    required this.remPct,
    required this.lightPct,
  });

  final double deepMinutes;
  final double remMinutes;
  final double lightMinutes;
  final double deepPct;
  final double remPct;
  final double lightPct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).sleepStages,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          // Stacked bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: SizedBox(
              height: 16,
              child: Row(children: [
                if (deepPct > 0)
                  Flexible(
                      flex: (deepPct * 100).toInt(),
                      child: Container(color: AppColors.primary)),
                if (remPct > 0)
                  Flexible(
                      flex: (remPct * 100).toInt(),
                      child: Container(color: AppColors.peaked)),
                if (lightPct > 0)
                  Flexible(
                      flex: (lightPct * 100).toInt(),
                      child:
                          Container(color: AppColors.onSurfaceVariant.withValues(alpha: 0.5))),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          _StageRow(S.of(context).sleepDeep, deepMinutes, deepPct, AppColors.primary),
          const SizedBox(height: 6),
          _StageRow(S.of(context).sleepRem, remMinutes, remPct, AppColors.peaked),
          const SizedBox(height: 6),
          _StageRow(S.of(context).sleepLight, lightMinutes, lightPct,
              AppColors.onSurfaceVariant.withValues(alpha: 0.6)),
        ],
      ),
    );
  }
}

class _StageRow extends StatelessWidget {
  const _StageRow(this.label, this.minutes, this.pct, this.color);
  final String label;
  final double minutes;
  final double pct;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final h = minutes ~/ 60;
    final m = (minutes % 60).toInt();
    return Row(children: [
      Container(
          width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
      const SizedBox(width: 8),
      SizedBox(
          width: 42, child: Text(label, style: theme.textTheme.bodySmall)),
      Text(h > 0 ? '${h}h ${m}m' : '${m}m',
          style: theme.textTheme.bodySmall
              ?.copyWith(color: AppColors.onSurfaceVariant)),
      const Spacer(),
      Text('${(pct * 100).toInt()}%',
          style: theme.textTheme.labelSmall
              ?.copyWith(fontWeight: FontWeight.w600, color: color)),
    ]);
  }
}

class _SleepWeekChart extends StatelessWidget {
  const _SleepWeekChart({required this.sessions});
  final List<SleepSession> sessions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sorted = List<SleepSession>.from(sessions)
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).sleepRecentSessions,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          SizedBox(
            height: 110,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: sorted.map((s) {
                final h = s.hours;
                final barH = (h / 10 * 88).clamp(4.0, 88.0);
                final isGood = h >= 7;
                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('${h.toStringAsFixed(1)}h',
                          style: theme.textTheme.labelSmall?.copyWith(
                              fontSize: 8,
                              color: AppColors.onSurfaceVariant)),
                      const SizedBox(height: 2),
                      Container(
                        width: 24,
                        height: barH,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: isGood ? AppColors.peaked : AppColors.warning,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${s.startTime.day}/${s.startTime.month}',
                        style: theme.textTheme.labelSmall?.copyWith(
                            fontSize: 8,
                            color: AppColors.onSurfaceVariant),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _SleepAdviceCard extends StatelessWidget {
  const _SleepAdviceCard({required this.hours});
  final int hours;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final advice = hours >= 8
        ? (S.of(context).sleepGreatAdvice, Icons.star, AppColors.success)
        : hours >= 7
            ? (S.of(context).sleepGoodAdvice, Icons.check_circle, AppColors.warning)
            : (S.of(context).sleepPoorAdvice, Icons.warning_amber_rounded, AppColors.error);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: advice.$3.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: advice.$3.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(advice.$2, color: advice.$3, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(advice.$1,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: advice.$3, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}

// ─── Connect prompt ───────────────────────────────────────────────────────────

class _SleepConnectPrompt extends StatefulWidget {
  const _SleepConnectPrompt({required this.onSync});
  final Future<void> Function() onSync;

  @override
  State<_SleepConnectPrompt> createState() => _SleepConnectPromptState();
}

class _SleepConnectPromptState extends State<_SleepConnectPrompt> {
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
                color: AppColors.peaked.withValues(alpha: 0.1),
              ),
              child: const Icon(Icons.nightlight_round,
                  size: 40, color: AppColors.peaked),
            ),
            const SizedBox(height: 24),
            Text(S.of(context).sleepNoDataTitle,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              S.of(context).sleepNoDataMessage,
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
                        child:
                            CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.sync),
                label: Text(
                    _loading ? S.of(context).vitalsConnecting : S.of(context).vitalsConnectHc),
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
