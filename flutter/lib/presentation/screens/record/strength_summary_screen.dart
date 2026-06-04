import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';

class StrengthSummaryScreen extends ConsumerStatefulWidget {
  const StrengthSummaryScreen({super.key, required this.session});

  final StrengthSession session;

  @override
  ConsumerState<StrengthSummaryScreen> createState() => _StrengthSummaryScreenState();
}

class _StrengthSummaryScreenState extends ConsumerState<StrengthSummaryScreen> {
  late TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.session.notes);
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String _formatDuration(int totalSeconds) {
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;

    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final unitLabel = settings.unitSystem == UnitSystem.imperial ? 'lbs' : 'kg';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workout Summary'),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            widget.session.workoutName,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.session.startTime.day}/${widget.session.startTime.month}/${widget.session.startTime.year} at ${widget.session.startTime.hour.toString().padLeft(2, '0')}:${widget.session.startTime.minute.toString().padLeft(2, '0')}',
            style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatCell('Duration', _formatDuration(widget.session.durationSeconds), theme),
              _buildStatCell('Volume', '${widget.session.totalVolume.toStringAsFixed(1)} $unitLabel', theme),
              _buildStatCell('Sets', widget.session.totalSets.toString(), theme),
            ],
          ),
          if (widget.session.averageHr != null || widget.session.calories != null) ...[
            const SizedBox(height: 16),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                if (widget.session.averageHr != null)
                  _buildStatCell('Avg HR', '${widget.session.averageHr!.round()} bpm', theme, icon: Icons.favorite_border),
                if (widget.session.maxHr != null)
                  _buildStatCell('Max HR', '${widget.session.maxHr} bpm', theme, icon: Icons.favorite),
                if (widget.session.calories != null)
                  _buildStatCell('Calories', '${widget.session.calories!.round()} kcal', theme, icon: Icons.local_fire_department_outlined),
              ],
            ),
          ],
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 8),
          const Text('Workout Notes', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'How did this workout feel? Add notes here...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Exercises', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          ...widget.session.exercises.map((we) => _buildExerciseSummaryCard(we, unitLabel, theme)),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _discardWorkout,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                  ),
                  child: const Text('Delete Log'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  onPressed: _saveWorkout,
                  child: const Text('Save Workout'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildStatCell(String label, String value, ThemeData theme, {IconData? icon}) {
    return Column(
      children: [
        if (icon != null) ...[
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(height: 4),
        ],
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildExerciseSummaryCard(WorkoutExercise we, String unitLabel, ThemeData theme) {
    final completedSets = we.sets.where((s) => s.isCompleted).toList();
    if (completedSets.isEmpty) return const SizedBox();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              we.exerciseName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 8),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: completedSets.length,
              itemBuilder: (context, index) {
                final s = completedSets[index];
                final typeLabel = s.isWarmup
                    ? 'Warmup'
                    : s.isDropSet
                        ? 'Drop Set'
                        : 'Set ${index + 1}';
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(typeLabel, style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
                      Text(
                        '${s.weight ?? 0} $unitLabel × ${s.reps ?? 0} reps'
                        '${s.rpe != null ? " (RPE ${s.rpe})" : ""}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveWorkout() async {
    final updatedSession = widget.session.copyWith(
      notes: _notesController.text.trim(),
    );
    final ds = ref.read(strengthDatasourceProvider);
    await ds.insertSession(updatedSession);
    ref.invalidate(strengthHistoryProvider);

    if (mounted) {
      context.pop();
    }
  }

  void _discardWorkout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Workout?'),
        content: const Text('Are you sure you want to delete this workout log? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final ds = ref.read(strengthDatasourceProvider);
              await ds.deleteSession(widget.session.id);
              ref.invalidate(strengthHistoryProvider);
              if (context.mounted) {
                Navigator.pop(context); // pop dialog
                context.pop(); // pop summary screen
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
