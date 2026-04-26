// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'calibration_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CalibrationResult _$CalibrationResultFromJson(Map<String, dynamic> json) =>
    _CalibrationResult(
      impliedVdot: (json['impliedVdot'] as num).toDouble(),
      baseVdot: (json['baseVdot'] as num).toDouble(),
      newFactor: (json['newFactor'] as num).toDouble(),
      isValid: json['isValid'] as bool,
    );

Map<String, dynamic> _$CalibrationResultToJson(_CalibrationResult instance) =>
    <String, dynamic>{
      'impliedVdot': instance.impliedVdot,
      'baseVdot': instance.baseVdot,
      'newFactor': instance.newFactor,
      'isValid': instance.isValid,
    };

_ShapeCalibrationResult _$ShapeCalibrationResultFromJson(
  Map<String, dynamic> json,
) => _ShapeCalibrationResult(
  factor: (json['factor'] as num).toDouble(),
  actualSeconds: (json['actualSeconds'] as num).toInt(),
  optimalSeconds: (json['optimalSeconds'] as num).toInt(),
  basePredictedSeconds: (json['basePredictedSeconds'] as num).toInt(),
  isValid: json['isValid'] as bool,
);

Map<String, dynamic> _$ShapeCalibrationResultToJson(
  _ShapeCalibrationResult instance,
) => <String, dynamic>{
  'factor': instance.factor,
  'actualSeconds': instance.actualSeconds,
  'optimalSeconds': instance.optimalSeconds,
  'basePredictedSeconds': instance.basePredictedSeconds,
  'isValid': instance.isValid,
};
