import 'package:freezed_annotation/freezed_annotation.dart';

part 'analytics_models.freezed.dart';
part 'analytics_models.g.dart';

@Freezed(copyWith: true)
sealed class FitnessHistoryMetrics with _$FitnessHistoryMetrics {
  const factory FitnessHistoryMetrics({
    required double ctl,
    required double atl,
    required double tsb,
    required double ctlRunning,
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
