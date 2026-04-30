import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class TrainingVolumeStep extends ConsumerWidget {
  const TrainingVolumeStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: const Color(0xFF00BCD4).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.fitness_center,
            color: Color(0xFF00BCD4),
            size: 32,
          ),
        ),
          const SizedBox(height: 24),
          Text(
            S.of(context).onboardingTrainingVolumeTitle,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).onboardingTrainingVolumeSubtitle,
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
                children: [
                   _VolumeSlider(
                     icon: Icons.directions_run,
                     label: S.of(context).onboardingRunsPerWeek,
                    value: onboarding.runsPerWeek.toDouble(),
                    min: 2,
                    max: 7,
                    divisions: 5,
                     displayValue: S.of(context).onboardingRunsPerWeekCount(onboarding.runsPerWeek),
                    onChanged: (v) => notifier.setRunsPerWeek(v.round()),
                  ),
                  const SizedBox(height: 16),
                  _VolumeSlider(
                    icon: Icons.straighten,
                     label: S.of(context).onboardingWeeklyMileage,
                    value: onboarding.weeklyMileage,
                    min: 10,
                    max: 120,
                    divisions: 22,
                    displayValue:
                        '${onboarding.weeklyMileage.toStringAsFixed(0)} ${S.of(context).kmUnit}',
                    onChanged: (v) {
                      notifier.setWeeklyMileage(v);
                      final maxLongRun = calculateDefaultMaxLongRunKm(
                        onboarding.raceType.name,
                        v,
                      );
                      notifier.setMaxLongRunKm(maxLongRun.toDouble());
                    },
                  ),
                  const SizedBox(height: 16),
                  _VolumeSlider(
                    icon: Icons.route,
                     label: S.of(context).onboardingLongRunCap,
                    value: onboarding.maxLongRunKm,
                    min: 6,
                    max: 40,
                    divisions: 34,
                    displayValue:
                        '${onboarding.maxLongRunKm.toStringAsFixed(0)} ${S.of(context).kmUnit}',
                    onChanged: (v) => notifier.setMaxLongRunKm(v),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _VolumeSlider extends StatelessWidget {
  const _VolumeSlider({
    required this.icon,
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.displayValue,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final String displayValue;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium,
              ),
            ),
            Text(
              displayValue,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: divisions,
          label: displayValue,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
