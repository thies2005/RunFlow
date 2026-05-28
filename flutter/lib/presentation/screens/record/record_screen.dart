import 'dart:async';

import 'package:flutter/material.dart';import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/connectivity_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/pace_zone.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';
import 'package:runflow_flutter/data/datasources/local/workout_template_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';
import 'package:runflow_flutter/domain/services/workout_step_execution_engine.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/presentation/widgets/next_step_preview.dart';
import 'package:runflow_flutter/presentation/widgets/pace_zone_indicator.dart';
import 'package:runflow_flutter/presentation/widgets/runflow_map.dart';
import 'package:runflow_flutter/presentation/widgets/step_progress_card.dart';
import 'package:runflow_flutter/presentation/widgets/workout_progress_bar.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/services/workout_recording_service.dart';

class RecordScreen extends ConsumerStatefulWidget {
  const RecordScreen({this.workoutId, this.templateId, super.key});

  final String? workoutId;
  final String? templateId;

  @override
  ConsumerState<RecordScreen> createState() => _RecordScreenState();
}

class _RecordScreenState extends ConsumerState<RecordScreen> {
  RecordedWorkout? _lastWorkout;
  bool _showSummary = false;
  bool _isScanning = false;
  List<HrSensorInfo> _scannedSensors = [];
  bool _coachEnabled = false;

  Workout? _plannedWorkout;
  Timer? _coachEvalTimer;
  WorkoutStepExecutionEngine? _executionEngine;
  ActiveStep? _currentActiveStep;
  StepProgress? _currentStepProgress;
  ActiveStep? _nextStep;
  StreamSubscription<StepTransitionEvent>? _stepEventSub;
  double _overallProgress = 0;

