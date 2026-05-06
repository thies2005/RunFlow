import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class FastingScreen extends ConsumerStatefulWidget {
  const FastingScreen({super.key});

  @override
  ConsumerState<FastingScreen> createState() => _FastingScreenState();
}

class _FastingScreenState extends ConsumerState<FastingScreen> {
  Timer? _timer;
  Duration _elapsed = Duration.zero;
  bool _timerStarted = false;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _startTimerFromProvider();
  }

  void _startFasting(int targetHours) {
    final scheduleNotifier = ref.read(fastingScheduleNotifierProvider.notifier);
    final current = ref.read(fastingScheduleNotifierProvider);
    scheduleNotifier.save(current.copyWith(targetHours: targetHours.toDouble()));
    ref.read(fastingProvider.notifier).start();
  }

  void _startTimerFromProvider() {
    final fastingAsync = ref.read(fastingProvider);
    fastingAsync.whenData((activeSession) {
      if (activeSession != null) {
        _startTimer(activeSession.startTime);
        _timerStarted = true;
      }
    });
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
        title: Text(S.of(context).healthFasting),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: fastingAsync.when(
        data: (activeSession) {
          if (activeSession != null && !_timerStarted) {
            _startTimer(activeSession.startTime);
            _timerStarted = true;
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
                _FastingTimerCard(
                  activeSession: activeSession,
                  elapsed: _elapsed,
                  fmtDuration: _fmtDuration,
                  fmtTime: _fmtTime,
                  targetHours: ref.watch(fastingScheduleNotifierProvider).targetHours,
                  onStart: () => _startFasting(ref.read(fastingScheduleNotifierProvider).targetHours.toInt()),
                  onStop: () {
                    _timer?.cancel();
                    _timer = null;
                    ref.read(fastingProvider.notifier).stop();
                  },
                ),
                const SizedBox(height: 16),
                if (activeSession == null) ...[
                  _FastingScheduleSection(),
                  const SizedBox(height: 16),
                  Text(S.of(context).fastingQuickStart, style: theme.textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  _FastingPresets(
                    onStart: (hours) => _startFasting(hours),
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
                Text(S.of(context).fastingHistoryTitle, style: theme.textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                historyAsync.when(
                  data: (history) {
                    if (history.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(child: Text(S.of(context).fastingNoHistory, style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant))),
                      );
                    }
                    return Column(
                      children: history.map((session) {
                        final dur = Duration(minutes: session.duration);
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
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
                                      '${_fmtDate(session.startTime)} ${_fmtTime(session.startTime)} – ${session.endTime != null ? _fmtTime(session.endTime!) : S.of(context).fastingActive}',
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
                  error: (e, _) => Center(child: Text('${S.of(context).actionError}: $e')),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('${S.of(context).actionError}: $e')),
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
    required this.targetHours,
  });

  final FastingSession? activeSession;
  final Duration elapsed;
  final String Function(Duration) fmtDuration;
  final String Function(DateTime) fmtTime;
  final VoidCallback onStart;
  final VoidCallback onStop;
  final double targetHours;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isActive = activeSession != null;
    final progressPct = isActive ? (elapsed.inMinutes / (targetHours * 60)).clamp(0.0, 1.0) : 0.0;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive
              ? [AppColors.fatigued.withValues(alpha: 0.15), Theme.of(context).colorScheme.surfaceContainerHighest]
              : [Theme.of(context).colorScheme.surfaceContainerHighest, Theme.of(context).colorScheme.surfaceContainerHighest],
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
                      isActive ? S.of(context).fastingPctOfTarget((progressPct * 100).toInt(), targetHours.toInt()) : S.of(context).healthNotFasting,
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
              S.of(context).fastingStartedAt(fmtTime(activeSession!.startTime)),
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
            ),
          const SizedBox(height: 16),
          SizedBox(
            width: 200,
            child: isActive
                ? FilledButton.icon(
                    onPressed: onStop,
                    icon: const Icon(Icons.stop),
                    label: Text(S.of(context).fastingStopFasting),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.error),
                  )
                : FilledButton.icon(
                    onPressed: onStart,
                    icon: const Icon(Icons.play_arrow),
                    label: Text(S.of(context).fastingStartFasting),
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
  final void Function(int targetHours) onStart;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final presets = [
      ('12:12', S.of(context).fastingPresetHours(12), 12),
      ('16:8', S.of(context).fastingPresetHours(16), 16),
      ('18:6', S.of(context).fastingPresetHours(18), 18),
      ('20:4', S.of(context).fastingPresetHours(20), 20),
    ];
    return Row(
      children: presets.map((p) => Expanded(
        child: GestureDetector(
          onTap: () => onStart(p.$3),
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
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
            Expanded(child: _StatsChip(S.of(context).fastingTotalSessions, '${history.length}', AppColors.primary)),
            const SizedBox(width: 10),
            Expanded(child: _StatsChip(S.of(context).fastingAverage, fmtDuration(avgMin), AppColors.fatigued)),
            const SizedBox(width: 10),
            Expanded(child: _StatsChip(S.of(context).fastingLongest, fmtDuration(longestMin), AppColors.success)),
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
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Text(value, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700, color: color)),
          Text(label, style: theme.textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant, fontSize: 9), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _FastingScheduleSection extends ConsumerStatefulWidget {
  @override
  ConsumerState<_FastingScheduleSection> createState() =>
      _FastingScheduleSectionState();
}

class _FastingScheduleSectionState
    extends ConsumerState<_FastingScheduleSection> {
  late TimeOfDay _fastingStartTime;
  late TimeOfDay _eatingStartTime;
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final schedule = ref.watch(fastingScheduleNotifierProvider);
    if (!_initialized) {
      _fastingStartTime = TimeOfDay(
        hour: schedule.fastingStartHour,
        minute: schedule.fastingStartMinute,
      );
      _eatingStartTime = TimeOfDay(
        hour: schedule.fastingEndHour,
        minute: schedule.fastingEndMinute,
      );
      _initialized = true;
    }
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: schedule.isEnabled
              ? AppColors.fatigued.withValues(alpha: 0.3)
              : Colors.transparent,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Daily Schedule',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Switch(
                value: schedule.isEnabled,
                activeColor: AppColors.fatigued,
                onChanged: (val) {
                  ref.read(fastingScheduleNotifierProvider.notifier).save(
                        schedule.copyWith(isEnabled: val),
                      );
                },
              ),
            ],
          ),
          if (schedule.isEnabled) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _TimePickerTile(
                    label: 'Fast starts',
                    time: _fastingStartTime,
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _fastingStartTime,
                      );
                      if (picked != null) {
                        setState(() => _fastingStartTime = picked);
                        ref.read(fastingScheduleNotifierProvider.notifier).save(
                              schedule.copyWith(
                                fastingStartHour: picked.hour,
                                fastingStartMinute: picked.minute,
                              ),
                            );
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TimePickerTile(
                    label: 'Eating starts',
                    time: _eatingStartTime,
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _eatingStartTime,
                      );
                      if (picked != null) {
                        setState(() => _eatingStartTime = picked);
                        ref.read(fastingScheduleNotifierProvider.notifier).save(
                              schedule.copyWith(
                                fastingEndHour: picked.hour,
                                fastingEndMinute: picked.minute,
                              ),
                            );
                      }
                    },
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _TimePickerTile extends StatelessWidget {
  const _TimePickerTile({
    required this.label,
    required this.time,
    required this.onTap,
  });

  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.fatigued,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
