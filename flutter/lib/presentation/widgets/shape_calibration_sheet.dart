import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';
import 'package:runflow_flutter/data/models/calibration_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/calibration_providers.dart';

class ShapeCalibrationSheet extends ConsumerStatefulWidget {
  const ShapeCalibrationSheet({super.key});

  @override
  ConsumerState<ShapeCalibrationSheet> createState() =>
      _ShapeCalibrationSheetState();
}

class _ShapeCalibrationSheetState extends ConsumerState<ShapeCalibrationSheet> {
  @override
  Widget build(BuildContext context) {
    final calibState = ref.watch(calibrationProvider);
    final calibNotifier = ref.read(calibrationProvider.notifier);
    final statsAsync = ref.watch(analyticsStatsProvider);
    final activitiesAsync = ref.watch(activitiesProvider);
    final theme = Theme.of(context);

    final stats = statsAsync.value;
    final effectiveVO2max = stats?.effectiveVO2max ?? 0;
    final rawVO2max = stats?.rawVO2max ?? 0;
    final vdotCorrectionFactor = stats?.vdotCorrectionFactor ?? 1.0;
    final marathonShape = stats?.marathonShape ?? 0;
    final currentFactor = stats?.vdotCorrectionFactor ?? 1.0;

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.calculate, color: AppColors.primary),
                const SizedBox(width: 12),
                Text(
                  'Calibration',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _TabButton(
                  label: 'VDOT Correction',
                  selected: calibState.mode == CalibrationMode.vdotCorrection,
                  color: AppColors.primary,
                  onTap: () =>
                      calibNotifier.setMode(CalibrationMode.vdotCorrection),
                ),
                _TabButton(
                  label: 'Shape Factor',
                  selected: calibState.mode == CalibrationMode.shapeFactor,
                  color: AppColors.warning,
                  onTap: () =>
                      calibNotifier.setMode(CalibrationMode.shapeFactor),
                ),
                _TabButton(
                  label: 'Manual',
                  selected: calibState.mode == CalibrationMode.manual,
                  color: AppColors.onSurface,
                  onTap: () => calibNotifier.setMode(CalibrationMode.manual),
                ),
              ],
            ),
            const Divider(height: 1),
            const SizedBox(height: 16),
            if (calibState.error.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  calibState.error,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ),
            switch (calibState.mode) {
              CalibrationMode.vdotCorrection => _VdotCorrectionTab(
                  state: calibState,
                  notifier: calibNotifier,
                  effectiveVO2max: effectiveVO2max,
                  rawVO2max: rawVO2max,
                  vdotCorrectionFactor: vdotCorrectionFactor,
                  activities: activitiesAsync.value?.activities ?? [],
                ),
              CalibrationMode.shapeFactor => _ShapeFactorTab(
                  state: calibState,
                  notifier: calibNotifier,
                  effectiveVO2max: effectiveVO2max,
                  shapePercent: marathonShape,
                ),
              CalibrationMode.manual => _ManualTab(
                  state: calibState,
                  notifier: calibNotifier,
                  currentFactor: currentFactor,
                ),
            },
            const SizedBox(height: 16),
            _ApplyButton(
              state: calibState,
              notifier: calibNotifier,
              effectiveVO2max: effectiveVO2max,
              rawVO2max: rawVO2max,
              vdotCorrectionFactor: vdotCorrectionFactor,
              shapePercent: marathonShape,
            ),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: selected ? color : AppColors.onSurfaceVariant,
                ),
              ),
            ),
            Container(
              height: 2,
              color: selected ? color : Colors.transparent,
            ),
          ],
        ),
      ),
    );
  }
}

class _VdotCorrectionTab extends StatelessWidget {
  const _VdotCorrectionTab({
    required this.state,
    required this.notifier,
    required this.effectiveVO2max,
    required this.rawVO2max,
    required this.vdotCorrectionFactor,
    required this.activities,
  });

