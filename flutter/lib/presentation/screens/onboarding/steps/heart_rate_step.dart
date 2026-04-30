import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class HeartRateProfileStep extends ConsumerStatefulWidget {
  const HeartRateProfileStep({super.key});

  @override
  ConsumerState<HeartRateProfileStep> createState() =>
      _HeartRateProfileStepState();
}

class _HeartRateProfileStepState extends ConsumerState<HeartRateProfileStep> {
  final _maxHrController = TextEditingController();
  final _restHrController = TextEditingController();
  final _weightController = TextEditingController();
  final _thresholdHrController = TextEditingController();
  final _thresholdPaceMinController = TextEditingController();
  final _thresholdPaceSecController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final onboarding = ref.read(onboardingProvider);
    _maxHrController.text = onboarding.maxHeartRate.toString();
    _restHrController.text = onboarding.restingHeartRate.toString();
    _weightController.text = onboarding.weight.toStringAsFixed(0);
    if (onboarding.thresholdHR > 0) {
      _thresholdHrController.text = onboarding.thresholdHR.toString();
    }
    if (onboarding.thresholdPace > 0) {
      final mins = onboarding.thresholdPace ~/ 60;
      final secs = onboarding.thresholdPace % 60;
      _thresholdPaceMinController.text = mins.toString();
      _thresholdPaceSecController.text = secs.toString().padLeft(2, '0');
    }
  }

  @override
  void dispose() {
    _maxHrController.dispose();
    _restHrController.dispose();
    _weightController.dispose();
    _thresholdHrController.dispose();
    _thresholdPaceMinController.dispose();
    _thresholdPaceSecController.dispose();
    super.dispose();
  }

  int get _lthr {
    final hr = int.tryParse(_thresholdHrController.text) ?? 0;
    if (hr > 0) return hr;
    final maxHr = int.tryParse(_maxHrController.text) ?? 0;
    if (maxHr > 0) return (maxHr * 0.9).round();
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final notifier = ref.read(onboardingProvider.notifier);

    final zones = calculateHRZonesFromLTHR(_lthr);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFE91E63).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.favorite,
              color: Color(0xFFE91E63),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            S.of(context).onboardingHeartRateProfile,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).onboardingHeartRateProfileSubtitle,
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
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _maxHrController,
                          decoration: InputDecoration(
                            labelText: S.of(context).onboardingMaxHr,
                            prefixIcon: const Icon(Icons.trending_up, size: 20),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) {
                            final val = int.tryParse(v) ?? 0;
                            notifier.setMaxHeartRate(val);
                            setState(() {});
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _restHrController,
                          decoration: InputDecoration(
                            labelText: S.of(context).onboardingRestingHr,
                            prefixIcon:
                                const Icon(Icons.hotel, size: 20),
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) {
                            final val = int.tryParse(v) ?? 0;
                            notifier.setRestingHeartRate(val);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _weightController,
                    decoration: InputDecoration(
                      labelText: S.of(context).onboardingWeight,
                      prefixIcon:
                          const Icon(Icons.monitor_weight, size: 20),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                        decimal: true),
                    onChanged: (v) {
                      final val = double.tryParse(v) ?? 70;
                      notifier.setWeight(val);
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    S.of(context).onboardingThresholdValues,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _thresholdHrController,
                    decoration: InputDecoration(
                      labelText: S.of(context).onboardingLthr,
                      prefixIcon:
                          const Icon(Icons.favorite_border, size: 20),
                      hintText: _lthr > 0
                          ? S.of(context).onboardingAutoLthr(_lthr)
                          : S.of(context).onboardingThresholdHr,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) {
                      final val = int.tryParse(v) ?? 0;
                      notifier.setThresholdHR(val);
                      setState(() {});
                    },
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _thresholdPaceMinController,
                          decoration: InputDecoration(
                            labelText: S.of(context).onboardingThresholdPaceMin,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _updateThresholdPace(notifier),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _thresholdPaceSecController,
                          decoration: InputDecoration(
                            labelText: S.of(context).onboardingSeconds,
                          ),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _updateThresholdPace(notifier),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (zones.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      S.of(context).onboardingCalculatedZones(_lthr),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...zones.map((zone) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  zone.label,
                                  style: theme.textTheme.bodySmall,
                                ),
                              ),
                              Text(
                                '${zone.min} - ${zone.max == 999 ? 'max' : zone.max} bpm',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        )),
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

  void _updateThresholdPace(Onboarding notifier) {
    final mins =
        int.tryParse(_thresholdPaceMinController.text) ?? 0;
    final secs =
        int.tryParse(_thresholdPaceSecController.text) ?? 0;
    notifier.setThresholdPace(mins * 60 + secs);
  }
}
