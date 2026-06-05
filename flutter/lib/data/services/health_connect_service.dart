import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart'
    show FoodLogEntry;

abstract class HealthConnectService {
  Future<bool> isAvailable();
  Future<bool> requestPermissions();
  Future<List<Activity>> readActivities();
  Future<List<HealthDataPoint>> readHeartRate();
  Future<List<HealthDataPoint>> readSteps();
  Future<List<HealthDataPoint>> readActiveCalories(DateTime start, DateTime end);
  Future<List<HealthDataPoint>> readWeight(DateTime start, DateTime end);
  Future<double?> readLatestWeight();
  Future<bool> writeWeight(double weightKg, DateTime date);
  Future<List<NutritionHealthEntry>> readNutrition(DateTime start, DateTime end);
  Future<bool> writeNutritionEntry(FoodLogEntry entry, DateTime date);
  Future<bool> deleteNutritionEntry(String clientRecordId);

  // Vitals
  Future<VitalsData> readVitals();

  // Sleep
  Future<SleepData> readSleep();

  Future<Map<String, double>> readRestingHeartRateHistory(int days);
  Future<Map<String, SleepDayData>> readSleepHistory(int days);
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
    HealthDataType.NUTRITION,
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
      return await _health.requestAuthorization(
        _permissionTypes,
        permissions: _permissionTypes
            .map((type) => type == HealthDataType.NUTRITION
                ? HealthDataAccess.READ_WRITE
                : HealthDataAccess.READ)
            .toList(),
      );
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

      List<HealthDataPoint> hrData = [];
      try {
        hrData = await _health.getHealthDataFromTypes(
          types: [HealthDataType.HEART_RATE],
          startTime: startTime,
          endTime: now,
        );
      } catch (e) {
        logger.error('[HealthConnect] failed to fetch HR data for activities: $e');
      }

      List<HealthDataPoint> calData = [];
      try {
        calData = await _health.getHealthDataFromTypes(
          types: [HealthDataType.ACTIVE_ENERGY_BURNED],
          startTime: startTime,
          endTime: now,
        );
      } catch (e) {
        logger.error('[HealthConnect] failed to fetch calorie data for activities: $e');
      }

