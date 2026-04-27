import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/analytics_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/repositories/analytics_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/analytics_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';

part 'analytics_providers.g.dart';

@Riverpod(keepAlive: true)
AnalyticsRepository analyticsRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  return AnalyticsRepositoryImpl(dio: client.dio);
}

@riverpod
Future<AnalyticsStats> analyticsStats(Ref ref) async {
  final repo = ref.read(analyticsRepositoryProvider);
  return repo.getStats();
}

@riverpod
Future<List<FitnessHistory>> analyticsHistory(
  Ref ref, {
  required int days,
}) async {
  final repo = ref.read(analyticsRepositoryProvider);
  final now = DateTime.now();
  final endDate = DateTime(now.year, now.month, now.day);
  final startDate = endDate.subtract(Duration(days: days));
  return repo.getHistory(startDate: startDate, endDate: endDate);
}



@riverpod
class SelectedDateRange extends _$SelectedDateRange {
  @override
  int build() => 30;

  void setDays(int days) {
    state = days;
  }
}

@riverpod
Future<Map<String, Duration>> racePredictions(Ref ref) async {
  final stats = ref.watch(analyticsStatsProvider).value;
  final vdot = stats?.currentVdot;
  if (vdot == null) return {};

  return {
    '5K': Duration(
      seconds: (racePrediction(vdot, 5000) * 60).round(),
    ),
    '10K': Duration(
      seconds: (racePrediction(vdot, 10000) * 60).round(),
    ),
    'Half Marathon': Duration(
      seconds: (racePrediction(vdot, 21097.5) * 60).round(),
    ),
    'Marathon': Duration(
      seconds: (racePrediction(vdot, 42195) * 60).round(),
    ),
  };
}
