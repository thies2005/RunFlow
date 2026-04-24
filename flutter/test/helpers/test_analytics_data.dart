import 'package:runflow_flutter/data/models/analytics_models.dart';

class TestAnalyticsData {
  TestAnalyticsData._();

  static List<FitnessHistory> createHistory({int days = 30}) {
    return List.generate(days, (index) {
      final day = days - 1 - index;
      return FitnessHistory(
        date: DateTime(2024, 6, 15).subtract(Duration(days: day)),
        metrics: FitnessHistoryMetrics(
          ctl: 40.0 + index * 0.5,
          atl: 30.0 + index * 0.3,
          tsb: 10.0 + index * 0.2,
          ctlRunning: 38.0 + index * 0.4,
        ),
      );
    });
  }
}