      return data
          .where((point) => point.value is WorkoutHealthValue)
          .map((point) => _convertToActivityEnriched(point, hrData, calData))
          .toList();
    } catch (e) {
      logger.error('[HealthConnect] readActivities failed: $e');
      return [];
    }
  }

  Activity _convertToActivityEnriched(
    HealthDataPoint point,
    List<HealthDataPoint> hrData,
    List<HealthDataPoint> calData,
  ) {
    final workoutValue = point.value as WorkoutHealthValue;
    final duration = point.dateTo.difference(point.dateFrom).inSeconds;
    final distance = (workoutValue.totalDistance ?? 0).toDouble();

    // Filter HR data inside this workout's window
    final workoutHr = hrData.where((h) =>
        !h.dateFrom.isBefore(point.dateFrom) &&
        !h.dateTo.isAfter(point.dateTo));
    
    double? averageHr;
    int? maxHr;
    if (workoutHr.isNotEmpty) {
      double sum = 0;
      int count = 0;
      int maxVal = 0;
      for (final h in workoutHr) {
        if (h.value is NumericHealthValue) {
          final val = (h.value as NumericHealthValue).numericValue.toInt();
          sum += val;
          count++;
          if (val > maxVal) maxVal = val;
        }
      }
      if (count > 0) {
        averageHr = sum / count;
        maxHr = maxVal;
      }
    }

    // Filter active calories in this workout's window
    final workoutCal = calData.where((c) =>
        !c.dateFrom.isBefore(point.dateFrom) &&
        !c.dateTo.isAfter(point.dateTo));
    double? calories;
    if (workoutCal.isNotEmpty) {
      double sum = 0;
      for (final c in workoutCal) {
        if (c.value is NumericHealthValue) {
          sum += (c.value as NumericHealthValue).numericValue.toDouble();
        }
      }
      calories = sum;
    }

    return Activity(
      id: point.uuid,
      stravaId: '',
      type: _mapWorkoutType(workoutValue.workoutActivityType),
      name: _workoutTypeName(workoutValue.workoutActivityType),
      startDate: point.dateFrom,
      distance: distance,
      movingTime: duration,
      averageSpeed: duration > 0 ? distance / duration : null,
      averageHr: averageHr,
      maxHr: maxHr,
      averageCadence: null,
      hasHeartrate: averageHr != null,
      totalElevation: 0.0,
      trimp: null,
      runningTss: null,
      estimatedVdot: null,
      trainingType: null,
      calories: calories,
    );
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
      final start = now.subtract(const Duration(days: 180));
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

  @override
  Future<bool> writeWeight(double weightKg, DateTime date) async {
    try {
      await _ensureConfigured();
      return await _health.writeHealthData(
        type: HealthDataType.WEIGHT,
        value: weightKg,
        startTime: date,
        endTime: date,
      );
    } catch (e) {
      logger.error('[HealthConnect] writeWeight failed: $e');
      return false;
    }
  }

  @override
  Future<List<NutritionHealthEntry>> readNutrition(
      DateTime start, DateTime end) async {
    try {
      await _ensureConfigured();
      final points = await _health.getHealthDataFromTypes(
        types: [HealthDataType.NUTRITION],
        startTime: start,
        endTime: end,
      );

      final entries = <NutritionHealthEntry>[];
      for (final point in points) {
        final value = point.value;
        if (value is! NutritionHealthValue) continue;
        final calories = value.calories;
        final protein = value.protein;
        final carbs = value.carbs;
        final fat = value.fat;
        final water = value.water;

        if ((calories ?? 0) <= 0 &&
            (protein ?? 0) <= 0 &&
            (carbs ?? 0) <= 0 &&
            (fat ?? 0) <= 0) {
          continue;
        }

        entries.add(NutritionHealthEntry(
          uuid: point.uuid,
          name: (value.name?.trim().isNotEmpty ?? false)
              ? value.name!.trim()
              : 'Health Connect meal',
          mealType: _mealTypeString(value.mealType),
          startTime: point.dateFrom,
          endTime: point.dateTo,
          calories: calories,
          protein: protein,
          carbs: carbs,
          fat: fat,
          water: water,
        ));
      }
      return entries;
    } catch (e) {
      logger.error('[HealthConnect] readNutrition failed: $e');
      return [];
    }
  }

  @override
  Future<bool> writeNutritionEntry(FoodLogEntry entry, DateTime date) async {
    try {
      await _ensureConfigured();
      int hour = 12;
      switch (entry.mealType.toLowerCase()) {
        case 'breakfast':
          hour = 8;
          break;
        case 'lunch':
          hour = 12;
          break;
        case 'dinner':
          hour = 19;
          break;
        case 'snack':
        default:
          hour = 15;
          break;
      }
      final start = DateTime(date.year, date.month, date.day, hour);
      final end = start.add(const Duration(minutes: 1));
      final clientRecordId = entry.id.isNotEmpty
          ? 'runflow-nutrition-${entry.id}'
          : 'runflow-nutrition-${date.toIso8601String()}-${entry.name.hashCode}';

      return _health.writeMeal(
        mealType: _mealType(entry.mealType),
        startTime: start,
        endTime: end,
        clientRecordId: clientRecordId,
        clientRecordVersion: DateTime.now().millisecondsSinceEpoch.toDouble(),
        name: entry.name,
        caloriesConsumed: entry.calories,
        carbohydrates: entry.carbs,
        protein: entry.protein,
        fatTotal: entry.fat,
        recordingMethod: RecordingMethod.manual,
      );
    } catch (e) {
      logger.error('[HealthConnect] writeNutritionEntry failed: $e');
      return false;
    }
  }

  @override
  Future<bool> deleteNutritionEntry(String clientRecordId) async {
    if (clientRecordId.isEmpty) return false;
    try {
      await _ensureConfigured();
      return _health.deleteByClientRecordId(
        dataTypeKey: HealthDataType.NUTRITION,
        clientRecordId: 'runflow-nutrition-$clientRecordId',
      );
    } catch (e) {
      logger.error('[HealthConnect] deleteNutritionEntry failed: $e');
      return false;
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

  @override
  Future<Map<String, double>> readRestingHeartRateHistory(int days) async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final startTime = now.subtract(Duration(days: days));

      final data = await _health.getHealthDataFromTypes(
        types: [HealthDataType.RESTING_HEART_RATE],
        startTime: startTime,
        endTime: now,
      );

      final byDate = <String, List<double>>{};
      for (final point in data) {
        final v = point.value;
        if (v is NumericHealthValue) {
          final key =
              '${point.dateFrom.year}-${point.dateFrom.month.toString().padLeft(2, '0')}-${point.dateFrom.day.toString().padLeft(2, '0')}';
          byDate.putIfAbsent(key, () => []).add(v.numericValue.toDouble());
        }
      }

      final result = <String, double>{};
      byDate.forEach((date, values) {
        final avg = values.reduce((a, b) => a + b) / values.length;
        result[date] = avg;
      });
      return result;
    } catch (e) {
      logger.error('[HealthConnect] readRestingHeartRateHistory failed: $e');
      return {};
    }
  }

  @override
  Future<Map<String, SleepDayData>> readSleepHistory(int days) async {
    try {
      await _ensureConfigured();
      final now = DateTime.now();
      final startTime = now.subtract(Duration(days: days));

      final results = await Future.wait([
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_SESSION],
          startTime: startTime,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_DEEP],
          startTime: startTime,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_REM],
          startTime: startTime,
          endTime: now,
        ),
        _health.getHealthDataFromTypes(
          types: [HealthDataType.SLEEP_LIGHT],
          startTime: startTime,
          endTime: now,
        ),
      ]);

      final sessions = results[0];
      final deepData = results[1];
      final remData = results[2];
      final lightData = results[3];

      final sessionByDate = <String, double>{};
      for (final s in sessions) {
        final key =
            '${s.dateFrom.year}-${s.dateFrom.month.toString().padLeft(2, '0')}-${s.dateFrom.day.toString().padLeft(2, '0')}';
        final dur = s.dateTo.difference(s.dateFrom).inMinutes.toDouble();
        sessionByDate.update(key, (v) => v + dur, ifAbsent: () => dur);
      }

      final deepByDate = <String, double>{};
      for (final p in deepData) {
        final key =
            '${p.dateFrom.year}-${p.dateFrom.month.toString().padLeft(2, '0')}-${p.dateFrom.day.toString().padLeft(2, '0')}';
        final dur = p.dateTo.difference(p.dateFrom).inMinutes.toDouble();
        deepByDate.update(key, (v) => v + dur, ifAbsent: () => dur);
      }

      final remByDate = <String, double>{};
      for (final p in remData) {
        final key =
            '${p.dateFrom.year}-${p.dateFrom.month.toString().padLeft(2, '0')}-${p.dateFrom.day.toString().padLeft(2, '0')}';
        final dur = p.dateTo.difference(p.dateFrom).inMinutes.toDouble();
        remByDate.update(key, (v) => v + dur, ifAbsent: () => dur);
      }

      final lightByDate = <String, double>{};
      for (final p in lightData) {
        final key =
            '${p.dateFrom.year}-${p.dateFrom.month.toString().padLeft(2, '0')}-${p.dateFrom.day.toString().padLeft(2, '0')}';
        final dur = p.dateTo.difference(p.dateFrom).inMinutes.toDouble();
        lightByDate.update(key, (v) => v + dur, ifAbsent: () => dur);
      }

      final result = <String, SleepDayData>{};
      for (final entry in sessionByDate.entries) {
        result[entry.key] = SleepDayData(
          totalMinutes: entry.value,
          deepMinutes: deepByDate[entry.key] ?? 0,
          remMinutes: remByDate[entry.key] ?? 0,
          lightMinutes: lightByDate[entry.key] ?? 0,
        );
      }
      return result;
    } catch (e) {
      logger.error('[HealthConnect] readSleepHistory failed: $e');
      return {};
    }
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
      case HealthWorkoutActivityType.STRENGTH_TRAINING:
      case HealthWorkoutActivityType.WEIGHTLIFTING:
        return ActivityType.strength;
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

  static MealType _mealType(String mealType) {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return MealType.BREAKFAST;
      case 'lunch':
        return MealType.LUNCH;
      case 'dinner':
        return MealType.DINNER;
      case 'snack':
        return MealType.SNACK;
      default:
        return MealType.UNKNOWN;
    }
  }

  static String _mealTypeString(String? mealType) {
    switch ((mealType ?? '').toLowerCase()) {
      case 'breakfast':
        return 'breakfast';
      case 'lunch':
        return 'lunch';
      case 'dinner':
        return 'dinner';
      case 'snack':
        return 'snack';
      default:
        return 'snack';
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
