import 'package:freezed_annotation/freezed_annotation.dart';

part 'health_models.freezed.dart';
part 'health_models.g.dart';

@Freezed(copyWith: true)
sealed class NutritionLog with _$NutritionLog {
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
  const NutritionLog._();

  factory NutritionLog.fromJson(Map<String, dynamic> json) =>
      _$NutritionLogFromJson(json);
}

@Freezed(copyWith: true)
sealed class FoodItem with _$FoodItem {
  const factory FoodItem({
    required int id,
    required String name,
    required double calories,
    required double protein,
    required double carbs,
    required double fat,
    required double servingSize,
    String? barcode,
  }) = _FoodItem;
  const FoodItem._();

  factory FoodItem.fromJson(Map<String, dynamic> json) =>
      _$FoodItemFromJson(json);
}

@Freezed(copyWith: true)
sealed class Supplement with _$Supplement {
  const factory Supplement({
    required int id,
    required String name,
    @JsonKey(name: 'amount') @Default('') String amount,
    @JsonKey(name: 'unit') @Default('mg') String unit,
    @JsonKey(name: 'timeOfDay') @Default('MORNING') String timeOfDay,
    @JsonKey(name: 'daysOfWeek') @Default('[]') String daysOfWeek,
    @Default(true) bool isActive,
    @JsonKey(name: 'stackId') int? stackId,
    @Default(0) int order,
    @JsonKey(name: 'dosage') @Default('') String dosage,
    @JsonKey(name: 'frequency') @Default('Daily') String frequency,
  }) = _Supplement;
  const Supplement._();

  factory Supplement.fromJson(Map<String, dynamic> json) =>
      _$SupplementFromJson(json);
}

@Freezed(copyWith: true)
sealed class SupplementStack with _$SupplementStack {
  const factory SupplementStack({
    required int id,
    required String name,
    required List<Supplement> supplements,
    required bool isActive,
  }) = _SupplementStack;
  const SupplementStack._();

  factory SupplementStack.fromJson(Map<String, dynamic> json) =>
      _$SupplementStackFromJson(json);
}

@Freezed(copyWith: true)
sealed class DailyHealthLog with _$DailyHealthLog {
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
  const DailyHealthLog._();

  factory DailyHealthLog.fromJson(Map<String, dynamic> json) =>
      _$DailyHealthLogFromJson(json);
}

@Freezed(copyWith: true)
sealed class SupplementLog with _$SupplementLog {
  const factory SupplementLog({
    required String supplementId,
    required DateTime date,
    @Default(false) bool taken,
  }) = _SupplementLog;
  const SupplementLog._();

  factory SupplementLog.fromJson(Map<String, dynamic> json) =>
      _$SupplementLogFromJson(json);
}

@Freezed(copyWith: true)
sealed class FoodLogEntry with _$FoodLogEntry {
  const factory FoodLogEntry({
    @Default('') String id,
    required String mealType,
    required String name,
    double? quantity,
    double? calories,
    double? protein,
    double? carbs,
    double? fats,
    String? foodItemId,
  }) = _FoodLogEntry;
  const FoodLogEntry._();

  factory FoodLogEntry.fromJson(Map<String, dynamic> json) =>
      _$FoodLogEntryFromJson(json);
}

@Freezed(copyWith: true)
sealed class DailyHealthMeta with _$DailyHealthMeta {
  const factory DailyHealthMeta({
    @Default(false) bool hasStepHistory,
  }) = _DailyHealthMeta;
  const DailyHealthMeta._();

  factory DailyHealthMeta.fromJson(Map<String, dynamic> json) =>
      _$DailyHealthMetaFromJson(json);
}

@Freezed(copyWith: true)
sealed class FastingSession with _$FastingSession {
  const factory FastingSession({
    required int id,
    required DateTime startTime,
    DateTime? endTime,
    required int duration,
    required bool isActive,
  }) = _FastingSession;
  const FastingSession._();

  factory FastingSession.fromJson(Map<String, dynamic> json) =>
      _$FastingSessionFromJson(json);
}

@Freezed(copyWith: true)
sealed class BodyMeasurement with _$BodyMeasurement {
  const factory BodyMeasurement({
    required int id,
    required DateTime date,
    required double weight,
    required double bodyFat,
    double? chest,
    double? waist,
    double? hips,
    String? notes,
  }) = _BodyMeasurement;
  const BodyMeasurement._();

  factory BodyMeasurement.fromJson(Map<String, dynamic> json) =>
      _$BodyMeasurementFromJson(json);
}

class NutritionTargets {
  const NutritionTargets({
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.water,
    this.proteinPercent = 30,
    this.carbsPercent = 40,
    this.fatsPercent = 30,
    this.waterGoalMl = 2000,
    this.exerciseCalorieFactor = 0.5,
    this.exerciseCalorieSource = 'strava',
  });

  factory NutritionTargets.fromJson(Map<String, dynamic> json) => NutritionTargets(
        calories: (json['dailyCalories'] ?? json['calories'] ?? 2500) as int,
        protein: (json['protein'] ?? 0) as int,
        carbs: (json['carbs'] ?? 0) as int,
        fat: (json['fat'] ?? 0) as int,
        water: ((json['waterGoalMl'] ?? json['water'] ?? 2000) as num).toDouble(),
        proteinPercent: ((json['proteinPercent'] ?? 30) as num).toDouble(),
        carbsPercent: ((json['carbsPercent'] ?? 40) as num).toDouble(),
        fatsPercent: ((json['fatsPercent'] ?? 30) as num).toDouble(),
        waterGoalMl: (json['waterGoalMl'] ?? 2000) as int,
        exerciseCalorieFactor: ((json['exerciseCalorieFactor'] ?? 0.5) as num).toDouble(),
        exerciseCalorieSource: (json['exerciseCalorieSource'] ?? 'strava') as String,
      );

