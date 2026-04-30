import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';

class RunFlowMap extends StatefulWidget {
  const RunFlowMap({
    super.key,
    this.gpsPoints = const [],
    this.center,
    this.zoom = 14.0,
    this.height = 200,
    this.followUser = false,
    this.showMarkers = true,
    this.mapController,
  });

  final List<GpsPoint> gpsPoints;
  final LatLng? center;
  final double zoom;
  final double height;
  final bool followUser;
  final bool showMarkers;
  final MapController? mapController;

  @override
  State<RunFlowMap> createState() => _RunFlowMapState();
}

class _RunFlowMapState extends State<RunFlowMap> {
  late MapController _mapController;
  List<GpsPoint> _previousPoints = const [];

  @override
  void initState() {
    super.initState();
    _mapController = widget.mapController ?? MapController();
  }

  @override
  void didUpdateWidget(RunFlowMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.followUser && widget.gpsPoints.isNotEmpty) {
      final hasNewPoints = widget.gpsPoints.length != _previousPoints.length;
      if (hasNewPoints) {
        final last = widget.gpsPoints.last;
        final target = LatLng(last.latitude, last.longitude);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _mapController.move(target, _mapController.camera.zoom);
          }
        });
      }
    }
    _previousPoints = widget.gpsPoints;
  }

  LatLng _computeCenter() {
    if (widget.center != null) return widget.center!;
    if (widget.gpsPoints.isNotEmpty) {
      return LatLng(
        widget.gpsPoints.last.latitude,
        widget.gpsPoints.last.longitude,
      );
    }
    return const LatLng(52.5200, 13.4050);
  }

  @override
  Widget build(BuildContext context) {
    final polylinePoints = widget.gpsPoints
        .map((GpsPoint p) => LatLng(p.latitude, p.longitude))
        .toList();

    final markers = <Marker>[];
    if (widget.showMarkers && widget.gpsPoints.isNotEmpty) {
      final first = widget.gpsPoints.first;
      markers.add(
        Marker(
          point: LatLng(first.latitude, first.longitude),
          width: 24,
          height: 24,
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(Icons.play_arrow, color: Colors.white, size: 14),
            ),
          ),
        ),
      );

      final last = widget.gpsPoints.last;
      final isLastAlsoFirst = widget.gpsPoints.length == 1;
      if (!isLastAlsoFirst) {
        markers.add(
          Marker(
            point: LatLng(last.latitude, last.longitude),
            width: 24,
            height: 24,
            child: Container(
              decoration: BoxDecoration(
                color: widget.gpsPoints.length > 2 ? Colors.red : Colors.blue,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          ),
        );
      }

      if (widget.gpsPoints.length > 2) {
        markers.add(
          Marker(
            point: LatLng(last.latitude, last.longitude),
            width: 20,
            height: 20,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(Icons.my_location, color: Colors.white, size: 10),
              ),
            ),
          ),
        );
      }
    }

    return SizedBox(
      height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _computeCenter(),
            initialZoom: widget.zoom,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.runflow.app',
            ),
            if (polylinePoints.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: polylinePoints,
                    color: Theme.of(context).colorScheme.primary,
                    strokeWidth: 4.0,
                  ),
                ],
              ),
            if (markers.isNotEmpty)
              MarkerLayer(markers: markers),
          ],
        ),
      ),
    );
  }
}
