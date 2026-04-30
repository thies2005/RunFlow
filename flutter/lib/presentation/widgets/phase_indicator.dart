import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

enum TrainingPhase {
  base,
  build,
  peak,
  taper,
  race,
  recovery,
}

class PhaseIndicator extends StatelessWidget {
  const PhaseIndicator({
    required this.currentPhase,
    required this.totalWeeks,
    required this.weeksCompleted,
    super.key,
  });

  final TrainingPhase currentPhase;
  final int totalWeeks;
  final int weeksCompleted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = totalWeeks > 0 ? weeksCompleted / totalWeeks : 0.0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Training Phase',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: SizedBox(
                height: 32,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final totalWidth = constraints.maxWidth;
                    final phases = _computePhases();
                    return Row(
                      children: phases.map((phase) {
                        final width = totalWidth * phase.fraction;
                        final isCurrent = phase.phase == currentPhase;
                        return Semantics(
                          label: '${phase.label} phase',
                          child: GestureDetector(
                            child: Container(
                              width: width,
                              color: isCurrent
                                  ? phase.color
                                  : phase.color.withValues(alpha: 0.3),
                              child: Center(
                                child: Text(
                                  phase.label,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: isCurrent
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: isCurrent
                                        ? AppColors.onPrimary
                                        : AppColors.onSurfaceVariant,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _phaseColor(currentPhase).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _phaseLabel(currentPhase),
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: _phaseColor(currentPhase),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: progress.clamp(0.0, 1.0),
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _phaseColor(currentPhase),
                      ),
                      minHeight: 4,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '$weeksCompleted/$totalWeeks wks',
                  style: theme.textTheme.bodySmall?.copyWith(
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

  List<_PhaseSegment> _computePhases() {
    if (totalWeeks <= 0) return [];
    final baseWeeks = (totalWeeks * 0.4).round().clamp(1, totalWeeks);
    final buildWeeks = (totalWeeks * 0.25).round().clamp(1, totalWeeks - baseWeeks);
    final remaining = totalWeeks - baseWeeks - buildWeeks;
    final peakWeeks = (remaining * 0.5).round().clamp(1, remaining);
    final taperWeeks = remaining - peakWeeks;

    return [
      _PhaseSegment(
        phase: TrainingPhase.base,
        label: 'Base',
        color: const Color(0xFF4CAF50),
        fraction: baseWeeks / totalWeeks,
      ),
      _PhaseSegment(
        phase: TrainingPhase.build,
        label: 'Build',
        color: const Color(0xFF2196F3),
        fraction: buildWeeks / totalWeeks,
      ),
      _PhaseSegment(
        phase: TrainingPhase.peak,
        label: 'Peak',
        color: const Color(0xFFFF9800),
        fraction: peakWeeks / totalWeeks,
      ),
      _PhaseSegment(
        phase: TrainingPhase.taper,
        label: 'Taper',
        color: const Color(0xFF9C27B0),
        fraction: taperWeeks > 0 ? taperWeeks / totalWeeks : 0,
      ),
    ].where((s) => s.fraction > 0).toList();
  }

  static TrainingPhase computePhase(int weeksCompleted, int totalWeeks) {
    if (totalWeeks <= 0) return TrainingPhase.base;
    final progress = weeksCompleted / totalWeeks;
    if (progress < 0.4) return TrainingPhase.base;
    if (progress < 0.65) return TrainingPhase.build;
    if (progress < 0.85) return TrainingPhase.peak;
    return TrainingPhase.taper;
  }

  static Color _phaseColor(TrainingPhase phase) {
    return switch (phase) {
      TrainingPhase.base => const Color(0xFF4CAF50),
      TrainingPhase.build => const Color(0xFF2196F3),
      TrainingPhase.peak => const Color(0xFFFF9800),
      TrainingPhase.taper => const Color(0xFF9C27B0),
      TrainingPhase.race => const Color(0xFFF44336),
      TrainingPhase.recovery => const Color(0xFF009688),
    };
  }

  static String _phaseLabel(TrainingPhase phase) {
    return switch (phase) {
      TrainingPhase.base => 'Base Phase',
      TrainingPhase.build => 'Build Phase',
      TrainingPhase.peak => 'Peak Phase',
      TrainingPhase.taper => 'Taper Phase',
      TrainingPhase.race => 'Race Week',
      TrainingPhase.recovery => 'Recovery',
    };
  }
}

class _PhaseSegment {
  const _PhaseSegment({
    required this.phase,
    required this.label,
    required this.color,
    required this.fraction,
  });

  final TrainingPhase phase;
  final String label;
  final Color color;
  final double fraction;
}
