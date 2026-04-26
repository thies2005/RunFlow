import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class FastingScreen extends ConsumerStatefulWidget {
  const FastingScreen({super.key});

  @override
  ConsumerState<FastingScreen> createState() => _FastingScreenState();
}

class _FastingScreenState extends ConsumerState<FastingScreen> {
  Timer? _timer;
  Duration _elapsed = Duration.zero;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer(DateTime startTime) {
    _timer?.cancel();
    _elapsed = DateTime.now().difference(startTime);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed = DateTime.now().difference(startTime));
    });
  }

  String _fmtDuration(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _fmtTime(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  String _fmtDate(DateTime t) => '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final fastingAsync = ref.watch(fastingProvider);
    final historyAsync = ref.watch(fastingHistoryProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fasting'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: fastingAsync.when(
        data: (activeSession) {
          if (activeSession != null && _timer == null) {
            _startTimer(activeSession.startTime);
          }
          if (activeSession == null && _timer != null) {
            _timer?.cancel();
            _timer = null;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Active timer card
                _FastingTimerCard(
                  activeSession: activeSession,
                  elapsed: _elapsed,
                  fmtDuration: _fmtDuration,
                  fmtTime: _fmtTime,
                  onStart: () => ref.read(fastingProvider.notifier).start(),
                  onStop: () {
                    _timer?.cancel();
                    _timer = null;
                    ref.read(fastingProvider.notifier).stop();
                  },
                ),
                const SizedBox(height: 16),
                // Fasting presets
                if (activeSession == null) ...[
                  Text('Quick Start', style: theme.textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  _FastingPresets(
                    onStart: () => ref.read(fastingProvider.notifier).start(),
                  ),
                  const SizedBox(height: 16),
                ],
                // Stats
                _FastingStats(historyAsync: historyAsync, fmtDuration: (d) {
                  final dur = Duration(minutes: d);
                  return '${dur.inHours}h ${dur.inMinutes % 60}m';
                }),
                const SizedBox(height: 16),
                // History
                Text('History', style: theme.textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                historyAsync.when(
                  data: (history) {
                    if (history.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(child: Text('No fasting history', style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant))),
                      );
                    }
                    return Column(
                      children: history.map((session) {
                        final dur = Duration(minutes: session.duration);
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(12)),
                          child: Row(
                            children: [
                              const Icon(Icons.timer_outlined, color: AppColors.primary, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${dur.inHours}h ${dur.inMinutes % 60}m',
                                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                                    Text(
                                      '${_fmtDate(session.startTime)} ${_fmtTime(session.startTime)} – ${session.endTime != null ? _fmtTime(session.endTime!) : "active"}',
                                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Error: $e')),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}

class _FastingTimerCard extends StatelessWidget {
  const _FastingTimerCard({
    required this.activeSession,
    required this.elapsed,
    required this.fmtDuration,
    required this.fmtTime,
    required this.onStart,
    required this.onStop,
  });

  final FastingSession? activeSession;
  final Duration elapsed;
  final String Function(Duration) fmtDuration;
  final String Function(DateTime) fmtTime;
  final VoidCallback onStart;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isActive = activeSession != null;
    const targetHours = 16.0;
    final progressPct = isActive ? (elapsed.inMinutes / (targetHours * 60)).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive
              ? [AppColors.fatigued.withValues(alpha: 0.15), AppColors.surfaceDarkVariant]
              : [AppColors.surfaceDarkVariant, AppColors.surfaceDarkVariant],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isActive ? AppColors.fatigued.withValues(alpha: 0.3) : Colors.transparent),
      ),
      child: Column(
        children: [
          // Progress ring
          SizedBox(
            width: 160,
            height: 160,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 160,
                  height: 160,
                  child: CircularProgressIndicator(
                    value: progressPct,
                    strokeWidth: 10,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    valueColor: AlwaysStoppedAnimation(isActive ? AppColors.fatigued : AppColors.onSurfaceVariant.withValues(alpha: 0.2)),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isActive ? fmtDuration(elapsed) : '--:--:--',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isActive ? AppColors.fatigued : AppColors.onSurfaceVariant,
                        fontSize: 22,
                      ),
                    ),
                    Text(
                      isActive ? '${(progressPct * 100).toInt()}% of ${targetHours.toInt()}h' : 'Not fasting',
                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (isActive && activeSession != null)
            Text(
              'Started at ${fmtTime(activeSession!.startTime)}',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
            ),
          const SizedBox(height: 16),
          SizedBox(
            width: 200,
            child: isActive
                ? FilledButton.icon(
                    onPressed: onStop,
                    icon: const Icon(Icons.stop),
                    label: const Text('Stop Fasting'),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.error),
                  )
                : FilledButton.icon(
                    onPressed: onStart,
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Start Fasting'),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.fatigued),
                  ),
          ),
        ],
      ),
    );
  }
}

class _FastingPresets extends StatelessWidget {
  const _FastingPresets({required this.onStart});
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final presets = [
      ('12:12', '12 hours'),
      ('16:8', '16 hours'),
      ('18:6', '18 hours'),
      ('20:4', '20 hours'),
    ];
    return Row(
      children: presets.map((p) => Expanded(
        child: GestureDetector(
          onTap: onStart,
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfaceDarkVariant,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.fatigued.withValues(alpha: 0.3)),
            ),
            child: Column(
              children: [
                Text(p.$1, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700, color: AppColors.fatigued)),
                Text(p.$2, style: theme.textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant, fontSize: 9)),
              ],
            ),
          ),
        ),
      )).toList(),
    );
  }
}

class _FastingStats extends StatelessWidget {
  const _FastingStats({required this.historyAsync, required this.fmtDuration});
  final AsyncValue<List<FastingSession>> historyAsync;
  final String Function(int) fmtDuration;

  @override
  Widget build(BuildContext context) {
    return historyAsync.when(
      data: (history) {
        if (history.isEmpty) return const SizedBox.shrink();
        final totalMin = history.fold<int>(0, (sum, s) => sum + s.duration);
        final avgMin = totalMin ~/ history.length;
        final longestMin = history.map((s) => s.duration).reduce((a, b) => a > b ? a : b);
        return Row(
          children: [
            Expanded(child: _StatsChip('Total Sessions', '${history.length}', AppColors.primary)),
            const SizedBox(width: 10),
            Expanded(child: _StatsChip('Average', fmtDuration(avgMin), AppColors.fatigued)),
            const SizedBox(width: 10),
            Expanded(child: _StatsChip('Longest', fmtDuration(longestMin), AppColors.success)),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}

class _StatsChip extends StatelessWidget {
  const _StatsChip(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surfaceDarkVariant, borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Text(value, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700, color: color)),
          Text(label, style: theme.textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant, fontSize: 9), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
