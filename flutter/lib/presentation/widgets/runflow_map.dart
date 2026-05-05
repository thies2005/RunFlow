import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:runflow_flutter/core/utils/route_streams.dart';
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
    this.autoFitBounds = false,
    this.showAttribution = false,
    this.showKmMarkers = false,
    this.cameraPadding = const EdgeInsets.all(40),
  });

  final List<GpsPoint> gpsPoints;
  final LatLng? center;
  final double zoom;
  final double height;
  final bool followUser;
  final bool showMarkers;
  final MapController? mapController;
  final bool autoFitBounds;
  final bool showAttribution;
  final bool showKmMarkers;
  final EdgeInsets cameraPadding;

  @override
  State<RunFlowMap> createState() => _RunFlowMapState();
}

class _RunFlowMapState extends State<RunFlowMap> {
  late MapController _mapController;
  List<GpsPoint> _previousPoints = const [];
  bool _hasFittedBounds = false;

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
    if (widget.autoFitBounds && !_hasFittedBounds && widget.gpsPoints.length >= 2) {
      _fitBounds();
    }
    _previousPoints = widget.gpsPoints;
  }

  void _fitBounds() {
    final points = widget.gpsPoints
        .map((p) => LatLng(p.latitude, p.longitude))
        .toList();
    if (points.length < 2) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final bounds = LatLngBounds.fromPoints(points);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: widget.cameraPadding,
        ),
      );
      _hasFittedBounds = true;
    });
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

  List<Marker> _buildMarkers() {
    if (!widget.showMarkers || widget.gpsPoints.isEmpty) return [];

    final markers = <Marker>[];
    final first = widget.gpsPoints.first;
    final last = widget.gpsPoints.last;
    final hasMultiple = widget.gpsPoints.length > 1;

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

    if (hasMultiple) {
      markers.add(
        Marker(
          point: LatLng(last.latitude, last.longitude),
          width: 24,
          height: 24,
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.red,
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

    if (widget.followUser) {
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

    return markers;
  }

  List<Marker> _buildKmMarkers() {
    if (!widget.showKmMarkers || widget.gpsPoints.length < 2) return [];

    final markers = <Marker>[];
    double totalDist = 0;
    int nextKm = 1;

    for (int i = 1; i < widget.gpsPoints.length; i++) {
      final prev = widget.gpsPoints[i - 1];
      final curr = widget.gpsPoints[i];
      totalDist += _haversine(prev, curr);

      while (totalDist >= nextKm * 1000 && nextKm <= 100) {
        final fraction = 1 - ((totalDist - nextKm * 1000) / _haversine(prev, curr));
        final lat = prev.latitude + (curr.latitude - prev.latitude) * fraction;
        final lng = prev.longitude + (curr.longitude - prev.longitude) * fraction;
        markers.add(
          Marker(
            point: LatLng(lat, lng),
            width: 28,
            height: 28,
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.85),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '$nextKm',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        );
        nextKm++;
      }
    }
    return markers;
  }

  double _haversine(GpsPoint a, GpsPoint b) {
    const r = 6371000.0;
    final dLat = (b.latitude - a.latitude) * pi / 180;
    final dLon = (b.longitude - a.longitude) * pi / 180;
    final s = sin(dLat / 2) * sin(dLat / 2) +
        cos(a.latitude * pi / 180) * cos(b.latitude * pi / 180) * sin(dLon / 2) * sin(dLon / 2);
    return 2 * r * asin(sqrt(s));
  }

  @override
  Widget build(BuildContext context) {
    final polylinePoints = widget.gpsPoints
        .map((GpsPoint p) => LatLng(p.latitude, p.longitude))
        .toList();

    final markers = [..._buildMarkers(), ..._buildKmMarkers()];

    MapOptions mapOptions;
    if (widget.autoFitBounds && polylinePoints.length >= 2) {
      mapOptions = MapOptions(
        initialCameraFit: CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(polylinePoints),
          padding: widget.cameraPadding,
        ),
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.all,
        ),
      );
    } else {
      mapOptions = MapOptions(
        initialCenter: _computeCenter(),
        initialZoom: widget.zoom,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.all,
        ),
      );
    }

    return SizedBox(
      height: widget.height,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: FlutterMap(
          mapController: _mapController,
          options: mapOptions,
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
            if (widget.showAttribution)
              RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
