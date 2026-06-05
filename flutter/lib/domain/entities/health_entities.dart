
import 'package:freezed_annotation/freezed_annotation.dart';

part 'health_entities.freezed.dart';
part 'health_entities.g.dart';

@freezed
abstract class NutritionLog with _$NutritionLog {
  const factory NutritionLog({
    required int id,
    required DateTime date,
    required double calories,
    required double protein,
    required double carbs,
    required double fat,
    required double water,
    String? notes,
    required DateTime createdAt,
  }) = _NutritionLog;

}

@freezed
abstract class FoodItem with _$FoodItem {
  const factory FoodItem({
    required int id,
    required String name,
    required double calories,
    required double protein,
    required double carbs,
    required double fat,
    required double servingSize,
    String? brand,
    String? barcode,
    String? favoriteId,
  }) = _FoodItem;
  const FoodItem._();

  bool get isFavorite => favoriteId != null;
}

@freezed
abstract class Supplement with _$Supplement {
  const factory Supplement({
    required int id,
    String? serverId,
    required String name,
    @Default(0) double amount,
    @Default('mg') String unit,
    @Default('MORNING') String timeOfDay,
    @Default([]) List<int> daysOfWeek,
    @Default(true) bool isActive,
    String? stackId,
    @Default(0) int order,
    @Default('') String dosage,
    @Default('Daily') String frequency,
  }) = _Supplement;
  const Supplement._();

  String get uniqueId => serverId ?? id.toString();
}

@freezed
abstract class SupplementStack with _$SupplementStack {
  const factory SupplementStack({
    required int id,
    required String name,
    required List<Supplement> supplements,
    required bool isActive,
  }) = _SupplementStack;

}

@freezed
abstract class DailyHealthLog with _$DailyHealthLog {
  const factory DailyHealthLog({
    required int id,
    required DateTime date,
    @Default(0) int steps,
    double? weight,
    @Default(0) double waterIntake,
    @Default(0) int exerciseCalories,
    @Default([]) List<SupplementLog> supplementLogs,
    @Default([]) List<FoodLogEntry> foodLogs,
    DailyHealthMeta? meta,
  }) = _DailyHealthLog;

}

@freezed
abstract class SupplementLog with _$SupplementLog {
  const factory SupplementLog({
    required String supplementId,
    required DateTime date,
    @Default(false) bool taken,
  }) = _SupplementLog;

}

@freezed
abstract class FoodLogEntry with _$FoodLogEntry {
  const factory FoodLogEntry({
    @Default('') String id,
    required String mealType,
    required String name,
    double? quantity,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    String? foodItemId,
  }) = _FoodLogEntry;

}

@freezed
abstract class DailyHealthMeta with _$DailyHealthMeta {
  const factory DailyHealthMeta({
    @Default(false) bool hasStepHistory,
  }) = _DailyHealthMeta;

}

@freezed
abstract class FastingSession with _$FastingSession {
  const factory FastingSession({
    required int id,
    required DateTime startTime,
    DateTime? endTime,
    required int duration,
    required bool isActive,
  }) = _FastingSession;

}

@freezed
abstract class FastingSchedule with _$FastingSchedule {
  const factory FastingSchedule({
    @Default(20) int fastingStartHour,
    @Default(0) int fastingStartMinute,
    @Default(12) int fastingEndHour,
    @Default(0) int fastingEndMinute,
    @Default(16.0) double targetHours,
    @Default(false) bool isEnabled,
  }) = _FastingSchedule;
  const FastingSchedule._();

  factory FastingSchedule.fromJson(Map<String, dynamic> json) =>
      FastingSchedule(
        fastingStartHour: json['fastingStartHour'] as int? ?? 20,
        fastingStartMinute: json['fastingStartMinute'] as int? ?? 0,
        fastingEndHour: json['fastingEndHour'] as int? ?? 12,
        fastingEndMinute: json['fastingEndMinute'] as int? ?? 0,
        targetHours: (json['targetHours'] as num?)?.toDouble() ?? 16.0,
        isEnabled: json['isEnabled'] as bool? ?? false,
      );
  int get eatingHours => (24 - targetHours).toInt();
  int get fastingHoursInt => targetHours.toInt();
  DateTime get _now => DateTime.now();
  DateTime get todayFastingStart => DateTime(
    _now.year,
    _now.month,
    _now.day,
    fastingStartHour,
    fastingStartMinute,
  );
  DateTime get todayFastingEnd => DateTime(
    _now.year,
    _now.month,
    _now.day,
    fastingEndHour,
    fastingEndMinute,
  );
  DateTime get nextFastingStart {
    final start = todayFastingStart;
    if (_now.isBefore(start)) return start;
    return start.add(const Duration(days: 1));
  }
  DateTime get nextEatingStart {
    final end = todayFastingEnd;
    if (_now.isBefore(end)) return end;
    return end.add(const Duration(days: 1));
  }
  bool get isCurrentlyInFastingWindow {
    if (!isEnabled) return false;
    final nowMin = _now.hour * 60 + _now.minute;
    final startMin = fastingStartHour * 60 + fastingStartMinute;
    final endMin = fastingEndHour * 60 + fastingEndMinute;
    if (startMin > endMin) {
      return nowMin >= startMin || nowMin < endMin;
    }
    return nowMin >= startMin && nowMin < endMin;
  }
  Duration get timeToNextPhase {
    if (isCurrentlyInFastingWindow) {
      final nowMin = _now.hour * 60 + _now.minute;
      final endMin = fastingEndHour * 60 + fastingEndMinute;
      int diffMin;
      if (nowMin < endMin) {
        diffMin = endMin - nowMin;
      } else {
        diffMin = (24 * 60 - nowMin) + endMin;
      }
      return Duration(minutes: diffMin);
    }
    final nowMin = _now.hour * 60 + _now.minute;
    final startMin = fastingStartHour * 60 + fastingStartMinute;
    int diffMin;
    if (nowMin < startMin) {
      diffMin = startMin - nowMin;
    } else {
      diffMin = (24 * 60 - nowMin) + startMin;
    }
    return Duration(minutes: diffMin);
  }
  @override
  Map<String, dynamic> toJson() => {
    'fastingStartHour': fastingStartHour,
    'fastingStartMinute': fastingStartMinute,
    'fastingEndHour': fastingEndHour,
    'fastingEndMinute': fastingEndMinute,
    'targetHours': targetHours,
    'isEnabled': isEnabled,
  };
}

