import 'package:runflow_flutter/domain/entities/analytics_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

abstract class AnalyticsRepository {
  Future<AnalyticsStats> getStats();

  Future<List<FitnessHistory>> getHistory({
    required DateTime startDate,
    required DateTime endDate,
  });
}
