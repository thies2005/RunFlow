import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/domain/entities/analytics_entities.dart' as domain;

extension FitnessHistoryMetricsMapper on FitnessHistoryMetrics {
  domain.FitnessHistoryMetrics toDomain() => domain.FitnessHistoryMetrics(
        ctl: ctl,
        atl: atl,
        tsb: tsb,
        ctlRunning: ctlRunning,
      );
}

extension DomainFitnessHistoryMetricsMapper on domain.FitnessHistoryMetrics {
  FitnessHistoryMetrics toData() => FitnessHistoryMetrics(
        ctl: ctl,
        atl: atl,
        tsb: tsb,
        ctlRunning: ctlRunning,
      );
}

extension FitnessHistoryMapper on FitnessHistory {
  domain.FitnessHistory toDomain() => domain.FitnessHistory(
        date: date,
        metrics: metrics.toDomain(),
      );
}

extension DomainFitnessHistoryMapper on domain.FitnessHistory {
  FitnessHistory toData() => FitnessHistory(
        date: date,
        metrics: metrics.toData(),
      );
}
