import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';

abstract class HealthConnectService {
  Future<bool> isAvailable();
  Future<bool> requestPermissions();
  Future<List<Activity>> readActivities();
  Future<List<HealthDataPoint>> readHeartRate();
  Future<List<HealthDataPoint>> readSteps();
  Future<List<HealthDataPoint>> readActiveCalories(DateTime start, DateTime end);
  Future<List<HealthDataPoint>> readWeight(DateTime start, DateTime end);
  Future<double?> readLatestWeight();

  // Vitals
  Future<VitalsData> readVitals();

  // Sleep
  Future<SleepData> readSleep();
}

class HealthConnectServiceImpl implements HealthConnectService {
  HealthConnectServiceImpl({Health? health}) : _health = health ?? Health();

  final Health _health;
  bool _configured = false;

  static const List<HealthDataType> _permissionTypes = [
    HealthDataType.WORKOUT,
    HealthDataType.HEART_RATE,
    HealthDataType.RESTING_HEART_RATE,
    HealthDataType.BLOOD_OXYGEN,
    HealthDataType.SLEEP_SESSION,
    HealthDataType.SLEEP_DEEP,
    HealthDataType.SLEEP_REM,
    HealthDataType.SLEEP_LIGHT,
    HealthDataType.SLEEP_AWAKE,
    HealthDataType.STEPS,
    HealthDataType.ACTIVE_ENERGY_BURNED,
    HealthDataType.WEIGHT,
    HealthDataType.BODY_FAT_PERCENTAGE,
    HealthDataType.DISTANCE_DELTA,
  ];

  Future<void> _ensureConfigured() async {
    if (!_configured) {
      await _health.configure();
      _configured = true;
    }
  }

  @override
  Future<bool> isAvailable() async {
    try {
      final available = await _health.isHealthConnectAvailable();
      if (!available) {
        logger.warning('[HealthConnect] Health Connect not available on this device');
      }
      return available;
    } catch (e) {
      logger.error('[HealthConnect] isAvailable check failed: $e');
      return false;
    }
  }

  @override
  Future<bool> requestPermissions() async {
    try {
      await _ensureConfigured();
      return await _health.requestAuthorization(_permissionTypes,
          permissions: _permissionTypes.map((_) => HealthDataAccess.READ).toList());
    } catch (e) {
      logger.error('[HealthConnect] Permission request failed: $e');
      return false;
    }
  }