@freezed
abstract class BodyMeasurement with _$BodyMeasurement {
  const factory BodyMeasurement({
    required int id,
    required DateTime date,
    required double weight,
    required double bodyFat,
    double? chest,
    double? waist,
    double? hips,
    double? arms,
    String? notes,
  }) = _BodyMeasurement;

}

@freezed
abstract class NutritionTargets with _$NutritionTargets {
  const factory NutritionTargets({
    required int calories,
    required int protein,
    required int carbs,
    required int fat,
    required double water,
    @Default(30) double proteinPercent,
    @Default(40) double carbsPercent,
    @Default(30) double fatPercent,
    @Default(2500) int waterGoalMl,
    @Default(0.5) double exerciseCalorieFactor,
    @Default('strava') String exerciseCalorieSource,
    @Default(false) bool waterTrackingEnabled,
  }) = _NutritionTargets;
  const NutritionTargets._();

  static const defaults = NutritionTargets(
    calories: 2000,
    protein: 150,
    carbs: 300,
    fat: 80,
    water: 2.5,
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30,
    waterGoalMl: 2500,
    exerciseCalorieFactor: 0.5,
    exerciseCalorieSource: 'strava',
    waterTrackingEnabled: false,
  );
}

@freezed
abstract class NutritionAnalytics with _$NutritionAnalytics {
  const factory NutritionAnalytics({
    @Default(0) double macroAdherenceScore,
    @Default([]) List<DailyNutrition> dailyData,
    @Default([]) List<MicronutrientSummary> micronutrients,
  }) = _NutritionAnalytics;

}

@freezed
abstract class DailyNutrition with _$DailyNutrition {
  const factory DailyNutrition({
    required DateTime date,
    @Default(0) double calories,
    @Default(0) double protein,
    @Default(0) double carbs,
    @Default(0) double fat,
  }) = _DailyNutrition;

}

@freezed
abstract class MicronutrientSummary with _$MicronutrientSummary {
  const factory MicronutrientSummary({
    required String name,
    @Default(0) double amount,
    @Default('') String unit,
    @Default(0) double dailyValuePercent,
  }) = _MicronutrientSummary;

}

@freezed
abstract class SupplementAnalytics with _$SupplementAnalytics {
  const factory SupplementAnalytics({
    @Default(0) double overallAdherence,
    @Default(0) double avgDailyDoses,
    @Default(0) int totalSupplements,
    @Default(0) int totalScheduled,
    @Default(0) int totalTaken,
    @Default(0) int totalDays,
    @Default([]) List<SupplementAdherence> supplements,
  }) = _SupplementAnalytics;

}

@freezed
abstract class SupplementAdherence with _$SupplementAdherence {
  const factory SupplementAdherence({
    required String name,
    @Default(0) double adherencePercent,
    @Default(0) int daysTaken,
    @Default(0) int totalDays,
  }) = _SupplementAdherence;

}

@freezed
abstract class HealthHistory with _$HealthHistory {
  const factory HealthHistory({
    @Default([]) List<HealthHistoryPoint> steps,
    @Default([]) List<HealthHistoryPoint> weight,
  }) = _HealthHistory;

}

@freezed
abstract class HealthHistoryPoint with _$HealthHistoryPoint {
  const factory HealthHistoryPoint({
    required DateTime date,
    required double value,
  }) = _HealthHistoryPoint;

}

@freezed
abstract class SavedMeal with _$SavedMeal {
  const factory SavedMeal({
    required String id,
    required String userId,
    required String name,
    required double totalCalories,
    required double totalProtein,
    required double totalCarbs,
    required double totalFat,
    required List<SavedMealItem> items,
  }) = _SavedMeal;

}

@freezed
abstract class SavedMealItem with _$SavedMealItem {
  const factory SavedMealItem({
    required String id,
    required String savedMealId,
    required String name,
    required double estimatedGrams,
    required double calories,
    required double protein,
    required double carbs,
    required double fat,
  }) = _SavedMealItem;

}

