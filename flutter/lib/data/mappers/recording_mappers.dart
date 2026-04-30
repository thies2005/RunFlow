import 'package:runflow_flutter/data/models/recording_models.dart' as data;
import 'package:runflow_flutter/domain/entities/recording_entities.dart' as domain;

extension DataGpsPointMapper on data.GpsPoint {
  domain.GpsPoint toDomain() => domain.GpsPoint(
        latitude: latitude,
        longitude: longitude,
        altitude: altitude,
        speed: speed,
        timestamp: timestamp,
      );
}

extension DomainGpsPointMapper on domain.GpsPoint {
  data.GpsPoint toData() => data.GpsPoint(
        latitude: latitude,
        longitude: longitude,
        altitude: altitude,
        speed: speed,
        timestamp: timestamp,
      );
}

extension DataHrSampleMapper on data.HrSample {
  domain.HrSample toDomain() => domain.HrSample(
        heartRate: heartRate,
        timestamp: timestamp,
      );
}

extension DomainHrSampleMapper on domain.HrSample {
  data.HrSample toData() => data.HrSample(
        heartRate: heartRate,
        timestamp: timestamp,
      );
}

extension DataRecordedWorkoutMapper on data.RecordedWorkout {
  domain.RecordedWorkout toDomain() => domain.RecordedWorkout(
        name: name,
        activityType: activityType,
        startTime: startTime,
        durationSeconds: durationSeconds,
        distanceMeters: distanceMeters,
        averageSpeed: averageSpeed,
        maxSpeed: maxSpeed,
        averageHr: averageHr,
        maxHr: maxHr,
        averageCadence: averageCadence,
        hasHeartrate: hasHeartrate,
        gpsPoints: gpsPoints.map((p) => p.toDomain()).toList(),
        hrSamples: hrSamples.map((h) => h.toDomain()).toList(),
        totalElevation: totalElevation,
      );
}

extension DomainRecordedWorkoutMapper on domain.RecordedWorkout {
  data.RecordedWorkout toData() => data.RecordedWorkout(
        name: name,
        activityType: activityType,
        startTime: startTime,
        durationSeconds: durationSeconds,
        distanceMeters: distanceMeters,
        averageSpeed: averageSpeed,
        maxSpeed: maxSpeed,
        averageHr: averageHr,
        maxHr: maxHr,
        averageCadence: averageCadence,
        hasHeartrate: hasHeartrate,
        gpsPoints: gpsPoints.map((p) => p.toData()).toList(),
        hrSamples: hrSamples.map((h) => h.toData()).toList(),
        totalElevation: totalElevation,
      );
}
