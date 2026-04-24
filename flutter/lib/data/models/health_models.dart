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
    required String dosage,
    required String frequency,
    required bool isActive,
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
    required NutritionLog nutritionLog,
    required double weight,
    required double bodyFat,
    String? notes,
  }) = _DailyHealthLog;
  const DailyHealthLog._();

  factory DailyHealthLog.fromJson(Map<String, dynamic> json) =>
      _$DailyHealthLogFromJson(json);
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
