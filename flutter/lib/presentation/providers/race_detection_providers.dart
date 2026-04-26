import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

part 'race_detection_providers.g.dart';

@riverpod
List<Activity> detectedRaceActivities(Ref ref) {
  final activitiesAsync = ref.watch(activitiesProvider);
  final state = activitiesAsync.value;
  if (state == null) return [];

  return state.activities.where((a) {
    if (a.type != ActivityType.run) return false;
    if (a.averageHr == null || a.maxHr == null) return false;

    final hrReserve = a.maxHr! > 0 ? (a.averageHr! / a.maxHr!) : 0.0;
    final isHighIntensity = hrReserve > 0.85;

    final raceDistances = [5000, 10000, 21097.5, 42195];
    final matchesRaceDistance = raceDistances.any((d) {
      final diff = (a.distance - d).abs();
      return diff < d * 0.05;
    });

    final pace = a.averageSpeed != null && a.averageSpeed! > 0
        ? a.averageSpeed!
        : 0.0;
    final isHighPace = pace > 3.5;

    return (isHighIntensity && matchesRaceDistance) ||
        (matchesRaceDistance && isHighPace) ||
        (isHighIntensity && a.distance >= 4000 && isHighPace);
  }).toList();
}

@riverpod
List<Activity> recentRaceCandidates(Ref ref) {
  final activitiesAsync = ref.watch(activitiesProvider);
  final state = activitiesAsync.value;
  if (state == null) return [];

  return state.activities
      .where((a) => a.type == ActivityType.run && a.distance >= 3000)
      .take(20)
      .toList();
}
