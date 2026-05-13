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
  switch (type) {
    case StepType.warmup:
      return Icons.wb_sunny;
    case StepType.cooldown:
      return Icons.ac_unit;
    case StepType.interval:
      return Icons.flash_on;
    case StepType.recovery:
      return Icons.directions_walk;
    case StepType.rest:
      return Icons.pause_circle;
  }
}
