import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';
import 'package:runflow_flutter/presentation/screens/record/exercise_picker_sheet.dart';
import 'package:runflow_flutter/presentation/screens/record/strength_summary_screen.dart';

class StrengthRecordingScreen extends ConsumerStatefulWidget {
  const StrengthRecordingScreen({super.key, this.templateId});

  final String? templateId;

  @override
  ConsumerState<StrengthRecordingScreen> createState() => _StrengthRecordingScreenState();
}

class _StrengthRecordingScreenState extends ConsumerState<StrengthRecordingScreen> {
  String _formatTimer(int elapsedSeconds) {
    final minutes = elapsedSeconds ~/ 60;
    final seconds = elapsedSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final strengthState = ref.watch(strengthRecordingProvider);
    final restState = ref.watch(restTimerProvider);
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);
    final unitLabel = settings.unitSystem == UnitSystem.imperial ? 'lbs' : 'kg';

    if (!strengthState.isActive) {
      return const Scaffold(
        body: Center(child: Text('No active workout')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            Text(
              strengthState.workoutName,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              _formatTimer(strengthState.elapsedSeconds),
              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        leading: TextButton(
          onPressed: _cancelWorkout,
          child: const Text('Cancel', style: TextStyle(color: AppColors.error)),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: FilledButton(
              onPressed: _finishWorkout,
              child: const Text('Finish'),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          ListView.builder(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 100),
            itemCount: strengthState.exercises.length + 1,
            itemBuilder: (context, index) {
              if (index == strengthState.exercises.length) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24.0),
                  child: Center(
                    child: OutlinedButton.icon(
                      onPressed: _addExercises,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Exercise'),
                    ),
                  ),
                );
              }

              final we = strengthState.exercises[index];
              return _buildExerciseCard(we, unitLabel, settings.showRpe, theme);
            },
          ),
          if (restState.isActive) _buildRestTimerOverlay(restState, theme),
        ],
      ),
    );
  }

  Widget _buildExerciseCard(WorkoutExercise we, String unitLabel, bool showRpe, ThemeData theme) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Container(
        decoration: we.supersetId != null
            ? const BoxDecoration(
                border: Border(
                  left: BorderSide(color: AppColors.primary, width: 4),
                ),
              )
            : null,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    we.exerciseName,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (action) {
                    if (action == 'remove') {
                      ref.read(strengthRecordingProvider.notifier).removeExercise(we.id);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'remove',
                      child: Text('Remove Exercise', style: TextStyle(color: AppColors.error)),
                    ),
                  ],
                  icon: const Icon(Icons.more_vert),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildSetsTable(we, unitLabel, showRpe, theme),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () {
                  ref.read(strengthRecordingProvider.notifier).addSet(we.id);
                },
                icon: const Icon(Icons.add),
                label: const Text('Add Set'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSetsTable(WorkoutExercise we, String unitLabel, bool showRpe, ThemeData theme) {
    return Table(
      columnWidths: {
        0: const FixedColumnWidth(36), // Set #
        1: const FlexColumnWidth(1.2), // Previous
        2: const FlexColumnWidth(1.0), // Weight
        3: const FlexColumnWidth(1.0), // Reps
        if (showRpe) 4: const FlexColumnWidth(0.8), // RPE
        showRpe ? 5: 4: const FixedColumnWidth(44), // Checkmark
      },
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        TableRow(
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 4.0),
              child: Text('Set', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            ),
            const Text('Previous', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            Text(unitLabel, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            const Text('Reps', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            if (showRpe) const Text('RPE', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            const Center(child: Icon(Icons.check, size: 16)),
          ],
        ),
        ...we.sets.map((s) {
          return TableRow(
            decoration: s.isCompleted
                ? BoxDecoration(
                    color: theme.colorScheme.primaryContainer.withValues(alpha: 0.15),
                  )
                : null,
            children: [
              // Set column
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  s.isWarmup
                      ? 'W'
                      : s.isDropSet
                          ? 'D'
                          : s.setNumber.toString(),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: s.isCompleted ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
              // Previous column
              Text(
                s.previousWeight != null && s.previousReps != null
                    ? '${s.previousWeight!.toStringAsFixed(1)} × ${s.previousReps}'
                    : '—',
                style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
              ),
              // Weight Input
              _SetTextField(
                key: ValueKey('weight_${s.id}'),
                initialValue: s.weight,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (val) {
                  final w = double.tryParse(val);
                  ref.read(strengthRecordingProvider.notifier).updateSet(we.id, s.id, weight: w);
                },
              ),
              // Reps Input
              _SetTextField(
                key: ValueKey('reps_${s.id}'),
                initialValue: s.reps?.toDouble(),
                keyboardType: TextInputType.number,
                isInteger: true,
                onChanged: (val) {
                  final r = int.tryParse(val);
                  ref.read(strengthRecordingProvider.notifier).updateSet(we.id, s.id, reps: r);
                },
              ),
              // Optional RPE Input
              if (showRpe)
                _SetTextField(
                  key: ValueKey('rpe_${s.id}'),
                  initialValue: s.rpe?.toDouble(),
                  keyboardType: TextInputType.number,
                  isInteger: true,
                  onChanged: (val) {
                    final r = int.tryParse(val);
                    ref.read(strengthRecordingProvider.notifier).updateSet(we.id, s.id, rpe: r);
                  },
                ),
              // Check completion button
              IconButton(
                icon: Icon(
                  s.isCompleted ? Icons.check_box : Icons.check_box_outline_blank,
                  color: s.isCompleted ? AppColors.success : AppColors.onSurfaceVariant,
                ),
                onPressed: () {
                  ref.read(strengthRecordingProvider.notifier).updateSet(
                        we.id,
                        s.id,
                        isCompleted: !s.isCompleted,
                      );
                },
              ),
            ],
          );
        }),
      ],
    );
  }

  Widget _buildRestTimerOverlay(RestTimerState restState, ThemeData theme) {
    // Vibrate when timer finishes
    if (restState.secondsRemaining == 0 && restState.isActive) {
      HapticFeedback.vibrate();
    }

    final minutes = restState.secondsRemaining ~/ 60;
    final seconds = restState.secondsRemaining % 60;
    final timeStr = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Positioned(
      bottom: 24,
      left: 16,
      right: 16,
      child: Card(
        color: theme.colorScheme.inverseSurface,
        elevation: 6,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            children: [
              Icon(Icons.timer_outlined, color: theme.colorScheme.onInverseSurface),
              const SizedBox(width: 12),
              Text(
                'Rest: $timeStr',
                style: TextStyle(
                  color: theme.colorScheme.onInverseSurface,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => ref.read(restTimerProvider.notifier).adjust(-30),
                child: Text('-30s', style: TextStyle(color: theme.colorScheme.onInverseSurface)),
              ),
              TextButton(
                onPressed: () => ref.read(restTimerProvider.notifier).adjust(30),
                child: Text('+30s', style: TextStyle(color: theme.colorScheme.onInverseSurface)),
              ),
              IconButton(
                icon: Icon(Icons.skip_next, color: theme.colorScheme.onInverseSurface),
                onPressed: () => ref.read(restTimerProvider.notifier).stop(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _addExercises() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return ExercisePickerSheet(
              scrollController: scrollController,
              onExercisesSelected: (selected) {
                for (final ex in selected) {
                  ref.read(strengthRecordingProvider.notifier).addExercise(ex);
                }
              },
            );
          },
        );
      },
    );
  }

  void _cancelWorkout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Workout?'),
        content: const Text('Are you sure you want to cancel the current workout? All log data will be lost.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No, resume'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(strengthRecordingProvider.notifier).cancelWorkout();
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, discard'),
          ),
        ],
      ),
    );
  }

  Future<void> _finishWorkout() async {
    final completedSession = await ref.read(strengthRecordingProvider.notifier).finishWorkout();
    if (completedSession != null && mounted) {
      // Navigate to summary screen
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => StrengthSummaryScreen(session: completedSession),
        ),
      );
    }
  }
}