  final CalibrationState state;
  final Calibration notifier;
  final double effectiveVO2max;
  final double rawVO2max;
  final double vdotCorrectionFactor;
  final List<Activity> activities;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalSeconds = notifier.totalSeconds;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.2),
            ),
          ),
          child: Text(
            'Calibrate your global Effective VO2max to match your actual race performance.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Auto-fill from Recent Activity',
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        DropdownButtonFormField<String>(
          initialValue: state.selectedActivityId.isEmpty ? null : state.selectedActivityId,
          decoration: const InputDecoration(
            hintText: 'Select an activity...',
          ),
          items: activities
              .where((a) => a.type == ActivityType.run && a.distance > 1000)
              .take(20)
              .map(
                (a) => DropdownMenuItem(
                  value: a.id,
                  child: Text(
                    '${a.startDate.day}/${a.startDate.month}/${a.startDate.year} - ${(a.distance / 1000).toStringAsFixed(2)}km - ${formatDuration(a.movingTime)}',
                    style: theme.textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              )
              .toList(),
          onChanged: (id) {
            if (id != null) {
              notifier.setSelectedActivityId(id);
              final activity = activities.firstWhere((a) => a.id == id);
              notifier.autoFillFromActivity(
                movingTime: activity.movingTime,
                distanceMeters: activity.distance,
              );
            }
          },
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: state.isCustomDistance
                  ? Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            initialValue: state.customDistanceMeters,
                            decoration: const InputDecoration(
                              labelText: 'Meters',
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: notifier.setCustomDistanceMeters,
                          ),
                        ),
                        TextButton(
                          onPressed: () => notifier.setCustomDistance(false),
                          child: const Text('Standard'),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<CalibrationRaceType>(
                            initialValue: state.raceType,
                            decoration:
                                const InputDecoration(labelText: 'Distance'),
                            items: CalibrationRaceType.values
                                .map(
                                  (t) => DropdownMenuItem(
                                    value: t,
                                    child: Text(_raceTypeLabel(t)),
                                  ),
                                )
                                .toList(),
                            onChanged: (v) {
                              if (v != null) notifier.setRaceType(v);
                            },
                          ),
                        ),
                        TextButton(
                          onPressed: () => notifier.setCustomDistance(true),
                          child: const Text('Custom'),
                        ),
                      ],
                    ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _TimeInput(
              value: state.hours,
              hint: 'HH',
              onChanged: notifier.setHours,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text(':'),
            ),
            _TimeInput(
              value: state.minutes,
              hint: 'MM',
              onChanged: notifier.setMinutes,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text(':'),
            ),
            _TimeInput(
              value: state.seconds,
              hint: 'SS',
              onChanged: notifier.setSeconds,
            ),
          ],
        ),
        if (totalSeconds > 0) ...[
          const SizedBox(height: 12),
          _VdotPreview(
            state: state,
            notifier: notifier,
            effectiveVO2max: effectiveVO2max,
            rawVO2max: rawVO2max,
            vdotCorrectionFactor: vdotCorrectionFactor,
          ),
        ],
      ],
    );
  }
}

class _VdotPreview extends StatelessWidget {
  const _VdotPreview({
    required this.state,
    required this.notifier,
    required this.effectiveVO2max,
    required this.rawVO2max,
    required this.vdotCorrectionFactor,
  });

  final CalibrationState state;
  final Calibration notifier;
  final double effectiveVO2max;
  final double rawVO2max;
  final double vdotCorrectionFactor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalSeconds = notifier.totalSeconds;
    if (totalSeconds <= 0) return const SizedBox.shrink();

    double distanceMeters;
    if (state.isCustomDistance) {
      distanceMeters = double.tryParse(state.customDistanceMeters) ?? 0;
    } else {
      distanceMeters = _raceTypeDistance(state.raceType);
    }

    final impliedVdot =
        distanceMeters > 0 ? calculateVdot(distanceMeters, totalSeconds / 60) : 0.0;

    double baseVdot = 0;
    if (rawVO2max > 0) {
      baseVdot = rawVO2max;
    } else if (effectiveVO2max > 0) {
      baseVdot = effectiveVO2max / vdotCorrectionFactor;
    }

