import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';
import 'package:runflow_flutter/domain/services/workout_step_execution_engine.dart';

class StepProgressCard extends StatelessWidget {
  const StepProgressCard({
    required this.activeStep,
    required this.progress,
    super.key,
  });

  final ActiveStep activeStep;
  final StepProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final step = activeStep.step;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _stepIcon(step.type),
                  color: AppColors.primary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    step.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.onSurface,
                    ),
                  ),
                ),
                Text(
                  'Step ${activeStep.overallIndex + 1} of ${activeStep.totalSteps}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.fraction.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: AppColors.onSurfaceVariant.withValues(alpha: 0.12),
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  _remainingText,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String get _remainingText {
    final durationType = activeStep.step.durationType;
    if (durationType == StepDurationType.distance) {
      final target = progress.targetDistanceMeters ?? 0;
      final remaining = (target - progress.elapsedDistanceMeters).clamp(0.0, double.infinity);
      return '${remaining.toStringAsFixed(0)} m remaining';
    }
    final targetSec = progress.targetSeconds ?? 0;
    final remainingSeconds = (targetSec - progress.elapsedSeconds).clamp(0, targetSec);
    return '${formatDurationClock(remainingSeconds)} remaining';
  }
}

IconData _stepIcon(StepType type) {
  return switch (type) {
    StepType.warmup => Icons.wb_sunny,
    StepType.cooldown => Icons.ac_unit,
    StepType.interval => Icons.flash_on,
    StepType.recovery => Icons.directions_walk,
    StepType.rest => Icons.pause_circle,
  };
}