class _SetTextField extends StatefulWidget {
  const _SetTextField({
    super.key,
    required this.initialValue,
    required this.onChanged,
    required this.keyboardType,
    this.isInteger = false,
  });

  final double? initialValue;
  final ValueChanged<String> onChanged;
  final TextInputType keyboardType;
  final bool isInteger;

  @override
  State<_SetTextField> createState() => _SetTextFieldState();
}

class _SetTextFieldState extends State<_SetTextField> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    final initialText = widget.initialValue != null
        ? (widget.isInteger ? widget.initialValue!.round().toString() : widget.initialValue!.toString())
        : '';
    _controller = TextEditingController(text: initialText);
  }

  @override
  void didUpdateWidget(covariant _SetTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialValue != oldWidget.initialValue) {
      final text = widget.initialValue != null
          ? (widget.isInteger ? widget.initialValue!.round().toString() : widget.initialValue!.toString())
          : '';
      // Only update text if it's different to prevent resetting cursor selection
      if (_controller.text != text && (double.tryParse(_controller.text) != widget.initialValue)) {
        _controller.text = text;
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2.0),
      child: TextFormField(
        controller: _controller,
        keyboardType: widget.keyboardType,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 13),
        decoration: const InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          isDense: true,
          border: OutlineInputBorder(),
        ),
        onChanged: widget.onChanged,
      ),
    );
  }
}
