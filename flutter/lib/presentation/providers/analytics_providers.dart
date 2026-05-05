import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/analytics_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/data/repositories/analytics_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/analytics_repository.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';

part 'analytics_providers.g.dart';

@Riverpod(keepAlive: true)
AnalyticsRepository analyticsRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final cache = ref.read(cacheDatasourceProvider);
  return AnalyticsRepositoryImpl(dio: client.dio, cacheDatasource: cache);
}

@Riverpod(keepAlive: true)
Future<AnalyticsStats> analyticsStats(Ref ref) async {
  final repo = ref.read(analyticsRepositoryProvider);
  final stats = await repo.getStats();

  if (stats.atl == 0 || stats.ctl == 0) {
    final now = DateTime.now();
    final endDate = DateTime(now.year, now.month, now.day);
    final startDate = endDate.subtract(const Duration(days: 30));
    try {
      final history = await repo.getHistory(
        startDate: startDate,
        endDate: endDate,
      );
      if (history.isNotEmpty) {
        final latest = history.last.metrics;
        return stats.copyWith(
          atl: stats.atl == 0 ? latest.atl : stats.atl,
          ctl: stats.ctl == 0 ? latest.ctl : stats.ctl,
          tsb: (stats.atl == 0 || stats.ctl == 0)
              ? latest.tsb
              : stats.tsb,
        );
      }
    } catch (_) {}
  }

  return stats;
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
  final vdot = stats?.currentVdot ?? stats?.effectiveVO2max;
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
