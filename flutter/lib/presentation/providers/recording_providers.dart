import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/data/services/voice_coach_service.dart';
import 'package:runflow_flutter/data/services/workout_recording_service.dart';

final Provider<WorkoutRecordingService> recordingServiceProvider =
    Provider<WorkoutRecordingService>((Ref ref) {
  final WorkoutRecordingService service = WorkoutRecordingService();
  ref.onDispose(() {
    service.dispose();
  });
  return service;
});

final StreamProvider<RecordingStatus> recordingStatusProvider =
    StreamProvider<RecordingStatus>((Ref ref) {
  final WorkoutRecordingService service =
      ref.watch(recordingServiceProvider);
  return service.statusStream;
});

final StreamProvider<RecordingMetrics> recordingMetricsProvider =
    StreamProvider<RecordingMetrics>((Ref ref) {
  final WorkoutRecordingService service =
      ref.watch(recordingServiceProvider);
  return service.metricsStream;
});

final Provider<VoiceCoachService> voiceCoachProvider =
    Provider<VoiceCoachService>((Ref ref) {
  final VoiceCoachService service = VoiceCoachService();
  service.init();
  ref.onDispose(() {
    service.dispose();
  });
  return service;
});

final NotifierProvider<BleConnectionNotifier, AsyncValue<HrSensorInfo?>>
    bleConnectionProvider =
    NotifierProvider<BleConnectionNotifier, AsyncValue<HrSensorInfo?>>(
  BleConnectionNotifier.new,
);

class BleConnectionNotifier extends Notifier<AsyncValue<HrSensorInfo?>> {
  @override
  AsyncValue<HrSensorInfo?> build() => const AsyncValue.data(null);

  Future<List<HrSensorInfo>> scanForDevices() async {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    try {
      state = const AsyncValue.loading();
      final List<HrSensorInfo> sensors =
          await service.scanForHeartRateMonitors();
      state = AsyncValue.data(service.connectedSensor);
      return sensors;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return [];
    }
  }

  Future<bool> connectToDevice(String deviceId, String deviceName) async {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    try {
      state = const AsyncValue.loading();
      final bool success =
          await service.connectToHeartRateMonitor(deviceId, deviceName);
      state = AsyncValue.data(service.connectedSensor);
      return success;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<void> disconnect() async {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    await service.disconnectHeartRateMonitor();
    state = const AsyncValue.data(null);
  }

  void refreshState() {
    final WorkoutRecordingService service =
        ref.read(recordingServiceProvider);
    state = AsyncValue.data(service.connectedSensor);
  }
}