    final newFactor = baseVdot > 0 ? impliedVdot / baseVdot : 0.0;
    final isValid = newFactor >= 0.5 && newFactor <= 1.5;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _PreviewTile(
                label: 'Race VDOT',
                value: impliedVdot.toStringAsFixed(1),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _PreviewTile(
                label: 'Current VDOT',
                value: baseVdot.toStringAsFixed(1),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _PreviewTile(
                label: 'Correction',
                value: '${newFactor.toStringAsFixed(3)}x',
                valueColor: isValid ? AppColors.success : AppColors.error,
              ),
            ),
          ],
        ),
        if (!isValid)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Correction factor must be between 0.5x and 1.5x.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.error,
                fontSize: 11,
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            'Current correction: ${vdotCorrectionFactor.toStringAsFixed(3)}x',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 11,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class _PreviewTile extends StatelessWidget {
  const _PreviewTile({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _ShapeFactorTab extends StatelessWidget {
  const _ShapeFactorTab({
    required this.state,
    required this.notifier,
    required this.effectiveVO2max,
    required this.shapePercent,
  });

  final CalibrationState state;
  final Calibration notifier;
  final double effectiveVO2max;
  final double shapePercent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalSeconds = notifier.totalSeconds;

    double? shapeFactor;
    int? optimalSeconds;
    int? basePredictedSeconds;

    if (totalSeconds > 0 && effectiveVO2max > 0) {
      final raceDist = state.isCustomDistance
          ? (double.tryParse(state.customDistanceMeters) ?? 0)
          : _raceTypeDistance(state.raceType);

      if (raceDist > 0) {
        optimalSeconds = (racePrediction(effectiveVO2max, raceDist) * 60).round();
        final shapeImpact = raceDist >= 42000 ? 0.30 : 0.15;
        final baseShapePenalty =
            (1 - min(shapePercent, 100) / 100) * shapeImpact;
        basePredictedSeconds =
            (optimalSeconds * (1 + baseShapePenalty)).round();

        final ratio = totalSeconds / optimalSeconds;
        shapeFactor = ratio - 1.0;
        final adjusted = (1 - min(shapePercent, 100) / 100) * shapeImpact;
        shapeFactor = ratio - 1.0 - adjusted;
      }
    }

    final isValid =
        shapeFactor != null && shapeFactor >= -2.0 && shapeFactor <= 2.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Enter a long-distance race to calibrate the shape penalty.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _RaceChip(
              label: 'Marathon',
              selected: state.raceType == CalibrationRaceType.marathon,
              onTap: () => notifier.setRaceType(CalibrationRaceType.marathon),
            ),
            const SizedBox(width: 8),
            _RaceChip(
              label: 'Half Marathon',
              selected: state.raceType == CalibrationRaceType.halfMarathon,
              onTap: () =>
                  notifier.setRaceType(CalibrationRaceType.halfMarathon),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _TimeInput(
              value: state.hours,
              hint: 'HH',
              onChanged: notifier.setHours,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text(':'),
            ),
            _TimeInput(
              value: state.minutes,
              hint: 'MM',
              onChanged: notifier.setMinutes,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text(':'),
            ),
            _TimeInput(
              value: state.seconds,
              hint: 'SS',
              onChanged: notifier.setSeconds,
            ),
          ],
        ),
        if (shapeFactor != null && optimalSeconds != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _PreviewTile(
                  label: 'Expected',
                  value: formatDuration(basePredictedSeconds ?? 0),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _PreviewTile(
                  label: 'Your Time',
                  value: formatDuration(totalSeconds),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isValid
                  ? AppColors.success.withValues(alpha: 0.1)
                  : AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isValid
                    ? AppColors.success.withValues(alpha: 0.2)
                    : AppColors.error.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Shape Factor:',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                Text(
                  '${shapeFactor.toStringAsFixed(2)}x',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: isValid ? AppColors.success : AppColors.error,
                  ),
                ),
              ],
            ),
          ),
          if (!isValid)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Factor must be between -2.0x and 2.0x.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.error,
                  fontSize: 11,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'VO2:${effectiveVO2max.toStringAsFixed(1)} Shape:${shapePercent.toStringAsFixed(0)}% Opt:${optimalSeconds}s',
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 10,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ],
    );
  }
}

class _ManualTab extends StatelessWidget {
  const _ManualTab({
    required this.state,
    required this.notifier,
    required this.currentFactor,
  });

  final CalibrationState state;
  final Calibration notifier;
  final double currentFactor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Manually adjust the shape correction factor.\n'
          '> 1.0 = Slower than predicted\n'
          '< 1.0 = Faster than predicted',
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Slider(
                value: double.tryParse(state.manualFactor) ?? currentFactor,
                min: 0.8,
                max: 1.5,
                divisions: 70,
                onChanged: (v) => notifier.setManualFactor(v.toStringAsFixed(2)),
              ),
            ),
            SizedBox(
              width: 70,
              child: TextFormField(
                initialValue: state.manualFactor.isEmpty
                    ? currentFactor.toStringAsFixed(2)
                    : state.manualFactor,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 10,
                  ),
                ),
                onChanged: notifier.setManualFactor,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _RaceChip extends StatelessWidget {
  const _RaceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: selected ? Colors.white : AppColors.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _TimeInput extends StatelessWidget {
  const _TimeInput({
    required this.value,
    required this.hint,
    required this.onChanged,
  });

  final String value;
  final String hint;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: TextFormField(
        initialValue: value,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        decoration: InputDecoration(
          hintText: hint,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 10,
          ),
        ),
        onChanged: onChanged,
      ),
    );
  }
}

