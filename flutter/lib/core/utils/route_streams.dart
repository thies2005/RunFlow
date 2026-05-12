import 'dart:math';

import 'package:latlong2/latlong.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';

bool activityHasRoute(Activity activity) {
  final streams = activity.streams;
  if (streams == null) return false;
  final latlng = streams['latlng'];
  if (latlng is! List || latlng.isEmpty) return false;
  return true;
}

List<GpsPoint> gpsPointsFromStreams(Activity activity) {
  final streams = activity.streams;
  if (streams == null) return const [];

  final latlng = streams['latlng'];
  if (latlng is! List || latlng.isEmpty) return const [];

  final timeStream = streams['time'];
  final altitudeStream = streams['altitude'];

  final points = <GpsPoint>[];
  for (var i = 0; i < latlng.length; i++) {
    final pair = latlng[i];
    if (pair is List && pair.length >= 2) {
      final lat = (pair[0] as num).toDouble();
      final lng = (pair[1] as num).toDouble();
      if (lat != 0.0 || lng != 0.0) {
        final double? altitude;
        if (altitudeStream is List && i < altitudeStream.length) {
          altitude = (altitudeStream[i] as num?)?.toDouble();
        } else {
          altitude = null;
        }
        final int secondsElapsed;
        if (timeStream is List && i < timeStream.length) {
          secondsElapsed = (timeStream[i] as num).toInt();
        } else {
          secondsElapsed = i;
        }
        points.add(GpsPoint(
          latitude: lat,
          longitude: lng,
          altitude: altitude,
          speed: 0,
          timestamp: DateTime.fromMillisecondsSinceEpoch(
            activity.startDate.millisecondsSinceEpoch + secondsElapsed * 1000,
          ),
        ));
      }
    }
  }
  return points;
}

List<LatLng> latLngsFromGpsPoints(List<GpsPoint> points) {
  return points.map((p) => LatLng(p.latitude, p.longitude)).toList();
}

List<LatLng> simplifyRoute(List<LatLng> points, {int maxPoints = 800}) {
  if (points.length <= maxPoints) return points;

  double epsilon = 0.0001;
  List<LatLng> result = _douglasPeucker(points, epsilon);

  while (result.length > maxPoints && epsilon < 1.0) {
    epsilon *= 2;
    result = _douglasPeucker(points, epsilon);
  }

  return result;
}

List<LatLng> _douglasPeucker(List<LatLng> points, double epsilon) {
  if (points.length <= 2) return List.of(points);

  int maxIndex = 0;
  double maxDist = 0;

  final first = points.first;
  final last = points.last;

  for (int i = 1; i < points.length - 1; i++) {
    final dist = _perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    final left = _douglasPeucker(points.sublist(0, maxIndex + 1), epsilon);
    final right = _douglasPeucker(points.sublist(maxIndex), epsilon);
    return [...left.sublist(0, left.length - 1), ...right];
  }

  return [first, last];
}

double _perpendicularDistance(LatLng point, LatLng lineStart, LatLng lineEnd) {
  final dx = lineEnd.longitude - lineStart.longitude;
  final dy = lineEnd.latitude - lineStart.latitude;

  if (dx == 0 && dy == 0) {
    return _haversine(point, lineStart);
  }

  final num = ((point.longitude - lineStart.longitude) * dx + (point.latitude - lineStart.latitude) * dy).abs();
  final den = sqrt(dx * dx + dy * dy);

  final normalDist = num / den;

  final avgLat = (point.latitude + lineStart.latitude + lineEnd.latitude) / 3;
  final latFactor = cos(avgLat * pi / 180);

  return normalDist * 111320 * latFactor;
}

double _haversine(LatLng a, LatLng b) {
  final lat1 = a.latitude * pi / 180;
  final lat2 = b.latitude * pi / 180;
  final dLat = lat2 - lat1;
  final dLon = (b.longitude - a.longitude) * pi / 180;

  final s = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
  return 2 * 6371000 * asin(sqrt(s));
}
