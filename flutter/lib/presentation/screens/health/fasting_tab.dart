import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class FastingTab extends ConsumerStatefulWidget {
  const FastingTab({super.key});

  @override
  ConsumerState<FastingTab> createState() => _FastingTabState();
}

class _FastingTabState extends ConsumerState<FastingTab> {
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
      if (mounted) {
        setState(() {
          _elapsed = DateTime.now().difference(startTime);
        });
      }
    });
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours.toString().padLeft(2, '0');
    final minutes = (d.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final fastingAsync = ref.watch(fastingProvider);
    final historyAsync = ref.watch(fastingHistoryProvider);
    final theme = Theme.of(context);

    return fastingAsync.when(
      data: (activeSession) {
        if (activeSession != null && _timer == null) {
          _startTimer(activeSession.startTime);
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Fasting',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Column(
                  children: [
                    Text(
                      activeSession != null
                          ? _formatDuration(_elapsed)
                          : '--:--:--',
                      style: theme.textTheme.displayLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: activeSession != null
                            ? AppColors.primary
                            : AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      activeSession != null
                          ? 'Started ${_formatTime(activeSession.startTime)}'
                          : 'Not fasting',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: 200,
                      child: activeSession != null
                          ? FilledButton.icon(
                              onPressed: () {
                                _timer?.cancel();
                                _timer = null;
                                ref.read(fastingProvider.notifier).stop();
                              },
                              icon: const Icon(Icons.stop),
                              label: const Text('Stop Fasting'),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.error,
                              ),
                            )
                          : FilledButton.icon(
                              onPressed: () {
                                ref.read(fastingProvider.notifier).start();
                              },
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Start Fasting'),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'History',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              historyAsync.when(
                data: (history) {
                  if (history.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'No fasting history',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                    );
                  }
                  return Column(
                    children: history.map((session) {
                      final dur = Duration(minutes: session.duration);
                      return Card(
                        child: ListTile(
                          leading: const Icon(
                            Icons.timer_outlined,
                            color: AppColors.primary,
                          ),
                          title: Text(
                            '${dur.inHours}h ${dur.inMinutes % 60}m',
                          ),
                          subtitle: Text(
                            '${_formatDate(session.startTime)} ${_formatTime(session.startTime)} - ${session.endTime != null ? _formatTime(session.endTime!) : "active"}',
                          ),
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
    );
  }

  String _formatTime(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _formatDate(DateTime t) =>
      '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}';
}
