import 'package:freezed_annotation/freezed_annotation.dart';

part 'calibration_models.freezed.dart';
part 'calibration_models.g.dart';

enum CalibrationMode { vdotCorrection, shapeFactor, manual }

enum CalibrationRaceType { fiveK, tenK, halfMarathon, marathon }

@Freezed(copyWith: true)
sealed class CalibrationState with _$CalibrationState {
  const factory CalibrationState({
    @Default(CalibrationMode.vdotCorrection) CalibrationMode mode,
    @Default(CalibrationRaceType.fiveK) CalibrationRaceType raceType,
    @Default(false) bool isCustomDistance,
    @Default('') String customDistanceMeters,
    @Default('') String hours,
    @Default('') String minutes,
    @Default('') String seconds,
    @Default('') String manualFactor,
    @Default('') String selectedActivityId,
    @Default(false) bool isSubmitting,
    @Default('') String error,
  }) = _CalibrationState;
  const CalibrationState._();
}

@Freezed(copyWith: true)
sealed class CalibrationResult with _$CalibrationResult {
  const factory CalibrationResult({
    required double impliedVdot,
    required double baseVdot,
    required double newFactor,
    required bool isValid,
  }) = _CalibrationResult;
  const CalibrationResult._();

  factory CalibrationResult.fromJson(Map<String, dynamic> json) =>
      _$CalibrationResultFromJson(json);
}

@Freezed(copyWith: true)
sealed class ShapeCalibrationResult with _$ShapeCalibrationResult {
  const factory ShapeCalibrationResult({
    required double factor,
    required int actualSeconds,
    required int optimalSeconds,
    required int basePredictedSeconds,
    required bool isValid,
  }) = _ShapeCalibrationResult;
  const ShapeCalibrationResult._();

  factory ShapeCalibrationResult.fromJson(Map<String, dynamic> json) =>
      _$ShapeCalibrationResultFromJson(json);
}
