import 'dart:convert';

class GpsPoint {
  GpsPoint({
    required this.latitude,
    required this.longitude,
    this.altitude,
    required this.speed,
    required this.timestamp,
  });

  final double latitude;
  final double longitude;
  final double? altitude;
  final double speed;
  final DateTime timestamp;

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'speed': speed,
        'timestamp': timestamp.toIso8601String(),
      };

  factory GpsPoint.fromJson(Map<String, dynamic> json) => GpsPoint(
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        altitude: json['altitude'] != null
            ? (json['altitude'] as num).toDouble()
            : null,
        speed: (json['speed'] as num).toDouble(),
        timestamp: DateTime.parse(json['timestamp'] as String),
      );
}

class HrSample {
  HrSample({
    required this.heartRate,
    required this.timestamp,
  });

  final int heartRate;
  final DateTime timestamp;

  Map<String, dynamic> toJson() => {
        'heartRate': heartRate,
        'timestamp': timestamp.toIso8601String(),
      };

  factory HrSample.fromJson(Map<String, dynamic> json) => HrSample(
        heartRate: json['heartRate'] as int,
        timestamp: DateTime.parse(json['timestamp'] as String),
      );
}

class RecordedWorkout {
  RecordedWorkout({
    this.name = 'Morning Run',
    this.activityType = 'RUN',
    required this.startTime,
    required this.durationSeconds,
    required this.distanceMeters,
    this.averageSpeed,
    this.maxSpeed,
    this.averageHr,
    this.maxHr,
    this.averageCadence,
    this.hasHeartrate = false,
    this.gpsPoints = const [],
    this.hrSamples = const [],
    this.totalElevation,
  });

  final String name;
  final String activityType;
  final DateTime startTime;
  final int durationSeconds;
  final double distanceMeters;
  final double? averageSpeed;
  final double? maxSpeed;
  final double? averageHr;
  final int? maxHr;
  final double? averageCadence;
  final bool hasHeartrate;
  final List<GpsPoint> gpsPoints;
  final List<HrSample> hrSamples;
  final double? totalElevation;

  Map<String, dynamic> toJson() => {
        'name': name,
        'activityType': activityType,
        'startTime': startTime.toIso8601String(),
        'durationSeconds': durationSeconds,
        'distanceMeters': distanceMeters,
        'averageSpeed': averageSpeed,
        'maxSpeed': maxSpeed,
        'averageHr': averageHr,
        'maxHr': maxHr,
        'averageCadence': averageCadence,
        'hasHeartrate': hasHeartrate,
        'gpsPoints': gpsPoints.map((GpsPoint p) => p.toJson()).toList(),
        'hrSamples': hrSamples.map((HrSample h) => h.toJson()).toList(),
        'totalElevation': totalElevation,
      };

  factory RecordedWorkout.fromJson(Map<String, dynamic> json) =>
      RecordedWorkout(
        name: json['name'] as String? ?? 'Morning Run',
        activityType: json['activityType'] as String? ?? 'RUN',
        startTime: DateTime.parse(json['startTime'] as String),
        durationSeconds: json['durationSeconds'] as int,
        distanceMeters: (json['distanceMeters'] as num).toDouble(),
        averageSpeed: json['averageSpeed'] != null
            ? (json['averageSpeed'] as num).toDouble()
            : null,
        maxSpeed: json['maxSpeed'] != null
            ? (json['maxSpeed'] as num).toDouble()
            : null,
        averageHr: json['averageHr'] != null
            ? (json['averageHr'] as num).toDouble()
            : null,
        maxHr: json['maxHr'] as int?,
        averageCadence: json['averageCadence'] != null
            ? (json['averageCadence'] as num).toDouble()
            : null,
        hasHeartrate: json['hasHeartrate'] as bool? ?? false,
        gpsPoints: (json['gpsPoints'] as List<dynamic>)
            .map((dynamic e) => GpsPoint.fromJson(e as Map<String, dynamic>))
            .toList(),
        hrSamples: (json['hrSamples'] as List<dynamic>)
            .map((dynamic e) => HrSample.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalElevation: json['totalElevation'] != null
            ? (json['totalElevation'] as num).toDouble()
            : null,
      );

  String toJsonString() => jsonEncode(toJson());
}