  bool _showCountdown = false;
  int _countdownValue = 3;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(recordingServiceProvider).requestPermissions();
      if (widget.workoutId != null) {
        _loadWorkoutDetails();
      }
      if (widget.templateId != null) {
        _loadTemplate();
      }
    });
  }

  @override
  void dispose() {
    _coachEvalTimer?.cancel();
    _stepEventSub?.cancel();
    _countdownTimer?.cancel();
    _executionEngine?.dispose();
    super.dispose();
  }

  Future<void> _loadWorkoutDetails() async {
    if (widget.workoutId == null) return;
    try {
      final repo = ref.read(goalRepositoryProvider);
      final response = await repo.listWorkouts();
      final workout = response.workouts.where((w) => w.id == widget.workoutId).firstOrNull;
      if (workout != null && mounted) {
        setState(() {
          _plannedWorkout = workout;
          if (workout.structuredSteps != null) {
            final parsedWorkout = _parseStructuredWorkout(workout.structuredSteps!);
            final engine = WorkoutStepExecutionEngine(workout: parsedWorkout);
            engine.initialize();
            _executionEngine = engine;
          }
        });
      }
    } catch (e) {
      debugPrint('RecordScreen: Failed to load workout details: $e');
    }
  }

  StructuredWorkout _parseStructuredWorkout(Map<String, dynamic> json) {
    return StructuredWorkout(
      id: json['id'] as String? ?? widget.workoutId ?? 'temp_workout',
      name: json['name'] as String? ?? _plannedWorkout?.description ?? 'Workout',
      steps: (json['steps'] as List?)
              ?.map((e) => _stepNodeFromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalEstimatedDurationSeconds: json['totalEstimatedDurationSeconds'] as int?,
      totalEstimatedDistanceMeters: (json['totalEstimatedDistanceMeters'] as num?)?.toDouble(),
    );
  }

  StepNode _stepNodeFromJson(Map<String, dynamic> json) {
    if (json['type'] == 'step') {
      final s = json['step'] as Map<String, dynamic>;
      return StepNode.step(WorkoutStep(
        id: s['id'] as String? ?? 'step_${UniqueKey().toString()}',
        type: StepType.values.firstWhere(
          (e) => e.name == s['stepType'],
          orElse: () => StepType.interval,
        ),
        name: s['name'] as String? ?? 'Interval',
        durationType: s['durationType'] != null
            ? StepDurationType.values.firstWhere(
                (e) => e.name == s['durationType'],
                orElse: () => StepDurationType.time,
              )
            : null,
        durationSeconds: s['durationSeconds'] as int?,
        distanceMeters: (s['distanceMeters'] as num?)?.toDouble(),
        paceTarget: s['paceTarget'] != null
            ? PaceTarget(
                minPaceSecondsPerKm: (s['paceTarget']['minPace'] as num?)?.toDouble(),
                maxPaceSecondsPerKm: (s['paceTarget']['maxPace'] as num?)?.toDouble(),
              )
            : null,
      ));
    }
    final g = json['group'] as Map<String, dynamic>;
    return StepNode.group(StepGroup(
      id: g['id'] as String? ?? 'group_${UniqueKey().toString()}',
      name: g['name'] as String?,
      repeatCount: g['repeatCount'] as int? ?? 1,
      children: (g['children'] as List?)
              ?.map((e) => _stepNodeFromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    ));
  }

  Future<void> _loadTemplate() async {
    if (widget.templateId == null) return;
    try {
      final ds = WorkoutTemplateLocalDatasource();
      final templates = await ds.loadTemplates();
      final template = templates.where((t) => t.id == widget.templateId).firstOrNull;
      if (template != null && mounted) {
        final engine = WorkoutStepExecutionEngine(workout: template);
        engine.initialize();
        setState(() {
          _executionEngine = engine;
        });
      }
    } catch (e) {
      debugPrint('RecordScreen: Failed to load template: $e');
    }
  }

  void _startCoachEvalTimer() {
    _coachEvalTimer?.cancel();
    _coachEvalTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final service = ref.read(recordingServiceProvider);
      final metrics = service.currentMetrics;

      if (_executionEngine != null && _executionEngine!.state == StepExecutionState.active) {
        _executionEngine!.updateMetrics(
          totalElapsedSeconds: metrics.durationSeconds,
          totalDistanceMeters: metrics.distanceMeters,
        );
        setState(() {
          _currentActiveStep = _executionEngine!.currentActiveStep;
          _currentStepProgress = _executionEngine!.currentStepProgress;
          _nextStep = _executionEngine!.nextStep;
          _overallProgress = _executionEngine!.overallFraction;
        });
      }

      final coach = ref.read(voiceCoachProvider);
      if (!coach.isEnabled || _plannedWorkout == null) return;
      final targetPace = _currentActiveStep?.step.paceTarget?.minPaceSecondsPerKm ??
          (_plannedWorkout!.targetPace > 0 ? _plannedWorkout!.targetPace : 0);
      coach.evaluate(
        currentPaceSecondsPerKm: metrics.smoothedCurrentPaceSecondsPerKm > 0
            ? metrics.smoothedCurrentPaceSecondsPerKm
            : metrics.currentPaceSecondsPerKm,
        targetPaceSecondsPerKm: targetPace,
        currentHr: metrics.currentHr,
        distanceMeters: metrics.distanceMeters,
        targetDistanceMeters: _plannedWorkout!.targetDistance > 0 ? _plannedWorkout!.targetDistance : 0,
        workoutType: _plannedWorkout!.workoutType.name,
        durationSeconds: metrics.durationSeconds,
        maxHr: metrics.maxHr > 0 ? metrics.maxHr : null,
      );
    });
  }

  void _stopCoachEvalTimer() {
    _coachEvalTimer?.cancel();
    _coachEvalTimer = null;
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<RecordingStatus> statusAsync =
        ref.watch(recordingStatusProvider);

    return statusAsync.when(
      loading: () => _IdleView(onStart: _handleStart),
      error: (Object e, StackTrace st) => Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: 16),
                  Text(
                    S.of(context).recordRecordingError,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    e.toString(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: () {
                      ref.invalidate(recordingStatusProvider);
                    },
                    icon: const Icon(Icons.refresh),
                    label: Text(S.of(context).actionRetry),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () {
                      ref.read(recordingServiceProvider).discardRecording();
                      ref.invalidate(recordingStatusProvider);
                    },
                    child: Text(S.of(context).actionReset),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      data: (RecordingStatus status) {
        if (_showSummary && _lastWorkout != null) {
          return _SummaryView(
            workout: _lastWorkout!,
            onSave: _handleSave,
            onDiscard: _handleDiscard,
          );
        }

        switch (status) {
          case RecordingStatus.idle:
            if (_showCountdown) {
              return _CountdownOverlay(
                value: _countdownValue,
              );
            }
            return _IdleView(
              onStart: _handleStart,
              isScanning: _isScanning,
              scannedSensors: _scannedSensors,
              onScan: _handleScan,
              onConnectDevice: _handleConnectDevice,
            );
          case RecordingStatus.recording:
            return _RecordingView(
              onPause: _handlePause,
              onStop: _handleStop,
              coachEnabled: _coachEnabled,
              targetPaceSecondsPerKm: _currentActiveStep?.step.paceTarget?.minPaceSecondsPerKm ??
                  (_plannedWorkout?.targetPace ?? 0),
              currentActiveStep: _currentActiveStep,
              currentStepProgress: _currentStepProgress,
              nextStep: _nextStep,
              overallProgress: _overallProgress,
              onSkipStep: _executionEngine != null ? () => _executionEngine!.skipStep() : null,
              onToggleCoach: () {
                final coach = ref.read(voiceCoachProvider);
                if (coach.isEnabled) {
                  coach.disable();
                  _stopCoachEvalTimer();
                } else {
                  coach.enable();
                  _startCoachEvalTimer();
                }
                setState(() => _coachEnabled = coach.isEnabled);
              },
            );
          case RecordingStatus.paused:
            return _PausedView(
              onResume: _handleResume,
              onStop: _handleStop,
            );
        }
      },
    );
  }

  Future<void> _handleStart() async {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    final bool hasPermission = await service.requestPermissions();
    if (!hasPermission && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(S.of(context).recordLocationPermissionRequired),
        ),
      );
      return;
    }

    setState(() {
      _showCountdown = true;
      _countdownValue = 3;
    });

    final coach = ref.read(voiceCoachProvider);
    if (widget.workoutId != null || widget.templateId != null || _coachEnabled) {
      coach.enable();
      unawaited(coach.announceCountdown(3));
    }

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _countdownValue--);
      if (_countdownValue <= 0) {
        timer.cancel();
        unawaited(_startRecordingAfterCountdown());
      } else if (coach.isEnabled) {
        coach.announceCountdown(_countdownValue);
      }
    });
  }

  Future<void> _startRecordingAfterCountdown() async {
    setState(() => _showCountdown = false);

    final service = ref.read(recordingServiceProvider);
    final coach = ref.read(voiceCoachProvider);

    await service.startRecording();

    if (_executionEngine != null) {
      _executionEngine!.start();
      _currentActiveStep = _executionEngine!.currentActiveStep;
      _currentStepProgress = _executionEngine!.currentStepProgress;
      _nextStep = _executionEngine!.nextStep;
      _stepEventSub = _executionEngine!.eventStream.listen((event) {
        if (coach.isEnabled) {
          if (event.type == 'stepStarted') {
            coach.announceStep(
              event.step.name,
              event.overallIndex + 1,
              event.totalSteps,
            );
          } else if (event.type == 'workoutCompleted') {
            coach.announceWorkoutComplete();
          }
        }
        setState(() {
          _currentActiveStep = _executionEngine!.currentActiveStep;
          _currentStepProgress = _executionEngine!.currentStepProgress;
          _nextStep = _executionEngine!.nextStep;
          _overallProgress = _executionEngine!.overallFraction;
        });
      });
    }

    if (coach.isEnabled) {
      _startCoachEvalTimer();
    }
  }

  void _handlePause() {
    _stopCoachEvalTimer();
    _executionEngine?.pause();
    ref.read(recordingServiceProvider).pauseRecording();
  }

  void _handleResume() {
    ref.read(recordingServiceProvider).resumeRecording();
    final metrics = ref.read(recordingServiceProvider).currentMetrics;
    _executionEngine?.resume(metrics.durationSeconds, metrics.distanceMeters);
    _startCoachEvalTimer();
  }

  void _handleStop() {
    _stopCoachEvalTimer();
    _stepEventSub?.cancel();
    _stepEventSub = null;
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    final coach = ref.read(voiceCoachProvider);
    coach.disable();
    coach.stop();
    coach.reset();
    _executionEngine?.dispose();
    _executionEngine = null;
    setState(() {
      _coachEnabled = false;
      _currentActiveStep = null;
      _currentStepProgress = null;
      _nextStep = null;
      _overallProgress = 0;
    });
    final RecordedWorkout? workout = service.stopRecording();
    if (workout != null) {
      setState(() {
        _lastWorkout = workout;
        _showSummary = true;
      });
    }
  }

  Future<void> _handleSave() async {
    final workout = _lastWorkout;
    if (workout == null) return;

    final isOnline = ref.read(isOnlineProvider);

    try {
      final repo = ref.read(activityRepositoryProvider);
      await repo.createActivity(workout);

      if (mounted) {
        setState(() {
          _showSummary = false;
          _lastWorkout = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isOnline
                  ? S.of(context).recordWorkoutSaved
                  : 'Activity saved offline. Will sync when you\'re back online.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).recordFailedToSaveError(e.toString()))),
        );
      }
    }
  }

  void _handleDiscard() {
    setState(() {
      _showSummary = false;
      _lastWorkout = null;
    });
  }

  Future<void> _handleScan() async {
    setState(() {
      _isScanning = true;
      _scannedSensors = [];
    });

    final BleConnectionNotifier bleNotifier =
        ref.read(bleConnectionProvider.notifier);
    final List<HrSensorInfo> sensors = await bleNotifier.scanForDevices();

    if (mounted) {
      final bleState = ref.read(bleConnectionProvider);
      if (bleState is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bluetooth scan failed: ${bleState.error}'),
            backgroundColor: AppColors.error,
          ),
        );
      } else if (sensors.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'No Bluetooth heart rate monitors found. Make sure your sensor is on and in pairing mode.'),
          ),
        );
      }
      setState(() {
        _scannedSensors = sensors;
        _isScanning = false;
      });
    }
  }

  Future<void> _handleConnectDevice(
      String deviceId, String deviceName) async {
    final BleConnectionNotifier bleNotifier =
        ref.read(bleConnectionProvider.notifier);
    final bool success =
        await bleNotifier.connectToDevice(deviceId, deviceName);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).recordConnectedTo(deviceName))),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).recordFailedToConnect)),
        );
      }
    }
  }
}

