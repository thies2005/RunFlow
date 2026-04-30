import 'package:flutter/foundation.dart';

class GpsPoint {
  const GpsPoint({
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

  GpsPoint copyWith({
    double? latitude,
    double? longitude,
    double? altitude,
    double? speed,
    DateTime? timestamp,
  }) {
    return GpsPoint(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      altitude: altitude ?? this.altitude,
      speed: speed ?? this.speed,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GpsPoint &&
          runtimeType == other.runtimeType &&
          latitude == other.latitude &&
          longitude == other.longitude &&
          altitude == other.altitude &&
          speed == other.speed &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(
        latitude,
        longitude,
        altitude,
        speed,
        timestamp,
      );
}

class HrSample {
  const HrSample({
    required this.heartRate,
    required this.timestamp,
  });

  final int heartRate;
  final DateTime timestamp;

  HrSample copyWith({
    int? heartRate,
    DateTime? timestamp,
  }) {
    return HrSample(
      heartRate: heartRate ?? this.heartRate,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HrSample &&
          runtimeType == other.runtimeType &&
          heartRate == other.heartRate &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(
        heartRate,
        timestamp,
      );
}

class RecordedWorkout {
  const RecordedWorkout({
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

  RecordedWorkout copyWith({
    String? name,
    String? activityType,
    DateTime? startTime,
    int? durationSeconds,
    double? distanceMeters,
    double? averageSpeed,
    double? maxSpeed,
    double? averageHr,
    int? maxHr,
    double? averageCadence,
    bool? hasHeartrate,
    List<GpsPoint>? gpsPoints,
    List<HrSample>? hrSamples,
    double? totalElevation,
  }) {
    return RecordedWorkout(
      name: name ?? this.name,
      activityType: activityType ?? this.activityType,
      startTime: startTime ?? this.startTime,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      averageSpeed: averageSpeed ?? this.averageSpeed,
      maxSpeed: maxSpeed ?? this.maxSpeed,
      averageHr: averageHr ?? this.averageHr,
      maxHr: maxHr ?? this.maxHr,
      averageCadence: averageCadence ?? this.averageCadence,
      hasHeartrate: hasHeartrate ?? this.hasHeartrate,
      gpsPoints: gpsPoints ?? this.gpsPoints,
      hrSamples: hrSamples ?? this.hrSamples,
      totalElevation: totalElevation ?? this.totalElevation,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecordedWorkout &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          activityType == other.activityType &&
          startTime == other.startTime &&
          durationSeconds == other.durationSeconds &&
          distanceMeters == other.distanceMeters &&
          averageSpeed == other.averageSpeed &&
          maxSpeed == other.maxSpeed &&
          averageHr == other.averageHr &&
          maxHr == other.maxHr &&
          averageCadence == other.averageCadence &&
          hasHeartrate == other.hasHeartrate &&
          listEquals(gpsPoints, other.gpsPoints) &&
          listEquals(hrSamples, other.hrSamples) &&
          totalElevation == other.totalElevation;

  @override
  int get hashCode => Object.hashAll([
        name,
        activityType,
        startTime,
        durationSeconds,
        distanceMeters,
        averageSpeed,
        maxSpeed,
        averageHr,
        maxHr,
        averageCadence,
        hasHeartrate,
        Object.hashAll(gpsPoints),
        Object.hashAll(hrSamples),
        totalElevation,
      ]);
}
