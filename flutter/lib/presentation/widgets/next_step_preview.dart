import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';
import 'package:runflow_flutter/domain/services/workout_step_execution_engine.dart';

class NextStepPreview extends StatelessWidget {
  const NextStepPreview({
    required this.nextStep,
    super.key,
  });

  final ActiveStep? nextStep;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (nextStep == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Text(
          'Final step',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(
              _stepIcon(nextStep!.step.type),
              color: AppColors.onSurfaceVariant,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              'Next: ${nextStep!.step.name}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
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
