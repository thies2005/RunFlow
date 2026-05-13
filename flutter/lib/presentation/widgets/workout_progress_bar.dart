import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class WorkoutProgressBar extends StatelessWidget {
  const WorkoutProgressBar({
    required this.fraction,
    super.key,
  });

  final double fraction;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: LinearProgressIndicator(
        value: fraction.clamp(0.0, 1.0),
        minHeight: 3,
        backgroundColor: AppColors.onSurfaceVariant.withValues(alpha: 0.12),
        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
      ),
    );
  }
}
