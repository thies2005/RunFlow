import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class HeatmapMap extends StatelessWidget {
  const HeatmapMap({
    required this.routes,
    this.height = 280,
    this.showAttribution = false,
    super.key,
  });

  final List<List<LatLng>> routes;
  final double height;
  final bool showAttribution;

  @override
  Widget build(BuildContext context) {
    if (routes.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.map_outlined, size: 48, color: AppColors.onSurfaceVariant),
              const SizedBox(height: 8),
              Text(
                'Record GPS activities to build your heatmap.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final bounds = _computeBounds(routes);
    final polylines = routes.map((route) => Polyline(
      points: route,
      strokeWidth: 3.0,
      color: AppColors.primary.withValues(alpha: 0.15),
    )).toList();

    return SizedBox(
      height: height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: FlutterMap(
          options: MapOptions(
            initialCameraFit: CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.all(40),
            ),
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.runflow.app',
            ),
            PolylineLayer(polylines: polylines),
            if (showAttribution)
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
          ],
        ),
      ),
    );
  }

  LatLngBounds _computeBounds(List<List<LatLng>> routes) {
    double minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (final route in routes) {
      for (final point in route) {
        if (point.latitude < minLat) minLat = point.latitude;
        if (point.latitude > maxLat) maxLat = point.latitude;
        if (point.longitude < minLng) minLng = point.longitude;
        if (point.longitude > maxLng) maxLng = point.longitude;
      }
    }
    return LatLngBounds(
      LatLng(minLat, minLng),
      LatLng(maxLat, maxLng),
    );
  }
}
