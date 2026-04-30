import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/presentation/widgets/runflow_map.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/services/workout_recording_service.dart';

class RecordScreen extends ConsumerStatefulWidget {
  const RecordScreen({this.workoutId, super.key});

  final String? workoutId;

  @override
  ConsumerState<RecordScreen> createState() => _RecordScreenState();
}

class _RecordScreenState extends ConsumerState<RecordScreen> {
  RecordedWorkout? _lastWorkout;
  bool _showSummary = false;
  bool _isScanning = false;
  List<HrSensorInfo> _scannedSensors = [];
  bool _coachEnabled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(recordingServiceProvider).requestPermissions();
      if (widget.workoutId != null) {
        _loadWorkoutDetails();
      }
    });
  }

  void _loadWorkoutDetails() {
    // Will be used later to show workout context during recording
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
              onToggleCoach: () {
                final coach = ref.read(voiceCoachProvider);
                if (coach.isEnabled) {
                  coach.disable();
                } else {
                  coach.enable();
                }
                setState(() => _coachEnabled = !coach.isEnabled);
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
    if (widget.workoutId != null) {
      final coach = ref.read(voiceCoachProvider);
      coach.enable();
      setState(() => _coachEnabled = true);
    }
    await service.startRecording();
  }

  void _handlePause() {
    ref.read(recordingServiceProvider).pauseRecording();
  }

  void _handleResume() {
    ref.read(recordingServiceProvider).resumeRecording();
  }

  void _handleStop() {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    final coach = ref.read(voiceCoachProvider);
    coach.disable();
    coach.stop();
    setState(() => _coachEnabled = false);
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

    try {
      final repo = ref.read(activityRepositoryProvider);
      await repo.createActivity(workout);

      if (mounted) {
        setState(() {
          _showSummary = false;
          _lastWorkout = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).recordWorkoutSaved)),
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
    this.onToggleCoach,
  });

  final VoidCallback onPause;
  final VoidCallback onStop;
  final bool coachEnabled;
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
        onToggleCoach: onToggleCoach,
      ),
      error: (Object e, StackTrace st) => _RecordingContent(
        metrics: const RecordingMetrics(),
        gpsPoints: gpsPoints,
        onPause: onPause,
        onStop: onStop,
        coachEnabled: coachEnabled,
        onToggleCoach: onToggleCoach,
      ),
      data: (RecordingMetrics metrics) => _RecordingContent(
        metrics: metrics,
        gpsPoints: gpsPoints,
        onPause: onPause,
        onStop: onStop,
        coachEnabled: coachEnabled,
        onToggleCoach: onToggleCoach,
      ),
    );
  }
}

class _RecordingContent extends StatelessWidget {
  const _RecordingContent({
    required this.metrics,
    required this.gpsPoints,
    required this.onPause,
    required this.onStop,
    this.coachEnabled = false,
    this.onToggleCoach,
  });

  final RecordingMetrics metrics;
  final List<GpsPoint> gpsPoints;
  final VoidCallback onPause;
  final VoidCallback onStop;
  final bool coachEnabled;
  final VoidCallback? onToggleCoach;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: gpsPoints.isNotEmpty
                  ? RunFlowMap(
                      gpsPoints: gpsPoints,
                      followUser: true,
                      height: 200,
                    )
                  : Container(
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
              const SizedBox(height: 32),
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
