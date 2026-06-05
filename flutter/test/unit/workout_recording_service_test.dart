import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/services/workout_recording_service.dart';

void main() {
  group('WorkoutRecordingService', () {
    late WorkoutRecordingService service;

    setUp(() {
      service = WorkoutRecordingService();
    });

    tearDown(() async {
      await service.dispose();
    });

    test('initial state is idle', () {
      expect(service.status, RecordingStatus.idle);
      expect(service.currentMetrics.distanceMeters, 0.0);
    });

    test('startRecording changes state to recording', () async {
      await service.startRecording();
      expect(service.status, RecordingStatus.recording);
    });

    test('pauseRecording changes state to paused', () async {
      await service.startRecording();
      service.pauseRecording();
      expect(service.status, RecordingStatus.paused);
    });

    test('resumeRecording changes state to recording', () async {
      await service.startRecording();
      service.pauseRecording();
      service.resumeRecording();
      expect(service.status, RecordingStatus.recording);
    });

    test('stopRecording returns RecordedWorkout and resets state', () async {
      await service.startRecording();
      final workout = service.stopRecording();
      expect(workout, isNotNull);
      expect(workout!.name, 'Run');
      expect(service.status, RecordingStatus.idle);
    });

    test('discardRecording resets state', () async {
      await service.startRecording();
      service.discardRecording();
      expect(service.status, RecordingStatus.idle);
    });
  });
}
