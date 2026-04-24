import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

abstract class AnalyticsRepository {
  Future<AnalyticsStats> getStats();

  Future<List<FitnessHistory>> getHistory({
    required DateTime startDate,
    required DateTime endDate,
  });
}