class _ApplyButton extends ConsumerWidget {
  const _ApplyButton({
    required this.state,
    required this.notifier,
    required this.effectiveVO2max,
    required this.rawVO2max,
    required this.vdotCorrectionFactor,
    required this.shapePercent,
  });

  final CalibrationState state;
  final Calibration notifier;
  final double effectiveVO2max;
  final double rawVO2max;
  final double vdotCorrectionFactor;
  final double shapePercent;

  bool get _isValid {
    switch (state.mode) {
      case CalibrationMode.vdotCorrection:
        final totalSeconds = notifier.totalSeconds;
        if (totalSeconds <= 0) return false;
        double distanceMeters;
        if (state.isCustomDistance) {
          distanceMeters =
              double.tryParse(state.customDistanceMeters) ?? 0;
        } else {
          distanceMeters = _raceTypeDistance(state.raceType);
        }
        final impliedVdot = distanceMeters > 0
            ? calculateVdot(distanceMeters, totalSeconds / 60)
            : 0.0;
        double baseVdot = 0;
        if (rawVO2max > 0) {
          baseVdot = rawVO2max;
        } else if (effectiveVO2max > 0) {
          baseVdot = effectiveVO2max / vdotCorrectionFactor;
        }
        final newFactor = baseVdot > 0 ? impliedVdot / baseVdot : 0.0;
        return newFactor >= 0.5 && newFactor <= 1.5;
      case CalibrationMode.shapeFactor:
        final totalSeconds = notifier.totalSeconds;
        if (totalSeconds <= 0 || effectiveVO2max <= 0) return false;
        final raceDist = _raceTypeDistance(state.raceType);
        final optimalSeconds =
            (racePrediction(effectiveVO2max, raceDist) * 60).round();
        final ratio = totalSeconds / optimalSeconds;
        final shapeImpact = raceDist >= 42000 ? 0.30 : 0.15;
        final adjusted = (1 - shapePercent / 100) * shapeImpact;
        final factor = ratio - 1.0 - adjusted;
        return factor >= -2.0 && factor <= 2.0;
      case CalibrationMode.manual:
        final factor = double.tryParse(state.manualFactor);
        return factor != null && factor >= 0.5 && factor <= 2.0;
    }
  }

  Future<void> _apply(BuildContext context) async {
    try {
      switch (state.mode) {
        case CalibrationMode.vdotCorrection:
          await notifier.submitVdotCorrection(
            effectiveVO2max: effectiveVO2max,
            rawVO2max: rawVO2max,
            currentCorrectionFactor: vdotCorrectionFactor,
          );
          break;
        case CalibrationMode.shapeFactor:
          final totalSeconds = notifier.totalSeconds;
          final raceDist = _raceTypeDistance(state.raceType);
          final optimalSeconds =
              (racePrediction(effectiveVO2max, raceDist) * 60).round();
          final ratio = totalSeconds / optimalSeconds;
          final shapeImpact = raceDist >= 42000 ? 0.30 : 0.15;
          final adjusted = (1 - shapePercent / 100) * shapeImpact;
          final factor = ratio - 1.0 - adjusted;
          await notifier.submitShapeFactor(factor);
          break;
        case CalibrationMode.manual:
          final factor = double.tryParse(state.manualFactor) ?? 1.0;
          await notifier.submitManualFactor(factor);
          break;
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Calibration updated')),
        );
        Navigator.of(context).pop();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: state.isSubmitting || !_isValid ? null : () => _apply(context),
          child: state.isSubmitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Apply Calibration'),
        ),
      ],
    );
  }
}

String _raceTypeLabel(CalibrationRaceType type) {
  return switch (type) {
    CalibrationRaceType.fiveK => '5K',
    CalibrationRaceType.tenK => '10K',
    CalibrationRaceType.halfMarathon => 'Half Marathon',
    CalibrationRaceType.marathon => 'Marathon',
  };
}

double _raceTypeDistance(CalibrationRaceType type) {
  return switch (type) {
    CalibrationRaceType.fiveK => 5000,
    CalibrationRaceType.tenK => 10000,
    CalibrationRaceType.halfMarathon => 21097.5,
    CalibrationRaceType.marathon => 42195,
  };
}
