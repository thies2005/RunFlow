import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class TrainingScheduleStep extends ConsumerStatefulWidget {
  const TrainingScheduleStep({super.key});

  @override
  ConsumerState<TrainingScheduleStep> createState() =>
      _TrainingScheduleStepState();
}

class _TrainingScheduleStepState extends ConsumerState<TrainingScheduleStep> {
  bool _showAdvanced = false;

  static const _dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  @override
  Widget build(BuildContext context) {
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
              color: const Color(0xFF4CAF50).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.calendar_month,
              color: Color(0xFF4CAF50),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Training phases',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Customize your build, peak, and taper weeks.',
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
                  _PhaseSlider(
                    label: 'Build Weeks',
                    value: onboarding.buildWeeks.toDouble(),
                    color: const Color(0xFF4CAF50),
                    onChanged: (v) => notifier.setBuildWeeks(v.round()),
                  ),
                  const SizedBox(height: 12),
                  _PhaseSlider(
                    label: 'Peak Weeks',
                    value: onboarding.peakWeeks.toDouble(),
                    color: const Color(0xFFFF9800),
                    onChanged: (v) => notifier.setPeakWeeks(v.round()),
                  ),
                  const SizedBox(height: 12),
                  _PhaseSlider(
                    label: 'Taper Weeks',
                    value: onboarding.taperWeeks.toDouble(),
                    color: const Color(0xFF2196F3),
                    onChanged: (v) => notifier.setTaperWeeks(v.round()),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        'Total: ${onboarding.buildWeeks + onboarding.peakWeeks + onboarding.taperWeeks} / ${onboarding.computedPlanWeeks} weeks',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => setState(() => _showAdvanced = !_showAdvanced),
            icon: Icon(
              _showAdvanced ? Icons.expand_less : Icons.expand_more,
              size: 20,
            ),
            label: Text(
              _showAdvanced
                  ? 'Hide day scheduling'
                  : 'Customize training days',
            ),
          ),
          if (_showAdvanced) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Long Run Day',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<int>(
                      initialValue: onboarding.longRunDay,
                      decoration: const InputDecoration(
                        isDense: true,
                        prefixIcon:
                            Icon(Icons.directions_run, size: 20),
                      ),
                      items: List.generate(7, (i) {
                        return DropdownMenuItem(
                          value: i,
                          child: Text(_dayNames[i]),
                        );
                      }),
                      onChanged: (v) {
                        if (v != null) notifier.setLongRunDay(v);
                      },
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Quality Workout Day',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<int>(
                      initialValue: onboarding.qualityDay,
                      decoration: const InputDecoration(
                        isDense: true,
                        prefixIcon:
                            Icon(Icons.flash_on, size: 20),
                      ),
                      items: List.generate(7, (i) {
                        return DropdownMenuItem(
                          value: i,
                          child: Text(_dayNames[i]),
                        );
                      }),
                      onChanged: (v) {
                        if (v != null) notifier.setQualityDay(v);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _PhaseSlider extends StatelessWidget {
  const _PhaseSlider({
    required this.label,
    required this.value,
    required this.color,
    required this.onChanged,
  });

  final String label;
  final double value;
  final Color color;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium,
              ),
            ),
            Text(
              '${value.round()}w',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
        Slider(
          value: value.clamp(0, 12),
          min: 0,
          max: 12,
          divisions: 12,
          onChanged: onChanged,
          activeColor: color,
        ),
      ],
    );
  }
}
