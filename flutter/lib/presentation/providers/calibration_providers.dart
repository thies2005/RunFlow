import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/calibration_models.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

part 'calibration_providers.g.dart';

@riverpod
class Calibration extends _$Calibration {
  @override
  CalibrationState build() => const CalibrationState();

  void setMode(CalibrationMode mode) {
    state = state.copyWith(mode: mode);
  }

  void setRaceType(CalibrationRaceType raceType) {
    state = state.copyWith(raceType: raceType, isCustomDistance: false);
  }

  void setCustomDistance(bool isCustom) {
    state = state.copyWith(
      isCustomDistance: isCustom,
      customDistanceMeters: isCustom ? state.customDistanceMeters : '',
    );
  }

  void setCustomDistanceMeters(String value) {
    state = state.copyWith(customDistanceMeters: value);
  }

  void setHours(String value) {
    state = state.copyWith(hours: value);
  }

  void setMinutes(String value) {
    state = state.copyWith(minutes: value);
  }

  void setSeconds(String value) {
    state = state.copyWith(seconds: value);
  }

  void setManualFactor(String value) {
    state = state.copyWith(manualFactor: value);
  }

  void setSelectedActivityId(String value) {
    state = state.copyWith(selectedActivityId: value);
  }

  void autoFillFromActivity({
    required int movingTime,
    required double distanceMeters,
  }) {
    final h = movingTime ~/ 3600;
    final m = (movingTime % 3600) ~/ 60;
    final s = movingTime % 60;

    state = state.copyWith(
      hours: h.toString(),
      minutes: m.toString(),
      seconds: s.toString(),
    );

    if ((distanceMeters - 5000).abs() < 200) {
      state = state.copyWith(
        raceType: CalibrationRaceType.fiveK,
        isCustomDistance: false,
      );
    } else if ((distanceMeters - 10000).abs() < 400) {
      state = state.copyWith(
        raceType: CalibrationRaceType.tenK,
        isCustomDistance: false,
      );
    } else if ((distanceMeters - 21097.5).abs() < 500) {
      state = state.copyWith(
        raceType: CalibrationRaceType.halfMarathon,
        isCustomDistance: false,
      );
    } else if ((distanceMeters - 42195).abs() < 1000) {
      state = state.copyWith(
        raceType: CalibrationRaceType.fiveK,
        isCustomDistance: false,
      );
    } else {
      state = state.copyWith(
        isCustomDistance: true,
        customDistanceMeters: distanceMeters.round().toString(),
      );
    }
  }

  int get totalSeconds {
    final h = int.tryParse(state.hours) ?? 0;
    final m = int.tryParse(state.minutes) ?? 0;
    final s = int.tryParse(state.seconds) ?? 0;
    return h * 3600 + m * 60 + s;
  }

  Future<void> submitVdotCorrection({
    required double effectiveVO2max,
    required double rawVO2max,
    required double currentCorrectionFactor,
  }) async {
    state = state.copyWith(isSubmitting: true, error: '');
    try {
      final dio = ref.read(dioClientProvider).dio;

      final body = <String, dynamic>{};
      if (state.isCustomDistance) {
        final meters = double.tryParse(state.customDistanceMeters) ?? 0;
        body['distanceMeters'] = meters;
        body['raceTimeSeconds'] = totalSeconds;
      } else {
        body['raceType'] = state.raceType.name.toUpperCase();
        body['raceTimeSeconds'] = totalSeconds;
      }

      await dio.post('/settings/vdot-correction', data: body);
      state = state.copyWith(isSubmitting: false);
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to update VDOT correction',
      );
      rethrow;
    }
  }

  Future<void> submitShapeFactor(double factor) async {
    state = state.copyWith(isSubmitting: true, error: '');
    try {
      final dio = ref.read(dioClientProvider).dio;

      await dio.post(
        '/goals/calibration',
        data: {'shapeFactor': factor},
      );
      state = state.copyWith(isSubmitting: false);
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to update shape calibration',
      );
      rethrow;
    }
  }

  Future<void> submitManualFactor(double factor) async {
    state = state.copyWith(isSubmitting: true, error: '');
    try {
      final dio = ref.read(dioClientProvider).dio;

      await dio.post(
        '/goals/calibration',
        data: {'shapeFactor': factor},
      );
      state = state.copyWith(isSubmitting: false);
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Failed to update calibration',
      );
      rethrow;
    }
  }
}
