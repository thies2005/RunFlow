import 'package:freezed_annotation/freezed_annotation.dart';

part 'analytics_models.freezed.dart';
part 'analytics_models.g.dart';

double _parseDouble(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value) ?? 0.0;
  }
  if (value is Map) {
    // Handle case where server returns a map with a value property
    final val = value['value'] ?? value['\$numberDouble'] ?? value.values.first;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0.0;
  }
  return 0.0;
}

@Freezed(copyWith: true)
sealed class FitnessHistoryMetrics with _$FitnessHistoryMetrics {
  const factory FitnessHistoryMetrics({
    @JsonKey(fromJson: _parseDouble) required double ctl,
    @JsonKey(fromJson: _parseDouble) required double atl,
    @JsonKey(fromJson: _parseDouble) required double tsb,
    @JsonKey(fromJson: _parseDouble) required double ctlRunning,
  }) = _FitnessHistoryMetrics;
  const FitnessHistoryMetrics._();

  factory FitnessHistoryMetrics.fromJson(Map<String, dynamic> json) =>
      _$FitnessHistoryMetricsFromJson(json);
}

@Freezed(copyWith: true)
sealed class FitnessHistory with _$FitnessHistory {
  const factory FitnessHistory({
    required DateTime date,
    required FitnessHistoryMetrics metrics,
  }) = _FitnessHistory;
  const FitnessHistory._();

  factory FitnessHistory.fromJson(Map<String, dynamic> json) =>
      _$FitnessHistoryFromJson(json);
}
