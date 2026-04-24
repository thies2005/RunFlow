import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

abstract class HealthConnectService {
  Future<bool> requestPermissions();
  Future<List<Activity>> readActivities();
  Future<List<HealthDataPoint>> readHeartRate();
  Future<List<HealthDataPoint>> readSteps();
}

class HealthConnectServiceImpl implements HealthConnectService {
  HealthConnectServiceImpl({Health? health}) : _health = health ?? Health();

  final Health _health;

  static const List<HealthDataType> _permissionTypes = [
    HealthDataType.WORKOUT,
    HealthDataType.HEART_RATE,
    HealthDataType.STEPS,
  ];

  @override
  Future<bool> requestPermissions() async {
    try {
      await _health.configure();
      return await _health.requestAuthorization(_permissionTypes);
    } catch (_) {
      return false;
    }
  }

  @override
  Future<List<Activity>> readActivities() async {
    try {
      await _health.configure();
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(days: 30));

      final data = await _health.getHealthDataFromTypes(
        types: [HealthDataType.WORKOUT],
        startTime: startTime,
        endTime: now,
      );

      return data
          .where((point) => point.value is WorkoutHealthValue)
          .map(_convertToActivity)
          .toList();
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readHeartRate() async {
    try {
      await _health.configure();
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(days: 7));

      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.HEART_RATE],
        startTime: startTime,
        endTime: now,
      );
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readSteps() async {
    try {
      await _health.configure();
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(days: 7));

      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.STEPS],
        startTime: startTime,
        endTime: now,
      );
    } catch (_) {
      return [];
    }
  }

  Activity _convertToActivity(HealthDataPoint point) {
    final workoutValue = point.value as WorkoutHealthValue;
    final duration = point.dateTo.difference(point.dateFrom).inSeconds;
    final distance = (workoutValue.totalDistance ?? 0).toDouble();

    return Activity(
      id: point.uuid,
      stravaId: '',
      type: _mapWorkoutType(workoutValue.workoutActivityType),
      name: _workoutTypeName(workoutValue.workoutActivityType),
      startDate: point.dateFrom,
      distance: distance,
      movingTime: duration,
      averageSpeed: duration > 0 ? distance / duration : null,
      averageHr: null,
      maxHr: null,
      averageCadence: null,
      hasHeartrate: false,
      totalElevation: 0.0,
      trimp: null,
      runningTss: null,
      estimatedVdot: null,
      trainingType: null,
    );
  }

  static ActivityType _mapWorkoutType(HealthWorkoutActivityType type) {
    switch (type) {
      case HealthWorkoutActivityType.RUNNING:
      case HealthWorkoutActivityType.RUNNING_TREADMILL:
        return ActivityType.run;
      case HealthWorkoutActivityType.WALKING:
      case HealthWorkoutActivityType.WALKING_TREADMILL:
        return ActivityType.walk;
      case HealthWorkoutActivityType.BIKING:
      case HealthWorkoutActivityType.BIKING_STATIONARY:
      case HealthWorkoutActivityType.HAND_CYCLING:
        return ActivityType.ride;
      case HealthWorkoutActivityType.SWIMMING:
      case HealthWorkoutActivityType.SWIMMING_OPEN_WATER:
      case HealthWorkoutActivityType.SWIMMING_POOL:
        return ActivityType.swim;
      case HealthWorkoutActivityType.HIKING:
        return ActivityType.hike;
      default:
        return ActivityType.other;
    }
  }

  static String _workoutTypeName(HealthWorkoutActivityType type) {
    switch (type) {
      case HealthWorkoutActivityType.RUNNING:
        return 'Running';
      case HealthWorkoutActivityType.RUNNING_TREADMILL:
        return 'Treadmill Run';
      case HealthWorkoutActivityType.WALKING:
        return 'Walking';
      case HealthWorkoutActivityType.WALKING_TREADMILL:
        return 'Treadmill Walk';
      case HealthWorkoutActivityType.BIKING:
        return 'Cycling';
      case HealthWorkoutActivityType.BIKING_STATIONARY:
        return 'Stationary Cycling';
      case HealthWorkoutActivityType.SWIMMING:
      case HealthWorkoutActivityType.SWIMMING_POOL:
        return 'Swimming';
      case HealthWorkoutActivityType.SWIMMING_OPEN_WATER:
        return 'Open Water Swimming';
      case HealthWorkoutActivityType.HIKING:
        return 'Hiking';
      case HealthWorkoutActivityType.ROWING:
        return 'Rowing';
      case HealthWorkoutActivityType.YOGA:
        return 'Yoga';
      case HealthWorkoutActivityType.HIGH_INTENSITY_INTERVAL_TRAINING:
        return 'HIIT';
      case HealthWorkoutActivityType.STRENGTH_TRAINING:
      case HealthWorkoutActivityType.WEIGHTLIFTING:
        return 'Strength Training';
      default:
        return 'Workout';
    }
  }

  static Activity convertHealthDataPointToActivity(HealthDataPoint point) {
    final workoutValue = point.value as WorkoutHealthValue;
    final duration = point.dateTo.difference(point.dateFrom).inSeconds;
    final distance = (workoutValue.totalDistance ?? 0).toDouble();

    return Activity(
      id: point.uuid,
      stravaId: '',
      type: _mapWorkoutType(workoutValue.workoutActivityType),
      name: _workoutTypeName(workoutValue.workoutActivityType),
      startDate: point.dateFrom,
      distance: distance,
      movingTime: duration,
      averageSpeed: duration > 0 ? distance / duration : null,
      averageHr: null,
      maxHr: null,
      averageCadence: null,
      hasHeartrate: false,
      totalElevation: 0.0,
      trimp: null,
      runningTss: null,
      estimatedVdot: null,
      trainingType: null,
    );
  }
}