  final int calories;
  final int protein;
  final int carbs;
  final int fat;
  final double water;
  final double proteinPercent;
  final double carbsPercent;
  final double fatsPercent;
  final int waterGoalMl;
  final double exerciseCalorieFactor;
  final String exerciseCalorieSource;

  Map<String, dynamic> toJson() => {
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
        'water': water,
      };

  NutritionTargets copyWith({
    int? calories,
    int? protein,
    int? carbs,
    int? fat,
    double? water,
    double? proteinPercent,
    double? carbsPercent,
    double? fatsPercent,
    int? waterGoalMl,
    double? exerciseCalorieFactor,
    String? exerciseCalorieSource,
  }) {
    return NutritionTargets(
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      water: water ?? this.water,
      proteinPercent: proteinPercent ?? this.proteinPercent,
      carbsPercent: carbsPercent ?? this.carbsPercent,
      fatsPercent: fatsPercent ?? this.fatsPercent,
      waterGoalMl: waterGoalMl ?? this.waterGoalMl,
      exerciseCalorieFactor: exerciseCalorieFactor ?? this.exerciseCalorieFactor,
      exerciseCalorieSource: exerciseCalorieSource ?? this.exerciseCalorieSource,
    );
  }

  NutritionTargets withComputedGrams() => NutritionTargets(
        calories: calories,
        protein: ((calories * proteinPercent / 100) / 4).round(),
        carbs: ((calories * carbsPercent / 100) / 4).round(),
        fat: ((calories * fatsPercent / 100) / 9).round(),
        water: water,
        proteinPercent: proteinPercent,
        carbsPercent: carbsPercent,
        fatsPercent: fatsPercent,
        waterGoalMl: waterGoalMl,
        exerciseCalorieFactor: exerciseCalorieFactor,
        exerciseCalorieSource: exerciseCalorieSource,
      );
}

@Freezed(copyWith: true)
sealed class NutritionAnalytics with _$NutritionAnalytics {
  const factory NutritionAnalytics({
    @Default(0) double macroAdherenceScore,
    @Default([]) List<DailyNutrition> dailyData,
    @Default([]) List<MicronutrientSummary> micronutrients,
  }) = _NutritionAnalytics;
  const NutritionAnalytics._();

  factory NutritionAnalytics.fromJson(Map<String, dynamic> json) =>
      _$NutritionAnalyticsFromJson(json);
}

@Freezed(copyWith: true)
sealed class DailyNutrition with _$DailyNutrition {
  const factory DailyNutrition({
    required DateTime date,
    @Default(0) double calories,
    @Default(0) double protein,
    @Default(0) double carbs,
    @Default(0) double fats,
  }) = _DailyNutrition;
  const DailyNutrition._();

  factory DailyNutrition.fromJson(Map<String, dynamic> json) =>
      _$DailyNutritionFromJson(json);
}

@Freezed(copyWith: true)
sealed class MicronutrientSummary with _$MicronutrientSummary {
  const factory MicronutrientSummary({
    required String name,
    @Default(0) double amount,
    @Default('') String unit,
    @Default(0) double dailyValuePercent,
  }) = _MicronutrientSummary;
  const MicronutrientSummary._();

  factory MicronutrientSummary.fromJson(Map<String, dynamic> json) =>
      _$MicronutrientSummaryFromJson(json);
}

@Freezed(copyWith: true)
sealed class SupplementAnalytics with _$SupplementAnalytics {
  const factory SupplementAnalytics({
    @Default([]) List<SupplementAdherence> supplements,
  }) = _SupplementAnalytics;
  const SupplementAnalytics._();

  factory SupplementAnalytics.fromJson(Map<String, dynamic> json) =>
      _$SupplementAnalyticsFromJson(json);
}

@Freezed(copyWith: true)
sealed class SupplementAdherence with _$SupplementAdherence {
  const factory SupplementAdherence({
    required String name,
    @Default(0) double adherencePercent,
    @Default(0) int daysTaken,
    @Default(0) int totalDays,
  }) = _SupplementAdherence;
  const SupplementAdherence._();

  factory SupplementAdherence.fromJson(Map<String, dynamic> json) =>
      _$SupplementAdherenceFromJson(json);
}

@Freezed(copyWith: true)
sealed class HealthHistory with _$HealthHistory {
  const factory HealthHistory({
    @Default([]) List<HealthHistoryPoint> steps,
    @Default([]) List<HealthHistoryPoint> weight,
  }) = _HealthHistory;
  const HealthHistory._();

  factory HealthHistory.fromJson(Map<String, dynamic> json) =>
      _$HealthHistoryFromJson(json);
}

@Freezed(copyWith: true)
sealed class HealthHistoryPoint with _$HealthHistoryPoint {
  const factory HealthHistoryPoint({
    required DateTime date,
    required double value,
  }) = _HealthHistoryPoint;
  const HealthHistoryPoint._();

  factory HealthHistoryPoint.fromJson(Map<String, dynamic> json) =>
      _$HealthHistoryPointFromJson(json);
}
