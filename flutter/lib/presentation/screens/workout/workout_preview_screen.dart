import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/datasources/local/workout_template_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';

class WorkoutPreviewScreen extends StatefulWidget {
  const WorkoutPreviewScreen({required this.templateId, super.key});

  final String templateId;

  @override
  State<WorkoutPreviewScreen> createState() => _WorkoutPreviewScreenState();
}

class _WorkoutPreviewScreenState extends State<WorkoutPreviewScreen> {
  final _datasource = WorkoutTemplateLocalDatasource();
  StructuredWorkout? _workout;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadWorkout();
  }

  Future<void> _loadWorkout() async {
    final templates = await _datasource.loadTemplates();
    final workout = templates.where((t) => t.id == widget.templateId).firstOrNull;
    if (mounted) {
      setState(() {
        _workout = workout;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(_workout?.name ?? 'Preview')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _workout == null
              ? Center(
                  child: Text(
                    'Template not found',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                )
              : Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _workout!.name,
                                    style: theme.textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${_countSteps(_workout!.steps)} steps',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: AppColors.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._buildStepList(_workout!.steps),
                        ],
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () {
                              context.go('/record?templateId=${_workout!.id}');
                            },
                            icon: const Icon(Icons.play_arrow),
                            label: const Text('Start Workout'),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  List<Widget> _buildStepList(List<StepNode> nodes) {
    final widgets = <Widget>[];
    for (final node in nodes) {
      if (node.isStep && node.workoutStep != null) {
        widgets.add(_buildStepCard(node.workoutStep!));
      } else if (node.isGroup && node.group != null) {
        widgets.add(_buildGroupCard(node.group!));
      }
    }
    return widgets;
  }

  Widget _buildStepCard(WorkoutStep step) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(_stepTypeIcon(step.type), size: 20,
                color: _stepTypeColor(step.type)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.name,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDuration(step),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (step.paceTarget != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _formatPaceTarget(step.paceTarget!),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGroupCard(StepGroup group) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.surfaceContainerHighest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: AppColors.primary.withValues(alpha: 0.4),
          width: 1.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.repeat, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Repeat x${group.repeatCount}',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...group.children.map((child) {
              if (child.isStep && child.workoutStep != null) {
                return Padding(
                  padding: const EdgeInsets.only(left: 24, bottom: 6),
                  child: _buildStepCard(child.workoutStep!),
                );
              }
              return const SizedBox();
            }),
          ],
        ),
      ),
    );
  }

  int _countSteps(List<StepNode> nodes) {
    int count = 0;
    for (final node in nodes) {
      if (node.isStep) {
        count++;
      } else if (node.isGroup) {
        count += _countSteps(node.group!.children);
      }
    }
    return count;
  }

  String _formatDuration(WorkoutStep step) {
    if (step.durationType == StepDurationType.time &&
        step.durationSeconds != null) {
      final mins = step.durationSeconds! ~/ 60;
      final secs = step.durationSeconds! % 60;
      return '${mins}m ${secs}s';
    }
    if (step.durationType == StepDurationType.distance &&
        step.distanceMeters != null) {
      return '${(step.distanceMeters! / 1000).toStringAsFixed(1)} km';
    }
    return 'No duration set';
  }

  String _formatPaceTarget(PaceTarget target) {
    final min = target.minPaceSecondsPerKm;
    final max = target.maxPaceSecondsPerKm;
    if (min != null && max != null) {
      return '${_formatPace(min)} - ${_formatPace(max)} /km';
    }
    if (min != null) return '< ${_formatPace(min)} /km';
    if (max != null) return '> ${_formatPace(max)} /km';
    return '';
  }

  String _formatPace(double secondsPerKm) {
    final mins = secondsPerKm ~/ 60;
    final secs = (secondsPerKm % 60).round();
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  IconData _stepTypeIcon(StepType type) {
    switch (type) {
      case StepType.warmup:
        return Icons.wb_sunny_outlined;
      case StepType.cooldown:
        return Icons.ac_unit;
      case StepType.interval:
        return Icons.flash_on;
      case StepType.recovery:
        return Icons.self_improvement;
      case StepType.rest:
        return Icons.pause_circle_outline;
    }
  }

  Color _stepTypeColor(StepType type) {
    switch (type) {
      case StepType.warmup:
        return AppColors.warning;
      case StepType.cooldown:
        return Colors.lightBlue;
      case StepType.interval:
        return AppColors.primary;
      case StepType.recovery:
        return AppColors.success;
      case StepType.rest:
        return AppColors.onSurfaceVariant;
    }
  }
}
