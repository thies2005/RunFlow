import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/core/utils/goal_projection.dart';
import 'package:runflow_flutter/core/utils/triathlon_estimator.dart';
import 'package:runflow_flutter/core/utils/athlete_defaults.dart';
import 'package:runflow_flutter/core/utils/race_defaults.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/goal_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/athlete_defaults_provider.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class GoalSetupWizard extends ConsumerStatefulWidget {
  const GoalSetupWizard({super.key});

  @override
  ConsumerState<GoalSetupWizard> createState() => _GoalSetupWizardState();
}

class _GoalSetupWizardState extends ConsumerState<GoalSetupWizard> {
  int _currentStep = 0;
  final _nameController = TextEditingController();
  RaceType _selectedRaceType = RaceType.fiveK;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 42));
  DateTime _planStartDate = DateTime.now();
  bool _hasTargetTime = false;
  int _runsPerWeek = 4;
  int _ridesPerWeek = 0;
  int _swimsPerWeek = 0;
  int _strengthPerWeek = 0;
  double _weeklyMileageGoal = 28.0;
  double _maxLongRunKm = 18.0;
  int _planWeeks = 12;
  int _taperWeeks = 1;
  int _peakWeeks = 2;
  int _buildWeeks = 4;
  int _longRunDay = 0;
  int _qualityDay = 3;
  int _swimDay = 1;
  List<int> _restDays = [];
  bool _isSubmitting = false;
  bool _isManualMode = false;
  int? _sliderGoalTimeSeconds;
  double _backyardLoopDistM = 0;
  int _targetLaps = 2;
  final _backyardLoopDistController = TextEditingController();
  double _customSwimDistM = 0;
  double _customBikeDistM = 0;
  double _customRunDistM = 0;
  final _customSwimController = TextEditingController();
  final _customBikeController = TextEditingController();
  final _customRunController = TextEditingController();

  final _nameFormKey = GlobalKey<FormState>();
  final _hoursController = TextEditingController();
  final _minutesController = TextEditingController();
  final _secondsController = TextEditingController();

  static const int _totalSteps = 9;

  int get _maxPlanWeeks => _selectedDate.difference(_planStartDate).inDays ~/ 7;
  int get _planWeeksCap => max(4, min(24, _maxPlanWeeks));
  int get _effectivePlanWeeks => _planWeeks.clamp(4, _planWeeksCap).toInt();

  List<int> _clampedPhases(int planWeeks) {
    final total = _taperWeeks + _peakWeeks + _buildWeeks;
    if (total <= planWeeks || total == 0) {
      return [_taperWeeks, _peakWeeks, _buildWeeks];
    }

    final proportion = planWeeks / total;
    final taper = max(0, (_taperWeeks * proportion).round());
    final peak = max(0, (_peakWeeks * proportion).round());
    final build = max(0, planWeeks - taper - peak);
    return [taper, peak, build];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _hoursController.dispose();
    _minutesController.dispose();
    _secondsController.dispose();
    _backyardLoopDistController.dispose();
    _customSwimController.dispose();
    _customBikeController.dispose();
    _customRunController.dispose();
    super.dispose();
  }

  bool _validateCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _nameFormKey.currentState?.validate() ?? false;
      case 1:
        return true;
      case 2:
        final now = DateTime.now();
        if (_selectedDate.isBefore(DateTime(now.year, now.month, now.day))) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(S.of(context).goalWizardFutureRaceDate)),
          );
          return false;
        }
        if (_planStartDate.isAfter(_selectedDate)) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(S.of(context).goalWizardPlanStartDateAfterRace),
            ),
          );
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        if (_taperWeeks + _peakWeeks + _buildWeeks > _effectivePlanWeeks) {
          final phases = _clampedPhases(_effectivePlanWeeks);
          setState(() {
            _taperWeeks = phases[0];
            _peakWeeks = phases[1];
            _buildWeeks = phases[2];
          });
        }
        return true;
      case 6:
        return true;
      case 7:
        return true;
      case 8:
        return true;
      default:
        return true;
    }
  }

  void _nextStep() {
    if (!_validateCurrentStep()) return;
    if (_currentStep < _totalSteps - 1) {
      setState(() {
        _currentStep++;
      });
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  int? get _targetTimeInSeconds {
    if (_selectedRaceType.isTimedEvent) {
      return _selectedRaceType == RaceType.twelveHour ? 43200 : 86400;
    }
    if (_selectedRaceType == RaceType.backyardUltra) {
      return _computeBackyardTime();
    }

    final stats = ref.read(analyticsStatsProvider).value;
    final vo2max = stats?.effectiveVO2max ?? 0;

    if (vo2max > 0) {
      if (_isManualMode) {
        final hours = int.tryParse(_hoursController.text) ?? 0;
        final minutes = int.tryParse(_minutesController.text) ?? 0;
        final seconds = int.tryParse(_secondsController.text) ?? 0;
        final total = hours * 3600 + minutes * 60 + seconds;
        return total > 0 ? total : null;
      }
      if (_selectedRaceType.isTriathlon) {
        return _sliderGoalTimeSeconds ?? _computeTriathlonProjectedTime();
      }
      return _sliderGoalTimeSeconds ?? _computeProjectedTime();
    }

    if (!_hasTargetTime) return null;
    final hours = int.tryParse(_hoursController.text) ?? 0;
    final minutes = int.tryParse(_minutesController.text) ?? 0;
    final seconds = int.tryParse(_secondsController.text) ?? 0;
    final total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  int? _computeProjectedTime() {
    final stats = ref.read(analyticsStatsProvider).value;
    if (stats == null || stats.effectiveVO2max <= 0) return null;

    final projection = calculateProjectedGoalTime(
      stats.effectiveVO2max,
      PlanSettings(
        durationWeeks: _planWeeks,
        runsPerWeek: _runsPerWeek,
        weeklyMileageGoal: _weeklyMileageGoal,
        raceDistance: _selectedRaceType,
      ),
      currentShapePercent: stats.marathonShape,
    );

    if (projection.projectedTime <= 0) return null;
    return projection.projectedTime;
  }

  int? _computeTriathlonProjectedTime() {
    final stats = ref.read(analyticsStatsProvider).value;
    if (stats == null || stats.effectiveVO2max <= 0) return null;
    final progressionFactor = calculateProgressionCoefficient(
      _planWeeks,
      _runsPerWeek,
      _weeklyMileageGoal,
    );
    final projectedVdot = stats.effectiveVO2max * progressionFactor;
    final key = triRaceTypeKey(_selectedRaceType);
    final defaults = ref.read(athleteDefaultsProvider);
    final projection = estimateTriathlonTime(
      projectedVdot,
      key,
      (double v, int d) => estimateTimeForDistance(v, d),
      cssOverride: defaults.estimatedCssSecPer100m,
      bikeSpeedOverrideMs: defaults.estimatedFlatBikeSpeedMs,
    );
    return projection?.projected.totalSeconds;
  }

  int? _computeBackyardTime() {
    final stats = ref.read(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    if (vdot <= 0 || _backyardLoopDistM <= 0) return null;
    final progressionFactor = calculateProgressionCoefficient(
      _planWeeks,
      _runsPerWeek,
      _weeklyMileageGoal,
    );
    final projectedVdot = vdot * progressionFactor;
    final projection = estimateBackyardUltraTime(
      projectedVdot,
      _backyardLoopDistM.toInt(),
      _targetLaps,
      (double v, int d) => estimateTimeForDistance(v, d),
    );
    return projection?.projected.totalSeconds;
  }

  int _estimateDistanceForTime(double vdot, int timeSeconds) {
    int lo = 1000;
    int hi = 500000;
    while (hi - lo > 100) {
      final mid = (lo + hi) ~/ 2;
      final estimated = estimateTimeForDistance(vdot, mid);
      if (estimated <= 0) break;
      if (estimated < timeSeconds) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  String? _computeEstimatedTimedDistance() {
    final stats = ref.read(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    if (vdot <= 0) return null;
    final fixedSeconds =
        _selectedRaceType == RaceType.twelveHour ? 43200 : 86400;
    final progressionFactor = calculateProgressionCoefficient(
      _planWeeks,
      _runsPerWeek,
      _weeklyMileageGoal,
    );
    final projectedVdot = vdot * progressionFactor;
    final distM = _estimateDistanceForTime(projectedVdot, fixedSeconds);
    return '${(distM / 1000).toStringAsFixed(1)} km';
  }

  Widget _buildTargetTimeStep() {
    if (_selectedRaceType == RaceType.backyardUltra) {
      return _buildBackyardUltraTimeStep();
    }
    if (_selectedRaceType.isTriathlon) return _buildTriathlonTimeStep();
    if (_selectedRaceType.isTimedEvent) return _buildTimedEventStep();
    return _buildStandardTargetTimeStep();
  }

  Widget _buildStandardTargetTimeStep() {
    final stats = ref.watch(analyticsStatsProvider).value;
    final effectiveVO2max = stats?.effectiveVO2max ?? 0;
    final marathonShape = stats?.marathonShape ?? 70;
    return _TargetTimeStep(
      hasTargetTime: _hasTargetTime,
      onHasTargetTimeChanged: (value) {
        setState(() {
          _hasTargetTime = value;
        });
      },
      hoursController: _hoursController,
      minutesController: _minutesController,
      secondsController: _secondsController,
      effectiveVO2max: effectiveVO2max,
      marathonShape: marathonShape,
      selectedRaceType: _selectedRaceType,
      planWeeks: _planWeeks,
      runsPerWeek: _runsPerWeek,
      weeklyMileageGoal: _weeklyMileageGoal,
      isManualMode: _isManualMode,
      sliderGoalTimeSeconds: _sliderGoalTimeSeconds,
      onManualModeChanged: (value) {
        setState(() {
          _isManualMode = value;
        });
      },
      onSliderGoalTimeChanged: (value) {
        setState(() {
          _sliderGoalTimeSeconds = value;
        });
      },
    );
  }

  Widget _buildBackyardUltraTimeStep() {
    final theme = Theme.of(context);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    final totalDistKm = _backyardLoopDistM > 0
        ? (_backyardLoopDistM * _targetLaps) / 1000
        : 0.0;

    BackyardProjection? projection;
    if (vdot > 0 && _backyardLoopDistM > 0) {
      final progressionFactor = calculateProgressionCoefficient(
        _planWeeks,
        _runsPerWeek,
        _weeklyMileageGoal,
      );
      final projectedVdot = vdot * progressionFactor;
      projection = estimateBackyardUltraTime(
        projectedVdot,
        _backyardLoopDistM.toInt(),
        _targetLaps,
        (double v, int d) => estimateTimeForDistance(v, d),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTargetTimeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Configure your backyard ultra loop and lap count.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          TextFormField(
            controller: _backyardLoopDistController,
            decoration: const InputDecoration(
              labelText: 'Loop distance (meters)',
              hintText: 'e.g. 6706',
            ),
            keyboardType: TextInputType.number,
            onChanged: (value) {
              setState(() {
                _backyardLoopDistM = double.tryParse(value) ?? 0;
              });
            },
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.loop, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Target laps',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '$_targetLaps',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: _targetLaps.toDouble(),
                    min: 1,
                    max: 100,
                    divisions: 99,
                    label: '$_targetLaps',
                    onChanged: (v) =>
                        setState(() => _targetLaps = v.round()),
                  ),
                ],
              ),
            ),
          ),
          if (projection != null)
          Center(
            child: Column(
              children: [
                Text(
                  formatDurationClock(
                      projection.projected.totalSeconds),
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Estimated finish time',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Optimal: ${formatDurationClock(projection.optimal.totalSeconds)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                      ),
                    ),
                    Text(
                      'Conservative: ${formatDurationClock(projection.conservative.totalSeconds)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (_backyardLoopDistM > 0) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.straighten, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Total distance',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Text(
                      '${totalDistKm.toStringAsFixed(1)} km',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (vdot > 0) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'VO2max',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            vdot.toStringAsFixed(1),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTriathlonTimeStep() {
    final theme = Theme.of(context);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    final key = triRaceTypeKey(_selectedRaceType);
    final defaults = ref.watch(athleteDefaultsProvider);

    final swimDist = _selectedRaceType == RaceType.customTri && _customSwimDistM > 0
        ? _customSwimDistM.toInt()
        : (triSwimDist[key] ?? 1500);
    final bikeDist = _selectedRaceType == RaceType.customTri && _customBikeDistM > 0
        ? _customBikeDistM.toInt()
        : (triBikeDist[key] ?? 40000);
    final runDist = _selectedRaceType == RaceType.customTri && _customRunDistM > 0
        ? _customRunDistM.toInt()
        : (triRunDist[key] ?? 10000);

    TriathlonProjection? triProjection;
    if (vdot > 0) {
      final progressionFactor = calculateProgressionCoefficient(
        _planWeeks,
        _runsPerWeek,
        _weeklyMileageGoal,
      );
      final projectedVdot = vdot * progressionFactor;
      triProjection = estimateTriathlonTime(
        projectedVdot,
        key,
        (double v, int d) => estimateTimeForDistance(v, d),
        cssOverride: defaults.estimatedCssSecPer100m,
        bikeSpeedOverrideMs: defaults.estimatedFlatBikeSpeedMs,
        customSwimDistM: _selectedRaceType == RaceType.customTri && _customSwimDistM > 0
            ? _customSwimDistM.toInt() : null,
        customBikeDistM: _selectedRaceType == RaceType.customTri && _customBikeDistM > 0
            ? _customBikeDistM.toInt() : null,
        customRunDistM: _selectedRaceType == RaceType.customTri && _customRunDistM > 0
            ? _customRunDistM.toInt() : null,
      );
    }

    final sliderMin = triProjection?.optimal.totalSeconds ?? 3600;
    final sliderMax = triProjection?.conservative.totalSeconds ?? 21600;
    final range = sliderMax - sliderMin;
    final adaptiveStep = range <= 7200
        ? 30
        : range <= 14400
            ? 60
            : range <= 28800
                ? 120
                : 300;
    final divisions = (range ~/ adaptiveStep).clamp(1, 200);
    final displayTime =
        _sliderGoalTimeSeconds ?? triProjection?.projected.totalSeconds;
    final clampedDisplay = displayTime != null
        ? displayTime.clamp(sliderMin, sliderMax).toInt()
        : sliderMin;

    final t = range > 0
        ? (clampedDisplay - sliderMin) / range
        : 0.0;

    TriathlonSplits? interpSplits;
    if (triProjection != null) {
      final proj = triProjection;
      final opt = proj.optimal;
      final cons = proj.conservative;
      interpSplits = TriathlonSplits(
        swimSeconds:
            (opt.swimSeconds + t * (cons.swimSeconds - opt.swimSeconds))
                .round(),
        bikeSeconds:
            (opt.bikeSeconds + t * (cons.bikeSeconds - opt.bikeSeconds))
                .round(),
        runSeconds:
            (opt.runSeconds + t * (cons.runSeconds - opt.runSeconds)).round(),
        t1Seconds: opt.t1Seconds,
        t2Seconds: opt.t2Seconds,
        totalSeconds: clampedDisplay,
        swimPacePer100m: opt.swimPacePer100m +
            t * (cons.swimPacePer100m - opt.swimPacePer100m),
        bikeAvgPower: opt.bikeAvgPower +
            t * (cons.bikeAvgPower - opt.bikeAvgPower),
        runPacePerKm:
            opt.runPacePerKm + t * (cons.runPacePerKm - opt.runPacePerKm),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTargetTimeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Set your target finish time for the triathlon.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          if (_selectedRaceType == RaceType.customTri) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Custom Distances',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _customSwimController,
                            decoration: const InputDecoration(
                              labelText: 'Swim (m)',
                              hintText: '1500',
                              isDense: true,
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              setState(() {
                                _customSwimDistM = double.tryParse(v) ?? 0;
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _customBikeController,
                            decoration: const InputDecoration(
                              labelText: 'Bike (m)',
                              hintText: '40000',
                              isDense: true,
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              setState(() {
                                _customBikeDistM = double.tryParse(v) ?? 0;
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _customRunController,
                            decoration: const InputDecoration(
                              labelText: 'Run (m)',
                              hintText: '10000',
                              isDense: true,
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              setState(() {
                                _customRunDistM = double.tryParse(v) ?? 0;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Leave blank for Olympic defaults (1500m / 40km / 10km)',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Center(
            child: Column(
              children: [
                Text(
                  formatDurationClock(clampedDisplay),
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _sliderGoalTimeSeconds != null
                      ? 'Custom goal'
                      : 'Projected based on fitness',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: _sliderGoalTimeSeconds != null
                        ? AppColors.primary
                        : AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ExpansionTile(
            title: Text(
              triProjection != null
                  ? 'Estimated Splits'
                  : 'Race Disciplines',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            initiallyExpanded: triProjection == null,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    if (triProjection != null && interpSplits != null) ...[
                      _buildSplitRow(theme, Icons.pool, 'Swim',
                          interpSplits.swimSeconds),
                      const Divider(height: 16),
                      _buildSplitRow(
                          theme, Icons.swap_horiz, 'T1',
                          interpSplits.t1Seconds),
                      const Divider(height: 16),
                      _buildBikeSplitRow(
                          theme, interpSplits),
                      const Divider(height: 16),
                      _buildSplitRow(
                          theme, Icons.swap_horiz, 'T2',
                          interpSplits.t2Seconds),
                      const Divider(height: 16),
                      _buildSplitRow(theme, Icons.directions_run, 'Run',
                          interpSplits.runSeconds),
                      const Divider(height: 16),
                      _buildSplitRow(theme, Icons.timer, 'Total',
                          interpSplits.totalSeconds),
                    ] else ...[
                      _buildDistanceRow(theme, Icons.pool, 'Swim',
                          '${(swimDist / 1000).toStringAsFixed(1)} km'),
                      const Divider(height: 16),
                      _buildDistanceRow(theme, Icons.directions_bike, 'Bike',
                          '${(bikeDist / 1000).toStringAsFixed(0)} km'),
                      const Divider(height: 16),
                      _buildDistanceRow(theme, Icons.directions_run, 'Run',
                          '${(runDist / 1000).toStringAsFixed(1)} km'),
                      const Divider(height: 16),
                      Text(
                        'Set a target time to see predicted splits',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (triProjection == null) ...[
            const SizedBox(height: 16),
            SwitchListTile(
              title: Text(S.of(context).goalWizardSetTargetTime),
              value: _hasTargetTime,
              onChanged: (v) => setState(() => _hasTargetTime = v),
              contentPadding: EdgeInsets.zero,
            ),
            if (_hasTargetTime) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _hoursController,
                      decoration: InputDecoration(
                        labelText: S.of(context).goalWizardHours,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Text(':',
                        style: theme.textTheme.headlineMedium),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _minutesController,
                      decoration: InputDecoration(
                        labelText: S.of(context).goalWizardMinutes,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Text(':',
                        style: theme.textTheme.headlineMedium),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _secondsController,
                      decoration: InputDecoration(
                        labelText:
                            S.of(context).goalWizardSecondsLabel,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ],
          ] else ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () =>
                      setState(() => _isManualMode = !_isManualMode),
                  icon: Icon(_isManualMode ? Icons.tune : Icons.edit),
                  label: Text(_isManualMode ? 'Prediction' : 'Manual'),
                ),
                if (_sliderGoalTimeSeconds != null)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _sliderGoalTimeSeconds = null;
                        _isManualMode = false;
                      });
                    },
                    child: const Text('Reset to projected'),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (_isManualMode)
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _hoursController,
                      decoration: InputDecoration(
                        labelText: S.of(context).goalWizardHours,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Text(':',
                        style: theme.textTheme.headlineMedium),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _minutesController,
                      decoration: InputDecoration(
                        labelText: S.of(context).goalWizardMinutes,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Text(':',
                        style: theme.textTheme.headlineMedium),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _secondsController,
                      decoration: InputDecoration(
                        labelText:
                            S.of(context).goalWizardSecondsLabel,
                        hintText: '0',
                      ),
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              )
            else
              Column(
                children: [
                  Slider(
                    value: clampedDisplay.toDouble(),
                    min: sliderMin.toDouble(),
                    max: sliderMax.toDouble(),
                    divisions: divisions,
                    label: formatDurationClock(clampedDisplay),
                    onChanged: (value) => setState(
                        () => _sliderGoalTimeSeconds = value.round()),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${formatDurationClock(sliderMin)} (Optimal)',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.success,
                        ),
                      ),
                      Text(
                        '${formatDurationClock(sliderMax)} (Conservative)',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
          ],
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'VO2max',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                            Text(
                              vdot.toStringAsFixed(1),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (defaults.cssSource ==
                              AthleteDefaultsSource.fromActivities ||
                          defaults.bikeSource ==
                              AthleteDefaultsSource.fromActivities)
                        const Icon(Icons.data_usage,
                            size: 18, color: AppColors.success),
                    ],
                  ),
                  if (defaults.cssSource ==
                      AthleteDefaultsSource.fromActivities) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.pool,
                            size: 16, color: AppColors.onSurfaceVariant),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'CSS from ${defaults.qualifyingSwimCount} swims',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (defaults.bikeSource ==
                      AthleteDefaultsSource.fromActivities) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.directions_bike,
                            size: 16, color: AppColors.onSurfaceVariant),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Bike speed from ${defaults.qualifyingRideCount} rides',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),

        ],
      ),
    );
  }

  Widget _buildSplitRow(
      ThemeData theme, IconData icon, String label, int seconds) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodyMedium,
          ),
        ),
        Text(
          formatDurationClock(seconds),
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildBikeSplitRow(ThemeData theme, TriathlonSplits splits) {
    final watts = splits.bikeAvgPower.round();
    final speedMs = bikePowerToSpeed(splits.bikeAvgPower);
    final speedKmh = speedMs * 3.6;
    return Row(
      children: [
        const Icon(Icons.directions_bike, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bike',
                style: theme.textTheme.bodyMedium,
              ),
              Text(
                '${watts}W · ${speedKmh.toStringAsFixed(1)} km/h',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        Text(
          formatDurationClock(splits.bikeSeconds),
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildDistanceRow(
      ThemeData theme, IconData icon, String label, String distance) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodyMedium,
          ),
        ),
        Text(
          distance,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildTimedEventStep() {
    final theme = Theme.of(context);
    final stats = ref.watch(analyticsStatsProvider).value;
    final vdot = stats?.effectiveVO2max ?? 0;
    final fixedSeconds =
        _selectedRaceType == RaceType.twelveHour ? 43200 : 86400;
    final durationLabel =
        _selectedRaceType == RaceType.twelveHour ? '12 hours' : '24 hours';

    String? estimatedDistance;
    String? pacePerKm;
    if (vdot > 0) {
      final progressionFactor = calculateProgressionCoefficient(
        _planWeeks,
        _runsPerWeek,
        _weeklyMileageGoal,
      );
      final projectedVdot = vdot * progressionFactor;
      final distM =
          _estimateDistanceForTime(projectedVdot, fixedSeconds);
      estimatedDistance = '${(distM / 1000).toStringAsFixed(1)} km';
      pacePerKm = formatPace(fixedSeconds / (distM / 1000));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTargetTimeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'This is a fixed-duration event.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Center(
                    child: Text(
                      formatDurationClock(fixedSeconds),
                      style: theme.textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Fixed duration: $durationLabel',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (estimatedDistance != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.straighten,
                            color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Estimated distance',
                            style:
                                theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Text(
                          estimatedDistance,
                          style:
                              theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.speed,
                            color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Projected pace',
                            style:
                                theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Text(
                          pacePerKm!,
                          style:
                              theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (vdot > 0) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'VO2max',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            vdot.toStringAsFixed(1),
                            style:
                                theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    final maxPlanWeeks = _maxPlanWeeks;
    if (maxPlanWeeks < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(S.of(context).goalWizardFutureRaceDate)),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final planWeeksCap = max(4, min(24, maxPlanWeeks));
      final effectivePlanWeeks = _planWeeks.clamp(4, planWeeksCap).toInt();
      final phases = _clampedPhases(effectivePlanWeeks);

      final request = CreateGoalRequest(
        name: _nameController.text.trim(),
        raceType: _selectedRaceType,
        raceDate: _selectedDate,
        planStartDate: _planStartDate,
        targetTime: _targetTimeInSeconds,
        weeklyMileageGoal: (_weeklyMileageGoal * 1000).roundToDouble(),
        planWeeks: effectivePlanWeeks,
        runsPerWeek: _runsPerWeek,
        ridesPerWeek: _ridesPerWeek,
        swimsPerWeek: _swimsPerWeek,
        strengthPerWeek: _strengthPerWeek,
        taperWeeks: phases[0],
        peakWeeks: phases[1],
        buildWeeks: phases[2],
        maxLongRunKm: _maxLongRunKm.roundToDouble(),
        longRunDay: _longRunDay,
        workoutDay: _qualityDay,
        swimDay: _swimDay,
        restDays: _restDays.isNotEmpty ? _restDays : null,
        backyardLoopDistM: _selectedRaceType ==
                RaceType.backyardUltra &&
            _backyardLoopDistM > 0
            ? _backyardLoopDistM
            : null,
        targetLaps:
            _selectedRaceType == RaceType.backyardUltra ? _targetLaps : null,
        sport: _selectedRaceType.isTriathlon ? 'TRIATHLON' : 'RUN',
        athleteCssOverride: _selectedRaceType.isTriathlon
            ? ref.read(athleteDefaultsProvider).estimatedCssSecPer100m
            : null,
        athleteBikeSpeedOverride: _selectedRaceType.isTriathlon
            ? ref.read(athleteDefaultsProvider).estimatedFlatBikeSpeedMs
            : null,
        customSwimDistM: _selectedRaceType == RaceType.customTri &&
            _customSwimDistM > 0 ? _customSwimDistM : null,
        customBikeDistM: _selectedRaceType == RaceType.customTri &&
            _customBikeDistM > 0 ? _customBikeDistM : null,
        customRunDistM: _selectedRaceType == RaceType.customTri &&
            _customRunDistM > 0 ? _customRunDistM : null,
      );

      final goal = await ref.read(goalsProvider.notifier).createGoal(request);
      if (mounted) {
        context.go('/goals/${goal.id}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(S.of(context).goalWizardCreateFailed(e.toString())),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final planWeeksCap = _planWeeksCap;

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).goalWizardNewGoal),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/goals'),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: List.generate(
                _totalSteps,
                (index) => Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      right: index < _totalSteps - 1 ? 4 : 0,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: Container(
                        height: 4,
                        color: index <= _currentStep
                            ? AppColors.primary
                            : Theme.of(
                                context,
                              ).colorScheme.surfaceContainerHighest,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _currentStep,
              children: [
                _NameOnlyStep(
                  controller: _nameController,
                  formKey: _nameFormKey,
                ),
                _RaceTypeStep(
                  selectedRaceType: _selectedRaceType,
                  onRaceTypeSelected: (type) {
                    setState(() {
                      _selectedRaceType = type;
                      _isManualMode = false;
                      _sliderGoalTimeSeconds = null;
                      _hasTargetTime = false;
                      _hoursController.clear();
                      _minutesController.clear();
                      _secondsController.clear();
                      final vdot = ref.read(analyticsStatsProvider).value?.effectiveVO2max ?? 0;
                      var d = getRaceDefaults(type);
                      if (vdot > 0) {
                        d = adjustDefaultsForVdot(d, vdot);
                      }
                      _runsPerWeek = d.runsPerWeek;
                      _ridesPerWeek = d.ridesPerWeek;
                      _swimsPerWeek = d.swimsPerWeek;
                      _strengthPerWeek = d.strengthPerWeek;
                      _weeklyMileageGoal = d.weeklyVolumeKm;
                      _maxLongRunKm = d.maxLongRunKm;
                      _taperWeeks = d.taperWeeks;
                      _peakWeeks = d.peakWeeks;
                      _buildWeeks = d.buildWeeks;
                      if (d.backyardLoopDistM != null) {
                        _backyardLoopDistM = d.backyardLoopDistM!.toDouble();
                        _backyardLoopDistController.text = '${d.backyardLoopDistM}';
                      }
                      if (d.targetLaps != null) {
                        _targetLaps = d.targetLaps!;
                      }
                    });
                  },
                ),
                _DateStep(
                  selectedDate: _selectedDate,
                  planStartDate: _planStartDate,
                  onDateSelected: (date) {
                    setState(() {
                      _selectedDate = date;
                      if (_planStartDate.isAfter(date)) {
                        _planStartDate = date;
                      }
                      final mw = date.difference(_planStartDate).inDays ~/ 7;
                      final cap = max(4, min(24, mw));
                      if (_planWeeks > cap) {
                        _planWeeks = cap;
                      }
                    });
                  },
                  onPlanStartDateSelected: (date) {
                    setState(() {
                      _planStartDate = date;
                      final cap = max(
                        4,
                        min(24, _selectedDate.difference(date).inDays ~/ 7),
                      );
                      if (_planWeeks > cap) {
                        _planWeeks = cap;
                      }
                    });
                  },
                ),
                _buildTargetTimeStep(),
                _TrainingVolumeStep(
                  runsPerWeek: _runsPerWeek,
                  ridesPerWeek: _ridesPerWeek,
                  swimsPerWeek: _swimsPerWeek,
                  strengthPerWeek: _strengthPerWeek,
                  weeklyMileageGoal: _weeklyMileageGoal,
                  maxLongRunKm: _maxLongRunKm,
                  onRunsPerWeekChanged: (v) => setState(() => _runsPerWeek = v),
                  onRidesPerWeekChanged: (v) =>
                      setState(() => _ridesPerWeek = v),
                  onSwimsPerWeekChanged: (v) =>
                      setState(() => _swimsPerWeek = v),
                  onStrengthPerWeekChanged: (v) =>
                      setState(() => _strengthPerWeek = v),
                  onWeeklyMileageGoalChanged: (v) =>
                      setState(() => _weeklyMileageGoal = v),
                  onMaxLongRunKmChanged: (v) =>
                      setState(() => _maxLongRunKm = v),
                ),
                _TrainingPhasesStep(
                  taperWeeks: _taperWeeks,
                  peakWeeks: _peakWeeks,
                  buildWeeks: _buildWeeks,
                  planWeeks: _planWeeks,
                  onTaperWeeksChanged: (v) => setState(() => _taperWeeks = v),
                  onPeakWeeksChanged: (v) => setState(() => _peakWeeks = v),
                  onBuildWeeksChanged: (v) => setState(() => _buildWeeks = v),
                ),
                _WorkoutSchedulingStep(
                  longRunDay: _longRunDay,
                  qualityDay: _qualityDay,
                  swimDay: _swimDay,
                  restDays: _restDays,
                  onLongRunDayChanged: (v) => setState(() => _longRunDay = v),
                  onQualityDayChanged: (v) => setState(() => _qualityDay = v),
                  onSwimDayChanged: (v) => setState(() => _swimDay = v),
                  onRestDaysChanged: (v) => setState(() => _restDays = v),
                ),
                _PlanDurationStep(
                  planWeeks: _planWeeks.clamp(4, planWeeksCap).toInt(),
                  selectedDate: _selectedDate,
                  planStartDate: _planStartDate,
                  onPlanWeeksChanged: (value) {
                    setState(() {
                      _planWeeks = value;
                    });
                  },
                ),
                _ReviewStep(
                  name: _nameController.text,
                  raceType: _selectedRaceType,
                  raceDate: _selectedDate,
                  planStartDate: _planStartDate,
                  targetTime: _targetTimeInSeconds,
                  runsPerWeek: _runsPerWeek,
                  ridesPerWeek: _ridesPerWeek,
                  swimsPerWeek: _swimsPerWeek,
                  strengthPerWeek: _strengthPerWeek,
                  weeklyMileageGoal: _weeklyMileageGoal,
                  maxLongRunKm: _maxLongRunKm,
                  planWeeks: _planWeeks.clamp(4, planWeeksCap).toInt(),
                  taperWeeks: _taperWeeks,
                  peakWeeks: _peakWeeks,
                  buildWeeks: _buildWeeks,
                  longRunDay: _longRunDay,
                  qualityDay: _qualityDay,
                  swimDay: _swimDay,
                  restDays: _restDays,
                  backyardLoopDistM: _backyardLoopDistM,
                  targetLaps: _targetLaps,
                  estimatedTimedDistance:
                      _selectedRaceType.isTimedEvent && _targetTimeInSeconds != null
                          ? _computeEstimatedTimedDistance()
                          : null,
                ),
              ],
            ),
          ),
          _NavigationButtons(
            currentStep: _currentStep,
            totalSteps: _totalSteps,
            isSubmitting: _isSubmitting,
            onPrevious: _previousStep,
            onNext: _nextStep,
            onSubmit: _submit,
          ),
        ],
      ),
    );
  }
}

class _NavigationButtons extends StatelessWidget {
  const _NavigationButtons({
    required this.currentStep,
    required this.totalSteps,
    required this.isSubmitting,
    required this.onPrevious,
    required this.onNext,
    required this.onSubmit,
  });

  final int currentStep;
  final int totalSteps;
  final bool isSubmitting;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final isLastStep = currentStep == totalSteps - 1;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Row(
        children: [
          if (currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: onPrevious,
                child: Text(S.of(context).actionBack),
              ),
            ),
          if (currentStep > 0) const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: isSubmitting ? null : (isLastStep ? onSubmit : onNext),
              child: isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : Text(
                      isLastStep
                          ? S.of(context).planCreateGoal
                          : S.of(context).actionNext,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NameOnlyStep extends StatelessWidget {
  const _NameOnlyStep({
    required this.controller,
    required this.formKey,
  });

  final TextEditingController controller;
  final GlobalKey<FormState> formKey;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardGoalName,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).goalWizardNameRaceTypeDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Form(
            key: formKey,
            child: TextFormField(
              controller: controller,
              decoration: InputDecoration(
                labelText: S.of(context).goalWizardGoalName,
                hintText: S.of(context).goalWizardGoalNameHint,
              ),
              textCapitalization: TextCapitalization.words,
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return S.of(context).goalWizardGoalNameRequired;
                }
                if (v.trim().length < 2) {
                  return S.of(context).goalWizardGoalNameMinChars;
                }
                return null;
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RaceTypeStep extends StatelessWidget {
  const _RaceTypeStep({
    required this.selectedRaceType,
    required this.onRaceTypeSelected,
  });

  final RaceType selectedRaceType;
  final ValueChanged<RaceType> onRaceTypeSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = S.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.goalWizardRaceTypeLabel,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            s.goalWizardNameRaceTypeDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          _RaceCategoryCard(
            icon: Icons.directions_run,
            title: s.raceCategoryRunning,
            color: AppColors.primary,
            options: const [
              RaceType.fiveK,
              RaceType.tenK,
              RaceType.halfMarathon,
              RaceType.marathon,
            ],
            selectedRaceType: selectedRaceType,
            onSelected: onRaceTypeSelected,
          ),
          const SizedBox(height: 12),
          _RaceCategoryCard(
            icon: Icons.terrain,
            title: s.raceCategoryUltra,
            color: const Color(0xFF795548),
            options: const [
              RaceType.fiftyK,
              RaceType.fiftyMile,
              RaceType.hundredK,
              RaceType.hundredMile,
              RaceType.twelveHour,
              RaceType.twentyFourHour,
              RaceType.backyardUltra,
              RaceType.customDistance,
            ],
            selectedRaceType: selectedRaceType,
            onSelected: onRaceTypeSelected,
          ),
          const SizedBox(height: 12),
          _RaceCategoryCard(
            icon: Icons.directions_bike,
            title: s.raceCategoryTriathlon,
            color: const Color(0xFF0097A7),
            options: const [
              RaceType.sprintTri,
              RaceType.olympicTri,
              RaceType.halfIronman,
              RaceType.fullIronman,
              RaceType.customTri,
            ],
            selectedRaceType: selectedRaceType,
            onSelected: onRaceTypeSelected,
          ),
        ],
      ),
    );
  }
}

class _RaceCategoryCard extends StatelessWidget {
  const _RaceCategoryCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.options,
    required this.selectedRaceType,
    required this.onSelected,
  });

  final IconData icon;
  final String title;
  final Color color;
  final List<RaceType> options;
  final RaceType selectedRaceType;
  final ValueChanged<RaceType> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasSelection = options.contains(selectedRaceType);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: theme.copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: Icon(icon, color: hasSelection ? color : null),
          title: Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          trailing: hasSelection
              ? Icon(Icons.check_circle, color: color, size: 20)
              : const Icon(Icons.expand_more),
          initiallyExpanded: hasSelection,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: options.map((type) {
                final isSelected = type == selectedRaceType;
                return InkWell(
                  onTap: () => onSelected(type),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? color.withValues(alpha: 0.15)
                          : theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                      border: isSelected
                          ? Border.all(color: color, width: 1.5)
                          : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          raceTypeLabel(type),
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight:
                                isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? color : null,
                          ),
                        ),
                        Text(
                          _formatDistance(type),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDistance(RaceType type) {
    if (type.isTimedEvent) {
      return type == RaceType.twelveHour ? '12h' : '24h';
    }
    if (type.isTriathlon) return 'Swim·Bike·Run';
    if (type == RaceType.backyardUltra) return 'Variable';
    if (type == RaceType.customDistance) return 'Custom';
    if (type == RaceType.customTri) return 'Custom';
    final distance = raceTypeDistance(type);
    return '${(distance / 1000).toStringAsFixed(1)} km';
  }
}

class _DateStep extends StatelessWidget {
  const _DateStep({
    required this.selectedDate,
    required this.onDateSelected,
    required this.planStartDate,
    required this.onPlanStartDateSelected,
  });

  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;
  final DateTime planStartDate;
  final ValueChanged<DateTime> onPlanStartDateSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardRaceDateTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).goalWizardRaceDateDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    _formatDate(context, selectedDate),
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 730),
                          ),
                        );
                        if (picked != null) {
                          onDateSelected(picked);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: Text(S.of(context).goalWizardSelectDate),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    S.of(context).goalWizardPlanStartDateLabel,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final now = DateTime.now();
                        final firstDate = DateTime(
                          now.year,
                          now.month,
                          now.day,
                        ).subtract(const Duration(days: 30));
                        final initialDate = planStartDate.isAfter(selectedDate)
                            ? selectedDate
                            : planStartDate.isBefore(firstDate)
                            ? firstDate
                            : planStartDate;
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: initialDate,
                          firstDate: firstDate,
                          lastDate: selectedDate,
                        );
                        if (picked != null) {
                          onPlanStartDateSelected(picked);
                        }
                      },
                      icon: const Icon(Icons.play_arrow),
                      label: Text(_formatDate(context, planStartDate)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: AppColors.onSurfaceVariant,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      S
                          .of(context)
                          .goalWizardDaysFromNow(
                            selectedDate.difference(DateTime.now()).inDays,
                          ),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(BuildContext context, DateTime date) {
    final months = [
      S.of(context).monthJanuary,
      S.of(context).monthFebruary,
      S.of(context).monthMarch,
      S.of(context).monthApril,
      S.of(context).monthMay,
      S.of(context).monthJune,
      S.of(context).monthJuly,
      S.of(context).monthAugust,
      S.of(context).monthSeptember,
      S.of(context).monthOctober,
      S.of(context).monthNovember,
      S.of(context).monthDecember,
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _TargetTimeStep extends StatelessWidget {
  const _TargetTimeStep({
    required this.hasTargetTime,
    required this.onHasTargetTimeChanged,
    required this.hoursController,
    required this.minutesController,
    required this.secondsController,
    required this.effectiveVO2max,
    required this.marathonShape,
    required this.selectedRaceType,
    required this.planWeeks,
    required this.runsPerWeek,
    required this.weeklyMileageGoal,
    required this.isManualMode,
    required this.sliderGoalTimeSeconds,
    required this.onManualModeChanged,
    required this.onSliderGoalTimeChanged,
  });

  final bool hasTargetTime;
  final ValueChanged<bool> onHasTargetTimeChanged;
  final TextEditingController hoursController;
  final TextEditingController minutesController;
  final TextEditingController secondsController;
  final double effectiveVO2max;
  final double marathonShape;
  final RaceType selectedRaceType;
  final int planWeeks;
  final int runsPerWeek;
  final double weeklyMileageGoal;
  final bool isManualMode;
  final int? sliderGoalTimeSeconds;
  final ValueChanged<bool> onManualModeChanged;
  final ValueChanged<int?> onSliderGoalTimeChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (effectiveVO2max > 0) {
      return _buildPredictionMode(context, theme);
    }
    return _buildFallbackMode(context, theme);
  }

  Widget _buildPredictionMode(BuildContext context, ThemeData theme) {
    final projection = calculateProjectedGoalTime(
      effectiveVO2max,
      PlanSettings(
        durationWeeks: planWeeks,
        runsPerWeek: runsPerWeek,
        weeklyMileageGoal: weeklyMileageGoal,
        raceDistance: selectedRaceType,
      ),
      currentShapePercent: marathonShape,
    );

    if (projection.projectedTime <= 0) {
      return _buildFallbackMode(context, theme);
    }

    final displayTime = sliderGoalTimeSeconds ?? projection.projectedTime;
    final sliderMin = (projection.optimalTime * 0.9).round();
    final sliderMax = (projection.conservativeTime * 1.1).round();
    final clampedDisplay = displayTime.clamp(sliderMin, sliderMax).toInt();
    final divisions = ((sliderMax - sliderMin) ~/ 30).clamp(1, 200).toInt();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTargetTimeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).goalWizardTargetTimeDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Column(
              children: [
                Text(
                  formatDurationClock(displayTime),
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  sliderGoalTimeSeconds != null
                      ? 'Custom goal'
                      : 'Projected based on fitness',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: sliderGoalTimeSeconds != null
                        ? AppColors.primary
                        : AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton.icon(
                onPressed: () => onManualModeChanged(!isManualMode),
                icon: Icon(isManualMode ? Icons.tune : Icons.edit),
                label: Text(isManualMode ? 'Prediction' : 'Manual'),
              ),
              if (sliderGoalTimeSeconds != null)
                TextButton(
                  onPressed: () {
                    onSliderGoalTimeChanged(null);
                    onManualModeChanged(false);
                  },
                  child: const Text('Reset to projected'),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (isManualMode)
            _buildTimeFields(context, theme)
          else
            Column(
              children: [
                Slider(
                  value: clampedDisplay.toDouble(),
                  min: sliderMin.toDouble(),
                  max: sliderMax.toDouble(),
                  divisions: divisions,
                  label: formatDurationClock(clampedDisplay),
                  onChanged: (value) => onSliderGoalTimeChanged(value.round()),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${formatDurationClock(projection.optimalTime)} (Optimal)',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                      ),
                    ),
                    Text(
                      '${formatDurationClock(projection.conservativeTime)} (Conservative)',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VO2max',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              effectiveVO2max.toStringAsFixed(1),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              ' \u2192 ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                            Text(
                              projection.projectedVdot.toStringAsFixed(1),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                            if (projection.improvementPercent > 0)
                              Text(
                                ' (+${projection.improvementPercent.toStringAsFixed(1)}%)',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.success,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Marathon Shape',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              '${marathonShape.round()}%',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              ' \u2192 ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                            Text(
                              '${projection.projectedShape}%',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                            if (projection.shapeImprovementPercent > 0)
                              Text(
                                ' (+${projection.shapeImprovementPercent.toStringAsFixed(1)}%)',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.success,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackMode(BuildContext context, ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTargetTimeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).goalWizardTargetTimeDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          SwitchListTile(
            title: Text(S.of(context).goalWizardSetTargetTime),
            value: hasTargetTime,
            onChanged: onHasTargetTimeChanged,
            contentPadding: EdgeInsets.zero,
          ),
          if (hasTargetTime) ...[
            const SizedBox(height: 16),
            _buildTimeFields(context, theme),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeFields(BuildContext context, ThemeData theme) {
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            controller: hoursController,
            decoration: InputDecoration(
              labelText: S.of(context).goalWizardHours,
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Text(':', style: theme.textTheme.headlineMedium),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            controller: minutesController,
            decoration: InputDecoration(
              labelText: S.of(context).goalWizardMinutes,
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Text(':', style: theme.textTheme.headlineMedium),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            controller: secondsController,
            decoration: InputDecoration(
              labelText: S.of(context).goalWizardSecondsLabel,
              hintText: '0',
            ),
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class _TrainingVolumeStep extends StatelessWidget {
  const _TrainingVolumeStep({
    required this.runsPerWeek,
    required this.ridesPerWeek,
    required this.swimsPerWeek,
    required this.strengthPerWeek,
    required this.weeklyMileageGoal,
    required this.maxLongRunKm,
    required this.onRunsPerWeekChanged,
    required this.onRidesPerWeekChanged,
    required this.onSwimsPerWeekChanged,
    required this.onStrengthPerWeekChanged,
    required this.onWeeklyMileageGoalChanged,
    required this.onMaxLongRunKmChanged,
  });

  final int runsPerWeek;
  final int ridesPerWeek;
  final int swimsPerWeek;
  final int strengthPerWeek;
  final double weeklyMileageGoal;
  final double maxLongRunKm;
  final ValueChanged<int> onRunsPerWeekChanged;
  final ValueChanged<int> onRidesPerWeekChanged;
  final ValueChanged<int> onSwimsPerWeekChanged;
  final ValueChanged<int> onStrengthPerWeekChanged;
  final ValueChanged<double> onWeeklyMileageGoalChanged;
  final ValueChanged<double> onMaxLongRunKmChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = S.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.goalWizardTrainingVolumeTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            s.goalWizardTrainingVolumeDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          _buildCounterCard(
            theme: theme,
            icon: Icons.directions_run,
            label: s.goalWizardRunsPerWeek,
            value: runsPerWeek,
            onChanged: onRunsPerWeekChanged,
          ),
          const SizedBox(height: 12),
          _buildCounterCard(
            theme: theme,
            icon: Icons.directions_bike,
            label: s.goalWizardRidesPerWeek,
            value: ridesPerWeek,
            onChanged: onRidesPerWeekChanged,
          ),
          const SizedBox(height: 12),
          _buildCounterCard(
            theme: theme,
            icon: Icons.pool,
            label: s.goalWizardSwimsPerWeek,
            value: swimsPerWeek,
            onChanged: onSwimsPerWeekChanged,
          ),
          const SizedBox(height: 12),
          _buildCounterCard(
            theme: theme,
            icon: Icons.fitness_center,
            label: s.goalWizardStrengthPerWeek,
            value: strengthPerWeek,
            onChanged: onStrengthPerWeekChanged,
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.straighten, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          s.goalWizardWeeklyMileageGoal,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '${weeklyMileageGoal.toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: weeklyMileageGoal,
                    min: 10,
                    max: 120,
                    divisions: 22,
                    label: '${weeklyMileageGoal.toStringAsFixed(0)} km',
                    onChanged: onWeeklyMileageGoalChanged,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.trending_up, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          s.goalWizardMaxLongRunKm,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '${maxLongRunKm.toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: maxLongRunKm,
                    min: 6,
                    max: 80,
                    divisions: 74,
                    label: '${maxLongRunKm.toStringAsFixed(0)} km',
                    onChanged: onMaxLongRunKmChanged,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCounterCard({
    required ThemeData theme,
    required IconData icon,
    required String label,
    required int value,
    required ValueChanged<int> onChanged,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Text(
                  '$value',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            Slider(
              value: value.toDouble(),
              min: 0,
              max: 7,
              divisions: 7,
              label: '$value',
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      ),
    );
  }
}

class _TrainingPhasesStep extends StatelessWidget {
  const _TrainingPhasesStep({
    required this.taperWeeks,
    required this.peakWeeks,
    required this.buildWeeks,
    required this.planWeeks,
    required this.onTaperWeeksChanged,
    required this.onPeakWeeksChanged,
    required this.onBuildWeeksChanged,
  });

  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;
  final int planWeeks;
  final ValueChanged<int> onTaperWeeksChanged;
  final ValueChanged<int> onPeakWeeksChanged;
  final ValueChanged<int> onBuildWeeksChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final s = S.of(context);
    final total = taperWeeks + peakWeeks + buildWeeks;
    final exceedsPlan = total > planWeeks;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.goalWizardTrainingPhasesTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            s.goalWizardTrainingPhasesDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          _buildPhaseCard(
            theme: theme,
            label: s.goalWizardTaperWeeks,
            value: taperWeeks,
            onChanged: onTaperWeeksChanged,
          ),
          const SizedBox(height: 12),
          _buildPhaseCard(
            theme: theme,
            label: s.goalWizardPeakWeeks,
            value: peakWeeks,
            onChanged: onPeakWeeksChanged,
          ),
          const SizedBox(height: 12),
          _buildPhaseCard(
            theme: theme,
            label: s.goalWizardBuildWeeks,
            value: buildWeeks,
            onChanged: onBuildWeeksChanged,
          ),
          const SizedBox(height: 16),
          Card(
            color: exceedsPlan
                ? AppColors.warning.withValues(alpha: 0.1)
                : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    exceedsPlan ? Icons.warning_amber : Icons.check_circle,
                    color: exceedsPlan ? AppColors.warning : AppColors.success,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      exceedsPlan
                          ? s.goalWizardPhasesExceedPlan(total, planWeeks)
                          : s.goalWizardPhasesTotalLabel(total, planWeeks),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: exceedsPlan
                            ? AppColors.warning
                            : AppColors.success,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhaseCard({
    required ThemeData theme,
    required String label,
    required int value,
    required ValueChanged<int> onChanged,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Text(
                  '$value',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            Slider(
              value: value.toDouble(),
              min: 0,
              max: 8,
              divisions: 8,
              label: '$value',
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkoutSchedulingStep extends StatelessWidget {
  const _WorkoutSchedulingStep({
    required this.longRunDay,
    required this.qualityDay,
    required this.swimDay,
    required this.restDays,
    required this.onLongRunDayChanged,
    required this.onQualityDayChanged,
    required this.onSwimDayChanged,
    required this.onRestDaysChanged,
  });

  final int longRunDay;
  final int qualityDay;
  final int swimDay;
  final List<int> restDays;
  final ValueChanged<int> onLongRunDayChanged;
  final ValueChanged<int> onQualityDayChanged;
  final ValueChanged<int> onSwimDayChanged;
  final ValueChanged<List<int>> onRestDaysChanged;

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
    final s = S.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.goalWizardWorkoutSchedulingTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            s.goalWizardWorkoutSchedulingDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildDayDropdown(
                    context: context,
                    icon: Icons.directions_run,
                    label: s.goalWizardLongRunDay,
                    value: longRunDay,
                    onChanged: onLongRunDayChanged,
                  ),
                  const Divider(height: 24),
                  _buildDayDropdown(
                    context: context,
                    icon: Icons.speed,
                    label: s.goalWizardQualityDay,
                    value: qualityDay,
                    onChanged: onQualityDayChanged,
                  ),
                  const Divider(height: 24),
                  _buildDayDropdown(
                    context: context,
                    icon: Icons.pool,
                    label: s.goalWizardSwimDayLabel,
                    value: swimDay,
                    onChanged: onSwimDayChanged,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s.goalWizardRestDays,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(7, (index) {
                    final selected = restDays.contains(index);
                    return CheckboxListTile(
                      value: selected,
                      title: Text(_dayNames[index]),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      onChanged: (checked) {
                        final updated = List<int>.from(restDays);
                        if (checked == true) {
                          updated.add(index);
                          updated.sort();
                        } else {
                          updated.remove(index);
                        }
                        onRestDaysChanged(updated);
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayDropdown({
    required BuildContext context,
    required IconData icon,
    required String label,
    required int value,
    required ValueChanged<int> onChanged,
  }) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        DropdownButton<int>(
          value: value,
          underline: const SizedBox.shrink(),
          items: List.generate(
            7,
            (i) => DropdownMenuItem(value: i, child: Text(_dayNames[i])),
          ),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ],
    );
  }
}

class _PlanDurationStep extends StatelessWidget {
  const _PlanDurationStep({
    required this.planWeeks,
    required this.selectedDate,
    required this.planStartDate,
    required this.onPlanWeeksChanged,
  });

  final int planWeeks;
  final DateTime selectedDate;
  final DateTime planStartDate;
  final ValueChanged<int> onPlanWeeksChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxPlanWeeks = selectedDate.difference(planStartDate).inDays ~/ 7;
    final effectiveMax = max(4, min(24, maxPlanWeeks));
    final isInsufficientTime = maxPlanWeeks < 4;
    final divisions = (effectiveMax - 4).clamp(1, 20).toInt();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            S.of(context).goalWizardTrainingPlanTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).goalWizardTrainingPlanDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_month,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          S.of(context).goalWizardPlanDuration,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        S.of(context).goalWizardWeeksCount(planWeeks),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  if (isInsufficientTime) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(
                          Icons.warning_amber,
                          color: AppColors.warning,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Race date is too close for a training plan. Consider choosing a later date.',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.warning,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  Slider(
                    value: planWeeks
                        .toDouble()
                        .clamp(4.0, effectiveMax.toDouble())
                        .toDouble(),
                    min: 4,
                    max: effectiveMax.toDouble(),
                    divisions: divisions,
                    label: S.of(context).goalWizardWeeksCount(planWeeks),
                    onChanged: isInsufficientTime
                        ? null
                        : (value) => onPlanWeeksChanged(value.round()),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep({
    required this.name,
    required this.raceType,
    required this.raceDate,
    required this.planStartDate,
    required this.targetTime,
    required this.runsPerWeek,
    required this.ridesPerWeek,
    required this.swimsPerWeek,
    required this.strengthPerWeek,
    required this.weeklyMileageGoal,
    required this.maxLongRunKm,
    required this.planWeeks,
    required this.taperWeeks,
    required this.peakWeeks,
    required this.buildWeeks,
    required this.longRunDay,
    required this.qualityDay,
    required this.swimDay,
    required this.restDays,
    this.backyardLoopDistM = 0,
    this.targetLaps = 0,
    this.estimatedTimedDistance,
  });

  final String name;
  final RaceType raceType;
  final DateTime raceDate;
  final DateTime planStartDate;
  final int? targetTime;
  final int runsPerWeek;
  final int ridesPerWeek;
  final int swimsPerWeek;
  final int strengthPerWeek;
  final double weeklyMileageGoal;
  final double maxLongRunKm;
  final int planWeeks;
  final int taperWeeks;
  final int peakWeeks;
  final int buildWeeks;
  final int longRunDay;
  final int qualityDay;
  final int swimDay;
  final List<int> restDays;
  final double backyardLoopDistM;
  final int targetLaps;
  final String? estimatedTimedDistance;

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
    final s = S.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.goalWizardReviewTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            s.goalWizardReviewDesc,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ReviewRow(
                    icon: Icons.flag,
                    label: s.goalWizardGoalNameLabel,
                    value: name.isEmpty ? s.goalWizardNotSet : name,
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.directions_run,
                    label: s.goalWizardRaceTypeLabel,
                    value: raceTypeLabel(raceType),
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.event,
                    label: s.goalWizardRaceDateLabel,
                    value: _formatDate(context, raceDate),
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.play_arrow,
                    label: s.goalWizardPlanStartDateLabel,
                    value: _formatDate(context, planStartDate),
                  ),
                  if (targetTime != null) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.timer,
                      label: s.goalWizardTargetTimeLabel,
                      value: raceType.isTimedEvent
                          ? formatDurationClock(targetTime!)
                          : formatDuration(targetTime!),
                    ),
                  ],
                  if (raceType == RaceType.backyardUltra &&
                      backyardLoopDistM > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.loop,
                      label: 'Loop distance',
                      value: '${backyardLoopDistM.toStringAsFixed(0)} m',
                    ),
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.repeat,
                      label: 'Target laps',
                      value: '$targetLaps',
                    ),
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.straighten,
                      label: 'Total distance',
                      value:
                          '${(backyardLoopDistM * targetLaps / 1000).toStringAsFixed(1)} km',
                    ),
                  ],
                  if (raceType.isTimedEvent &&
                      estimatedTimedDistance != null) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.straighten,
                      label: 'Estimated distance',
                      value: estimatedTimedDistance!,
                    ),
                  ],
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.directions_run,
                    label: s.goalWizardRunsPerWeekLabel,
                    value: '$runsPerWeek',
                  ),
                  if (ridesPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.directions_bike,
                      label: s.goalWizardRidesPerWeek,
                      value: '$ridesPerWeek',
                    ),
                  ],
                  if (swimsPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.pool,
                      label: s.goalWizardSwimsPerWeek,
                      value: '$swimsPerWeek',
                    ),
                  ],
                  if (strengthPerWeek > 0) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.fitness_center,
                      label: s.goalWizardStrengthPerWeek,
                      value: '$strengthPerWeek',
                    ),
                  ],
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.straighten,
                    label: s.goalWizardWeeklyMileageLabel,
                    value: '${weeklyMileageGoal.toStringAsFixed(0)} km',
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.trending_up,
                    label: s.goalWizardMaxLongRunKm,
                    value: '${maxLongRunKm.toStringAsFixed(0)} km',
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.calendar_month,
                    label: s.goalWizardPlanDurationLabel,
                    value: s.goalWizardWeeksCount(planWeeks),
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.show_chart,
                    label: s.goalWizardTrainingPhasesTitle,
                    value: 'B$buildWeeks / P$peakWeeks / T$taperWeeks',
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.directions_run,
                    label: s.goalWizardLongRunDay,
                    value: _dayNames[longRunDay],
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.speed,
                    label: s.goalWizardQualityDay,
                    value: _dayNames[qualityDay],
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.pool,
                    label: s.goalWizardSwimDayLabel,
                    value: _dayNames[swimDay],
                  ),
                  if (restDays.isNotEmpty) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.bedtime,
                      label: s.goalWizardRestDays,
                      value: restDays.map((d) => _dayNames[d]).join(', '),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(BuildContext context, DateTime date) {
    final months = [
      S.of(context).monthJan,
      S.of(context).monthFeb,
      S.of(context).monthMar,
      S.of(context).monthApr,
      S.of(context).monthMay,
      S.of(context).monthJun,
      S.of(context).monthJul,
      S.of(context).monthAug,
      S.of(context).monthSep,
      S.of(context).monthOct,
      S.of(context).monthNov,
      S.of(context).monthDec,
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
