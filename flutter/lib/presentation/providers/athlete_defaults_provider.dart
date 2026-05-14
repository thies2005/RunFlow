import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/core/utils/athlete_defaults.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';

part 'athlete_defaults_provider.g.dart';

@riverpod
AthleteDefaults athleteDefaults(Ref ref) {
  final dashboardAsync = ref.watch(dashboardProvider);
  final stats = ref.watch(analyticsStatsProvider).value;

  return dashboardAsync.when(
    loading: () => const AthleteDefaults(
      cssSource: AthleteDefaultsSource.noData,
      bikeSource: AthleteDefaultsSource.noData,
    ),
    error: (_, __) => const AthleteDefaults(
      cssSource: AthleteDefaultsSource.noData,
      bikeSource: AthleteDefaultsSource.noData,
    ),
    data: (data) => computeAthleteDefaults(
      data.recentActivities,
      fallbackVdot: stats?.effectiveVO2max,
    ),
  );
}