class _IdleView extends StatelessWidget {
  const _IdleView({
    required this.onStart,
    this.isScanning = false,
    this.scannedSensors = const [],
    this.onScan,
    this.onConnectDevice,
  });

  final VoidCallback? onStart;
  final bool isScanning;
  final List<HrSensorInfo> scannedSensors;
  final VoidCallback? onScan;
  final void Function(String deviceId, String deviceName)? onConnectDevice;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 48),
            Text(
              S.of(context).recordReadyToRecord,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              S.of(context).recordTapToStart,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            _BleConnectionCard(
              isScanning: isScanning,
              scannedSensors: scannedSensors,
              onScan: onScan,
              onConnectDevice: onConnectDevice,
            ),
            const SizedBox(height: 32),
            Semantics(
              button: true,
              label: S.of(context).recordStartRecording,
              child: GestureDetector(
                onTap: onStart,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 24,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.fiber_manual_record,
                    size: 64,
                    color: AppColors.onPrimary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              S.of(context).recordStart,
              style: theme.textTheme.titleMedium?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                letterSpacing: 2,
              ),
            ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}

class _BleConnectionCard extends ConsumerWidget {
  const _BleConnectionCard({
    required this.isScanning,
    required this.scannedSensors,
    this.onScan,
    this.onConnectDevice,
  });

  final bool isScanning;
  final List<HrSensorInfo> scannedSensors;
  final VoidCallback? onScan;
  final void Function(String deviceId, String deviceName)? onConnectDevice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<HrSensorInfo?> bleState =
        ref.watch(bleConnectionProvider);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  Icons.bluetooth,
                  size: 20,
                  color: bleState.value != null
                      ? AppColors.success
                      : AppColors.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    bleState.value != null
                        ? S.of(context).recordConnectedTo(bleState.value!.name)
                        : S.of(context).recordNoHrSensor,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: bleState.value != null
                              ? AppColors.success
                              : AppColors.onSurfaceVariant,
                        ),
                  ),
                ),
                if (bleState.value != null)
                  TextButton(
                    onPressed: () {
                      ref.read(bleConnectionProvider.notifier).disconnect();
                    },
                    child: Text(S.of(context).recordDisconnect),
                  )
                else
                  FilledButton.tonal(
                    onPressed: isScanning ? null : onScan,
                    child: isScanning
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(S.of(context).recordScan),
                  ),
              ],
            ),
            if (scannedSensors.isNotEmpty && bleState.value == null) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              ...scannedSensors.map(
                (HrSensorInfo sensor) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.watch, size: 20),
                  title: Text(
                    sensor.name,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  trailing: const Icon(Icons.add, size: 20),
                  onTap: () =>
                      onConnectDevice?.call(sensor.id, sensor.name),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RecordingView extends ConsumerWidget {
  const _RecordingView({
    required this.onPause,
    required this.onStop,
    this.coachEnabled = false,
    this.targetPaceSecondsPerKm = 0,
    this.currentActiveStep,
    this.currentStepProgress,
    this.nextStep,
    this.overallProgress = 0,
    this.onSkipStep,
    this.onToggleCoach,
  });

  final VoidCallback onPause;
  final VoidCallback onStop;
  final bool coachEnabled;
  final double targetPaceSecondsPerKm;
  final ActiveStep? currentActiveStep;
  final StepProgress? currentStepProgress;
  final ActiveStep? nextStep;
  final double overallProgress;
  final VoidCallback? onSkipStep;
  final VoidCallback? onToggleCoach;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<RecordingMetrics> metricsAsync =
        ref.watch(recordingMetricsProvider);
    final List<GpsPoint> gpsPoints =
        ref.read(recordingServiceProvider).gpsPoints;

    return metricsAsync.when(
      loading: () => _RecordingContent(
        metrics: const RecordingMetrics(),
        gpsPoints: gpsPoints,
        onPause: onPause,
        onStop: onStop,
        coachEnabled: coachEnabled,
        targetPaceSecondsPerKm: targetPaceSecondsPerKm,
        currentActiveStep: currentActiveStep,
        currentStepProgress: currentStepProgress,
        nextStep: nextStep,
        overallProgress: overallProgress,
        onSkipStep: onSkipStep,
        onToggleCoach: onToggleCoach,
      ),
      error: (Object e, StackTrace st) => _RecordingContent(
        metrics: const RecordingMetrics(),
        gpsPoints: gpsPoints,
        onPause: onPause,
        onStop: onStop,
        coachEnabled: coachEnabled,
        targetPaceSecondsPerKm: targetPaceSecondsPerKm,
        currentActiveStep: currentActiveStep,
        currentStepProgress: currentStepProgress,
        nextStep: nextStep,
        overallProgress: overallProgress,
        onSkipStep: onSkipStep,
        onToggleCoach: onToggleCoach,
      ),
      data: (RecordingMetrics metrics) => _RecordingContent(
        metrics: metrics,
        gpsPoints: gpsPoints,
        onPause: onPause,
        onStop: onStop,
        coachEnabled: coachEnabled,
        targetPaceSecondsPerKm: targetPaceSecondsPerKm,
        currentActiveStep: currentActiveStep,
        currentStepProgress: currentStepProgress,
        nextStep: nextStep,
        overallProgress: overallProgress,
        onSkipStep: onSkipStep,
        onToggleCoach: onToggleCoach,
      ),
    );
  }
}