  @override
  Future<List<Activity>> readActivities() async {
    try {
      await _ensureConfigured();
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
    } catch (e) {
      logger.error('[HealthConnect] readActivities failed: $e');
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readHeartRate() async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(days: 7));

      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.HEART_RATE],
        startTime: startTime,
        endTime: now,
      );
    } catch (e) {
      logger.error('[HealthConnect] readHeartRate failed: $e');
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readSteps() async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final startTime = now.subtract(const Duration(days: 7));

      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.STEPS],
        startTime: startTime,
        endTime: now,
      );
    } catch (e) {
      logger.error('[HealthConnect] readSteps failed: $e');
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readActiveCalories(
      DateTime start, DateTime end) async {
    try {
      await _ensureConfigured();
      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.ACTIVE_ENERGY_BURNED],
        startTime: start,
        endTime: end,
      );
    } catch (e) {
      logger.error('[HealthConnect] readActiveCalories failed: $e');
      return [];
    }
  }

  @override
  Future<List<HealthDataPoint>> readWeight(
      DateTime start, DateTime end) async {
    try {
      await _ensureConfigured();
      return await _health.getHealthDataFromTypes(
        types: [HealthDataType.WEIGHT],
        startTime: start,
        endTime: end,
      );
    } catch (e) {
      logger.error('[HealthConnect] readWeight failed: $e');
      return [];
    }
  }

  @override
  Future<double?> readLatestWeight() async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final start = now.subtract(const Duration(days: 30));
      final data = await _health.getHealthDataFromTypes(
        types: [HealthDataType.WEIGHT],
        startTime: start,
        endTime: now,
      );
      if (data.isEmpty) return null;
      data.sort((a, b) => b.dateFrom.compareTo(a.dateFrom));
      final value = data.first.value;
      if (value is NumericHealthValue) {
        return value.numericValue.toDouble();
      }
      return null;
    } catch (e) {
      logger.error('[HealthConnect] readLatestWeight failed: $e');
      return null;
    }
  }

  // ─── Vitals ──────────────────────────────────────────────────────────────────

  @override
  Future<VitalsData> readVitals() async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final sevenDaysAgo = now.subtract(const Duration(days: 7));

      final results = await Future.wait([
        _health.getHealthDataFromTypes(
          types: [HealthDataType.RESTING_HEART_RATE],
          startTime: sevenDaysAgo,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.BLOOD_OXYGEN],
          startTime: sevenDaysAgo,
          endTime: now,
        ),
      ]);

      final restingHrData = results[0];
      final spo2Data = results[1];

      double? restingHr;
      double? spo2;

      if (restingHrData.isNotEmpty) {
        restingHrData.sort((a, b) => b.dateFrom.compareTo(a.dateFrom));
        final v = restingHrData.first.value;
        if (v is NumericHealthValue) restingHr = v.numericValue.toDouble();
      }

      if (spo2Data.isNotEmpty) {
        spo2Data.sort((a, b) => b.dateFrom.compareTo(a.dateFrom));
        final v = spo2Data.first.value;
        if (v is NumericHealthValue) spo2 = v.numericValue.toDouble();
      }

      final hrTrend = <DateTime, double>{};
      for (final point in restingHrData) {
        final v = point.value;
        if (v is NumericHealthValue) {
          final day =
              DateTime(point.dateFrom.year, point.dateFrom.month, point.dateFrom.day);
          hrTrend[day] = v.numericValue.toDouble();
        }
      }

      return VitalsData(
        restingHeartRate: restingHr,
        hrv: null,
        spo2: spo2,
        lastSynced: DateTime.now(),
        hrTrend: hrTrend,
        hrvTrend: {},
      );
    } catch (e) {
      logger.error('[HealthConnect] readVitals failed: $e');
      return const VitalsData();
    }
  }

  // ─── Sleep ───────────────────────────────────────────────────────────────────

  @override
  Future<SleepData> readSleep() async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final fourteenDaysAgo = now.subtract(const Duration(days: 14));

      final results = await Future.wait([
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_SESSION],
          startTime: fourteenDaysAgo,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_DEEP],
          startTime: fourteenDaysAgo,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_REM],
          startTime: fourteenDaysAgo,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_LIGHT],
          startTime: fourteenDaysAgo,
          endTime: now,
        ),
      ]);

      final sessions = results[0];
      final deepData = results[1];
      final remData = results[2];
      final lightData = results[3];

      if (sessions.isEmpty) return const SleepData();

      // Most recent session
      sessions.sort((a, b) => b.dateFrom.compareTo(a.dateFrom));
      final latest = sessions.first;

      final totalMinutes =
          latest.dateTo.difference(latest.dateFrom).inMinutes;

      double deepMinutes = 0;
      double remMinutes = 0;
      double lightMinutes = 0;

      void sumStage(List<HealthDataPoint> data, void Function(double) fn) {
        for (final p in data) {
          if (p.dateFrom.isAfter(latest.dateFrom) &&
              p.dateTo.isBefore(latest.dateTo.add(const Duration(minutes: 1)))) {
            fn(p.dateTo.difference(p.dateFrom).inMinutes.toDouble());
          }
        }
      }

      sumStage(deepData, (m) => deepMinutes += m);
      sumStage(remData, (m) => remMinutes += m);
      sumStage(lightData, (m) => lightMinutes += m);

      // 7-day sessions
      final dailySleep = <SleepSession>[];
      for (final session in sessions.take(7)) {
        dailySleep.add(SleepSession(
          startTime: session.dateFrom,
          endTime: session.dateTo,
          durationMinutes: session.dateTo.difference(session.dateFrom).inMinutes,
        ));
      }

      return SleepData(
        lastNightMinutes: totalMinutes,
        lastNightStart: latest.dateFrom,
        lastNightEnd: latest.dateTo,
        deepMinutes: deepMinutes,
        remMinutes: remMinutes,
        lightMinutes: lightMinutes,
        lastSynced: DateTime.now(),
        recentSessions: dailySleep,
      );
    } catch (e) {
      logger.error('[HealthConnect] readSleep failed: $e');
      return const SleepData();
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
