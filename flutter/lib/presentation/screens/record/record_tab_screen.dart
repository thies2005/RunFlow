import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';
import 'package:runflow_flutter/presentation/screens/record/record_screen.dart';
import 'package:runflow_flutter/presentation/screens/record/strength_recording_screen.dart';
import 'package:runflow_flutter/data/services/workout_recording_service.dart';

enum RecordMode { running, strength }

class RecordTabScreen extends ConsumerStatefulWidget {
  const RecordTabScreen({this.workoutId, this.templateId, super.key});

  final String? workoutId;
  final String? templateId;

  @override
  ConsumerState<RecordTabScreen> createState() => _RecordTabScreenState();
}

class _RecordTabScreenState extends ConsumerState<RecordTabScreen> {
  RecordMode _currentMode = RecordMode.running;

  @override
  void initState() {
    super.initState();
    // If a strength template ID is routed directly, switch to strength tab
    if (widget.templateId != null && widget.templateId!.startsWith('template_')) {
      _currentMode = RecordMode.strength;
    }
  }

  @override
  Widget build(BuildContext context) {
    final runningStatusAsync = ref.watch(recordingStatusProvider);
    final strengthState = ref.watch(strengthRecordingProvider);

    final bool isRunningActive = runningStatusAsync.maybeWhen(
      data: (status) => status == RecordingStatus.recording || status == RecordingStatus.paused,
      orElse: () => false,
    );

    if (isRunningActive) {
      return RecordScreen(
        workoutId: widget.workoutId,
        templateId: widget.templateId,
      );
    }

    if (strengthState.isActive) {
      return const StrengthRecordingScreen();
    }

    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: SegmentedButton<RecordMode>(
          segments: const [
            ButtonSegment(
              value: RecordMode.running,
              label: Text('Running'),
              icon: Icon(Icons.directions_run),
            ),
            ButtonSegment(
              value: RecordMode.strength,
              label: Text('Strength'),
              icon: Icon(Icons.fitness_center),
            ),
          ],
          selected: {_currentMode},
          onSelectionChanged: (selected) {
            setState(() {
              _currentMode = selected.first;
            });
          },
          showSelectedIcon: false,
        ),
        centerTitle: true,
      ),
      body: _currentMode == RecordMode.running
          ? RecordScreen(
              workoutId: widget.workoutId,
              templateId: widget.templateId,
            )
          : _buildStrengthIdleView(theme),
    );
  }

  Widget _buildStrengthIdleView(ThemeData theme) {
    final templatesAsync = ref.watch(strengthTemplatesProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          elevation: 1,
          margin: const EdgeInsets.only(bottom: 24),
          color: theme.colorScheme.primaryContainer.withValues(alpha: 0.2),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Quick Start',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Start an empty workout to log exercises on the fly without a template.',
                  style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      ref.read(strengthRecordingProvider.notifier).startEmptyWorkout();
                    },
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Start Empty Workout'),
                  ),
                ),
              ],
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Routine Templates',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            TextButton.icon(
              onPressed: () => context.push('/settings/strength'),
              icon: const Icon(Icons.settings, size: 16),
              label: const Text('Manage', style: TextStyle(fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        templatesAsync.when(
          data: (templates) {
            if (templates.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  child: Column(
                    children: [
                      const Text(
                        'No routines created yet.',
                        style: TextStyle(color: AppColors.onSurfaceVariant),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.tonalIcon(
                        onPressed: () => context.push('/settings/strength/template/new'),
                        icon: const Icon(Icons.add),
                        label: const Text('Create Routine'),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: templates.length,
              itemBuilder: (context, index) {
                final template = templates[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () {
                      ref.read(strengthRecordingProvider.notifier).startWorkoutFromTemplate(template);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                template.name,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const Icon(Icons.play_arrow, color: AppColors.primary),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${template.exercises.length} exercises',
                            style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: template.exercises.take(4).map((e) {
                              return Chip(
                                label: Text(
                                  e.exerciseName,
                                  style: const TextStyle(fontSize: 11),
                                ),
                                padding: EdgeInsets.zero,
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(child: Text('Error loading routines: $err')),
        ),
      ],
    );
  }
}