class _RecordingContent extends StatefulWidget {
  const _RecordingContent({
    required this.metrics,
    required this.gpsPoints,
    required this.onPause,
    required this.onStop,
    this.coachEnabled = false,
    this.targetPaceSecondsPerKm = 0,
    this.currentActiveStep,
    this.currentStepProgress,
    this.nextStep,
    this.overallProgress = 0,
    this.onSkipStep,
    this.onToggleCoach,
  });

  final RecordingMetrics metrics;
  final List<GpsPoint> gpsPoints;
  final VoidCallback onPause;
  final VoidCallback onStop;
  final bool coachEnabled;
  final double targetPaceSecondsPerKm;
  final ActiveStep? currentActiveStep;
  final StepProgress? currentStepProgress;
  final ActiveStep? nextStep;
  final double overallProgress;
  final VoidCallback? onSkipStep;
  final VoidCallback? onToggleCoach;

  @override
  State<_RecordingContent> createState() => _RecordingContentState();
}

class _RecordingContentState extends State<_RecordingContent> {
  bool _isMapExpanded = false;

  @override
  Widget build(BuildContext context) {
    final metrics = widget.metrics;
    final gpsPoints = widget.gpsPoints;
    final onPause = widget.onPause;
    final onStop = widget.onStop;
    final coachEnabled = widget.coachEnabled;
    final onToggleCoach = widget.onToggleCoach;
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    if (gpsPoints.isNotEmpty)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        height: _isMapExpanded
                            ? MediaQuery.of(context).size.height * 0.55
                            : 200,
                        child: Stack(
                          children: [
                            RunFlowMap(
                              gpsPoints: gpsPoints,
                              followUser: !_isMapExpanded,
                              height: double.infinity,
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Material(
                                color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.85),
                                borderRadius: BorderRadius.circular(20),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () => setState(() => _isMapExpanded = !_isMapExpanded),
                                  child: Padding(
                                    padding: const EdgeInsets.all(6),
                                    child: Icon(
                                      _isMapExpanded ? Icons.fullscreen_exit : Icons.fullscreen,
                                      size: 18,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        height: 200,
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.gps_fixed,
                                size: 48, color: AppColors.onSurfaceVariant),
                            const SizedBox(height: 8),
                            Text(
                              S.of(context).recordWaitingForGps,
                              style:
                                  const TextStyle(color: AppColors.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _GpsIndicator(accuracy: metrics.gpsAccuracy),
                  const Spacer(),
                  if (onToggleCoach != null)
                    Semantics(
                      button: true,
                      label: coachEnabled ? S.of(context).recordDisableVoiceCoach : S.of(context).recordEnableVoiceCoach,
                      child: GestureDetector(
                        onTap: onToggleCoach,
                        child: Icon(
                          coachEnabled ? Icons.record_voice_over : Icons.voice_over_off,
                          size: 20,
                          color: coachEnabled ? AppColors.primary : AppColors.onSurfaceVariant,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    Text(
                      formatDistance(metrics.distanceMeters),
                      style: theme.textTheme.displayLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: 56,
                      ),
                    ),
                    Text(
                      S.of(context).distance,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 32),
                    if (widget.currentActiveStep != null && widget.currentStepProgress != null) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: WorkoutProgressBar(fraction: widget.overallProgress),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: StepProgressCard(
                          activeStep: widget.currentActiveStep!,
                          progress: widget.currentStepProgress!,
                        ),
                      ),
                      if (widget.onSkipStep != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: widget.onSkipStep,
                              child: Text(
                                'Skip',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: NextStepPreview(nextStep: widget.nextStep),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).pace,
                              value: formatPace(
                                  metrics.currentPaceSecondsPerKm),
                              icon: Icons.speed,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).duration,
                              value:
                                  formatDurationClock(metrics.durationSeconds),
                              icon: Icons.timer,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (widget.targetPaceSecondsPerKm > 0) ...[
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: PaceZoneIndicator(
                          zoneResult: PaceZoneResult.evaluate(
                            currentPaceSecondsPerKm: metrics.smoothedCurrentPaceSecondsPerKm > 0
                                ? metrics.smoothedCurrentPaceSecondsPerKm
                                : metrics.currentPaceSecondsPerKm,
                            targetPaceSecondsPerKm: widget.targetPaceSecondsPerKm,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).heartRate,
                              value: metrics.currentHr > 0
                                  ? '${metrics.currentHr}'
                                  : '--',
                              icon: Icons.favorite,
                              color: AppColors.error,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).cadence,
                              value: metrics.cadence > 0
                                  ? '${metrics.cadence.round()} spm'
                                  : '--',
                              icon: Icons.directions_walk,
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).avgPace,
                              value: metrics.averageSpeedMps > 0.5
                                  ? formatPace(
                                      1000 / metrics.averageSpeedMps)
                                  : '--:-- /km',
                              icon: Icons.trending_up,
                              color: AppColors.onSurface,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _MetricCard(
                              label: S.of(context).elevation,
                              value: metrics.totalElevation > 0
                                  ? '${metrics.totalElevation.round()} m'
                                  : '--',
                              icon: Icons.terrain,
                              color: AppColors.warning,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Semantics(
                    button: true,
                    label: S.of(context).recordStopRecording,
                    child: GestureDetector(
                      onTap: onStop,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.error,
                        ),
                        child: const Icon(
                          Icons.stop,
                          size: 32,
                          color: AppColors.onPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 32),
                  Semantics(
                    button: true,
                    label: S.of(context).recordPauseRecording,
                    child: GestureDetector(
                      onTap: onPause,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.onSurface,
                        ),
                        child: const Icon(
                          Icons.pause,
                          size: 40,
                          color: AppColors.oledBlack,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GpsIndicator extends StatelessWidget {
  const _GpsIndicator({required this.accuracy});

  final double accuracy;

  @override
  Widget build(BuildContext context) {
    final bool isGood = accuracy > 0 && accuracy <= 10;
    final bool isOk = accuracy > 10 && accuracy <= 25;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.gps_fixed,
          size: 16,
          color: isGood
              ? AppColors.success
              : isOk
                  ? AppColors.warning
                  : AppColors.error,
        ),
        const SizedBox(width: 4),
        Text(
          accuracy > 0 ? S.of(context).recordGpsAccuracy(accuracy.round()) : S.of(context).recordGpsSearching,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
        ),
      ],
    );
  }
}

class _PausedView extends StatelessWidget {
  const _PausedView({
    required this.onResume,
    required this.onStop,
  });

  final VoidCallback onResume;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.warning.withValues(alpha: 0.15),
                ),
                child: const Icon(
                  Icons.pause,
                  size: 56,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                S.of(context).statusPaused,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.warning,
                ),
              ),
              const SizedBox(height: 48),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Semantics(
                    button: true,
                    label: S.of(context).recordStopRecording,
                    child: GestureDetector(
                      onTap: onStop,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.error,
                        ),
                        child: const Icon(
                          Icons.stop,
                          size: 32,
                          color: AppColors.onPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                  Semantics(
                    button: true,
                    label: S.of(context).recordResumeRecording,
                    child: GestureDetector(
                      onTap: onResume,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                        child: const Icon(
                          Icons.play_arrow,
                          size: 44,
                          color: AppColors.onPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryView extends StatelessWidget {
  const _SummaryView({
    required this.workout,
    required this.onSave,
    required this.onDiscard,
  });

  final RecordedWorkout workout;
  final VoidCallback onSave;
  final VoidCallback onDiscard;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final double? avgPace = workout.averageSpeed != null &&
            workout.averageSpeed! > 0
        ? 1000 / workout.averageSpeed!
        : null;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Center(
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      size: 64,
                      color: AppColors.success,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      S.of(context).recordWorkoutComplete,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (workout.gpsPoints.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: RunFlowMap(
                    gpsPoints: workout.gpsPoints,
                    autoFitBounds: true,
                    height: 180,
                    showMarkers: true,
                  ),
                ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  formatDistance(workout.distanceMeters),
                  style: theme.textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 48,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _SummaryRow(
                        label: S.of(context).duration,
                        value: formatDuration(workout.durationSeconds),
                        icon: Icons.timer,
                      ),
                      const SizedBox(height: 16),
                      _SummaryRow(
                        label: S.of(context).avgPace,
                        value: avgPace != null
                            ? formatPace(avgPace)
                            : '--:-- /km',
                        icon: Icons.speed,
                      ),
                      const SizedBox(height: 16),
                      _SummaryRow(
                        label: S.of(context).avgSpeed,
                        value: workout.averageSpeed != null
                            ? '${(workout.averageSpeed! * 3.6).toStringAsFixed(1)} km/h'
                            : '--',
                        icon: Icons.trending_up,
                      ),
                      if (workout.maxSpeed != null) ...[
                        const SizedBox(height: 16),
                        _SummaryRow(
                          label: S.of(context).maxSpeed,
                          value:
                              '${(workout.maxSpeed! * 3.6).toStringAsFixed(1)} km/h',
                          icon: Icons.trending_up,
                        ),
                      ],
                      if (workout.hasHeartrate &&
                          workout.averageHr != null) ...[
                        const SizedBox(height: 16),
                        _SummaryRow(
                          label: S.of(context).avgHr,
                          value: '${workout.averageHr!.round()} bpm',
                          icon: Icons.favorite,
                        ),
                      ],
                      if (workout.maxHr != null) ...[
                        const SizedBox(height: 16),
                        _SummaryRow(
                          label: S.of(context).maxHr,
                          value: '${workout.maxHr} bpm',
                          icon: Icons.favorite_border,
                        ),
                      ],
                      if (workout.averageCadence != null) ...[
                        const SizedBox(height: 16),
                        _SummaryRow(
                          label: S.of(context).avgCadence,
                          value: '${workout.averageCadence!.round()} spm',
                          icon: Icons.directions_walk,
                        ),
                      ],
                      if (workout.totalElevation != null) ...[
                        const SizedBox(height: 16),
                        _SummaryRow(
                          label: S.of(context).elevation,
                          value: '${workout.totalElevation!.round()} m',
                          icon: Icons.terrain,
                        ),
                      ],
                      const SizedBox(height: 16),
                      _SummaryRow(
                        label: S.of(context).gpsPoints,
                        value: '${workout.gpsPoints.length}',
                        icon: Icons.gps_fixed,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onDiscard,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(S.of(context).actionDiscard),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: FilledButton(
                      onPressed: onSave,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(S.of(context).actionSave),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

class _CountdownOverlay extends StatelessWidget {
  const _CountdownOverlay({required this.value});
  final int value;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.8, end: 1.2),
                duration: const Duration(milliseconds: 500),
                curve: Curves.easeOutBack,
                builder: (context, scale, child) {
                  return Transform.scale(scale: scale, child: child);
                },
                child: Text(
                  value > 0 ? '$value' : 'GO!',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontSize: 120,
                    fontWeight: FontWeight.w900,
                    color: value > 0 ? AppColors.onSurface : AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
