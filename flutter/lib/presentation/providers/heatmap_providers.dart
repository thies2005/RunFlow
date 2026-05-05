import 'package:latlong2/latlong.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/core/utils/route_streams.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

part 'heatmap_providers.g.dart';

@riverpod
Future<List<List<LatLng>>> heatmapRoutes(Ref ref, {int days = 365}) async {
  final repo = ref.read(activityRepositoryProvider);
  final since = DateTime.now().subtract(Duration(days: days));
  final activities = await repo.listActivitiesWithRoutes(since: since);

  return activities.map((a) {
    final points = gpsPointsFromStreams(a);
    final latLngs = latLngsFromGpsPoints(points);
    return simplifyRoute(latLngs, maxPoints: 300);
  }).where((r) => r.length >= 2).toList();
}
