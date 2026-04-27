import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class CurrentFitnessStep extends ConsumerStatefulWidget {
  const CurrentFitnessStep({super.key});

  @override
  ConsumerState<CurrentFitnessStep> createState() => _CurrentFitnessStepState();
}

class _CurrentFitnessStepState extends ConsumerState<CurrentFitnessStep> {
  final _hoursController = TextEditingController();
  final _minutesController = TextEditingController();
  final _secondsController = TextEditingController();

  @override
  void dispose() {
    _hoursController.dispose();
    _minutesController.dispose();
    _secondsController.dispose();
    super.dispose();
  }

  int get _totalSeconds {
    final h = int.tryParse(_hoursController.text) ?? 0;
    final m = int.tryParse(_minutesController.text) ?? 0;
    final s = int.tryParse(_secondsController.text) ?? 0;
    return h * 3600 + m * 60 + s;
  }

  double? get _computedVdot {
    final seconds = _totalSeconds;
    if (seconds <= 0) return null;
    final onboarding = ref.read(onboardingProvider);
    return calculateVdotFromRace(
      distanceKey: onboarding.calibrationDistance,
      timeSeconds: seconds,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final statsAsync = ref.watch(analyticsStatsProvider);

    final effectiveVO2max = statsAsync.value?.effectiveVO2max ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF2196F3).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.speed,
              color: Color(0xFF2196F3),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'What\'s your current fitness?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Enter a recent race time or let us estimate from your data.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Calibration Distance',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      _CalibDistChip(
                          label: '5K',
                          selected: onboarding.calibrationDistance == '5K',
                          onTap: () => notifier.setCalibrationDistance('5K')),
                      _CalibDistChip(
                          label: '10K',
                          selected: onboarding.calibrationDistance == '10K',
                          onTap: () => notifier.setCalibrationDistance('10K')),
                      _CalibDistChip(
                          label: 'Half',
                          selected: onboarding.calibrationDistance == 'HALF',
                          onTap: () => notifier.setCalibrationDistance('HALF')),
                      _CalibDistChip(
                          label: 'Marathon',
                          selected:
                              onboarding.calibrationDistance == 'MARATHON',
                          onTap: () =>
                              notifier.setCalibrationDistance('MARATHON')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Your Time',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _hoursController,
                          decoration: const InputDecoration(
                            labelText: 'Hours',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) => _updateCalibration(notifier, effectiveVO2max),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _minutesController,
                          decoration: const InputDecoration(
                            labelText: 'Min',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) => _updateCalibration(notifier, effectiveVO2max),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _secondsController,
                          decoration: const InputDecoration(
                            labelText: 'Sec',
                            isDense: true,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (_) => _updateCalibration(notifier, effectiveVO2max),
                        ),
                      ),
                    ],
                  ),
                  if (effectiveVO2max > 0 &&
                      onboarding.calibrationTimeSeconds == 0) ...[
                    const SizedBox(height: 12),
                    Center(
                      child: TextButton.icon(
                        onPressed: () {
                          final predicted = predictRaceTime(
                            effectiveVO2max,
                            onboarding.calibrationDistance,
                          );
                          final h = predicted ~/ 3600;
                          final m = (predicted % 3600) ~/ 60;
                          final s = predicted % 60;
                          _hoursController.text = h > 0 ? h.toString() : '';
                          _minutesController.text =
                              m.toString().padLeft(2, '0');
                          _secondsController.text =
                              s.toString().padLeft(2, '0');
                          _updateCalibration(notifier, effectiveVO2max);
                        },
                        icon: const Icon(Icons.auto_fix_high, size: 16),
                        label: const Text('Use predicted time'),
                      ),
                    ),
                  ],
                  if (_computedVdot != null && _computedVdot! > 0) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.speed,
                              color: AppColors.primary, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'VDOT: ${_computedVdot!.toStringAsFixed(1)}',
                            style:
                                theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _updateCalibration(Onboarding notifier, double effectiveVO2max) {
    final seconds = _totalSeconds;
    notifier.setCalibrationTime(seconds);

    if (seconds > 0 && effectiveVO2max > 0) {
      final vdot = calculateVdotFromRace(
        distanceKey: ref.read(onboardingProvider).calibrationDistance,
        timeSeconds: seconds,
      );
      notifier.setCalibrationFactor(vdot / effectiveVO2max);
    } else {
      notifier.setCalibrationFactor(1.0);
    }
  }
}

class _CalibDistChip extends StatelessWidget {
  const _CalibDistChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}
