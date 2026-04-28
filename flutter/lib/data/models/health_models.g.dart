// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_NutritionLog _$NutritionLogFromJson(Map<String, dynamic> json) =>
    _NutritionLog(
      id: (json['id'] as num).toInt(),
      date: DateTime.parse(json['date'] as String),
      calories: (json['calories'] as num).toDouble(),
      protein: (json['protein'] as num).toDouble(),
      carbs: (json['carbs'] as num).toDouble(),
      fat: (json['fat'] as num).toDouble(),
      water: (json['water'] as num).toDouble(),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$NutritionLogToJson(_NutritionLog instance) =>
    <String, dynamic>{
      'id': instance.id,
      'date': instance.date.toIso8601String(),
      'calories': instance.calories,
      'protein': instance.protein,
      'carbs': instance.carbs,
      'fat': instance.fat,
      'water': instance.water,
      'notes': instance.notes,
      'createdAt': instance.createdAt.toIso8601String(),
    };

_FoodItem _$FoodItemFromJson(Map<String, dynamic> json) => _FoodItem(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  calories: (json['calories'] as num).toDouble(),
  protein: (json['protein'] as num).toDouble(),
  carbs: (json['carbs'] as num).toDouble(),
  fat: (json['fat'] as num).toDouble(),
  servingSize: (json['servingSize'] as num).toDouble(),
  barcode: json['barcode'] as String?,
);

Map<String, dynamic> _$FoodItemToJson(_FoodItem instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'calories': instance.calories,
  'protein': instance.protein,
  'carbs': instance.carbs,
  'fat': instance.fat,
  'servingSize': instance.servingSize,
  'barcode': instance.barcode,
};

_Supplement _$SupplementFromJson(Map<String, dynamic> json) => _Supplement(
  id: (json['id'] as num).toInt(),
  serverId: json['serverId'] as String?,
  name: json['name'] as String,
  amount: json['amount'] == null ? 0 : _parseSupplementAmount(json['amount']),
  unit: json['unit'] as String? ?? 'mg',
  timeOfDay: json['timeOfDay'] as String? ?? 'MORNING',
  daysOfWeek: json['daysOfWeek'] == null
      ? const []
      : _parseDaysOfWeek(json['daysOfWeek']),
  isActive: json['isActive'] as bool? ?? true,
  stackId: json['stackId'] as String?,
  order: (json['order'] as num?)?.toInt() ?? 0,
  dosage: json['dosage'] as String? ?? '',
  frequency: json['frequency'] as String? ?? 'Daily',
);

Map<String, dynamic> _$SupplementToJson(_Supplement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'serverId': instance.serverId,
      'name': instance.name,
      'amount': instance.amount,
      'unit': instance.unit,
      'timeOfDay': instance.timeOfDay,
      'daysOfWeek': _serializeDaysOfWeek(instance.daysOfWeek),
      'isActive': instance.isActive,
      'stackId': instance.stackId,
      'order': instance.order,
      'dosage': instance.dosage,
      'frequency': instance.frequency,
    };

_SupplementStack _$SupplementStackFromJson(Map<String, dynamic> json) =>
    _SupplementStack(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      supplements: (json['supplements'] as List<dynamic>)
          .map((e) => Supplement.fromJson(e as Map<String, dynamic>))
          .toList(),
      isActive: json['isActive'] as bool,
    );

Map<String, dynamic> _$SupplementStackToJson(_SupplementStack instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'supplements': instance.supplements,
      'isActive': instance.isActive,
    };

_DailyHealthLog _$DailyHealthLogFromJson(Map<String, dynamic> json) =>
    _DailyHealthLog(
      id: (json['id'] as num).toInt(),
      date: DateTime.parse(json['date'] as String),
      steps: (json['steps'] as num?)?.toInt() ?? 0,
      weight: (json['weight'] as num?)?.toDouble(),
      waterIntake: (json['waterIntake'] as num?)?.toDouble() ?? 0,
      exerciseCalories: (json['exerciseCalories'] as num?)?.toInt() ?? 0,
      supplementLogs:
          (json['supplementLogs'] as List<dynamic>?)
              ?.map((e) => SupplementLog.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      foodLogs:
          (json['foodLogs'] as List<dynamic>?)
              ?.map((e) => FoodLogEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      meta: json['meta'] == null
          ? null
          : DailyHealthMeta.fromJson(json['meta'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$DailyHealthLogToJson(_DailyHealthLog instance) =>
    <String, dynamic>{
      'id': instance.id,
      'date': instance.date.toIso8601String(),
      'steps': instance.steps,
      'weight': instance.weight,
      'waterIntake': instance.waterIntake,
      'exerciseCalories': instance.exerciseCalories,
      'supplementLogs': instance.supplementLogs,
      'foodLogs': instance.foodLogs,
      'meta': instance.meta,
    };

_SupplementLog _$SupplementLogFromJson(Map<String, dynamic> json) =>
    _SupplementLog(
      supplementId: json['supplementId'] as String,
      date: DateTime.parse(json['date'] as String),
      taken: json['taken'] as bool? ?? false,
    );

Map<String, dynamic> _$SupplementLogToJson(_SupplementLog instance) =>
    <String, dynamic>{
      'supplementId': instance.supplementId,
      'date': instance.date.toIso8601String(),
      'taken': instance.taken,
    };

_FoodLogEntry _$FoodLogEntryFromJson(Map<String, dynamic> json) =>
    _FoodLogEntry(
      id: json['id'] as String? ?? '',
      mealType: json['mealType'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num?)?.toDouble(),
      calories: (json['calories'] as num?)?.toDouble(),
      protein: (json['protein'] as num?)?.toDouble(),
      carbs: (json['carbs'] as num?)?.toDouble(),
      fats: (json['fats'] as num?)?.toDouble(),
      foodItemId: json['foodItemId'] as String?,
    );

Map<String, dynamic> _$FoodLogEntryToJson(_FoodLogEntry instance) =>
    <String, dynamic>{
      'id': instance.id,
      'mealType': instance.mealType,
      'name': instance.name,
      'quantity': instance.quantity,
      'calories': instance.calories,
      'protein': instance.protein,
      'carbs': instance.carbs,
      'fats': instance.fats,
      'foodItemId': instance.foodItemId,
    };

_DailyHealthMeta _$DailyHealthMetaFromJson(Map<String, dynamic> json) =>
    _DailyHealthMeta(hasStepHistory: json['hasStepHistory'] as bool? ?? false);

Map<String, dynamic> _$DailyHealthMetaToJson(_DailyHealthMeta instance) =>
    <String, dynamic>{'hasStepHistory': instance.hasStepHistory};

_FastingSession _$FastingSessionFromJson(Map<String, dynamic> json) =>
    _FastingSession(
      id: (json['id'] as num).toInt(),
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] == null
          ? null
          : DateTime.parse(json['endTime'] as String),
      duration: (json['duration'] as num).toInt(),
      isActive: json['isActive'] as bool,
    );

Map<String, dynamic> _$FastingSessionToJson(_FastingSession instance) =>
    <String, dynamic>{
      'id': instance.id,
      'startTime': instance.startTime.toIso8601String(),
      'endTime': instance.endTime?.toIso8601String(),
      'duration': instance.duration,
      'isActive': instance.isActive,
    };

_BodyMeasurement _$BodyMeasurementFromJson(Map<String, dynamic> json) =>
    _BodyMeasurement(
      id: (json['id'] as num).toInt(),
      date: DateTime.parse(json['date'] as String),
      weight: (json['weight'] as num).toDouble(),
      bodyFat: (json['bodyFat'] as num).toDouble(),
      chest: (json['chest'] as num?)?.toDouble(),
      waist: (json['waist'] as num?)?.toDouble(),
      hips: (json['hips'] as num?)?.toDouble(),
      arms: (json['arms'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$BodyMeasurementToJson(_BodyMeasurement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'date': instance.date.toIso8601String(),
      'weight': instance.weight,
      'bodyFat': instance.bodyFat,
      'chest': instance.chest,
      'waist': instance.waist,
      'hips': instance.hips,
      'arms': instance.arms,
      'notes': instance.notes,
    };

_NutritionAnalytics _$NutritionAnalyticsFromJson(
  Map<String, dynamic> json,
) => _NutritionAnalytics(
  macroAdherenceScore: (json['macroAdherenceScore'] as num?)?.toDouble() ?? 0,
  dailyData:
      (json['dailyData'] as List<dynamic>?)
          ?.map((e) => DailyNutrition.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  micronutrients:
      (json['micronutrients'] as List<dynamic>?)
          ?.map((e) => MicronutrientSummary.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
);

Map<String, dynamic> _$NutritionAnalyticsToJson(_NutritionAnalytics instance) =>
    <String, dynamic>{
      'macroAdherenceScore': instance.macroAdherenceScore,
      'dailyData': instance.dailyData,
      'micronutrients': instance.micronutrients,
    };

_DailyNutrition _$DailyNutritionFromJson(Map<String, dynamic> json) =>
    _DailyNutrition(
      date: DateTime.parse(json['date'] as String),
      calories: (json['calories'] as num?)?.toDouble() ?? 0,
      protein: (json['protein'] as num?)?.toDouble() ?? 0,
      carbs: (json['carbs'] as num?)?.toDouble() ?? 0,
      fats: (json['fats'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$DailyNutritionToJson(_DailyNutrition instance) =>
    <String, dynamic>{
      'date': instance.date.toIso8601String(),
      'calories': instance.calories,
      'protein': instance.protein,
      'carbs': instance.carbs,
      'fats': instance.fats,
    };

_MicronutrientSummary _$MicronutrientSummaryFromJson(
  Map<String, dynamic> json,
) => _MicronutrientSummary(
  name: json['name'] as String,
  amount: (json['amount'] as num?)?.toDouble() ?? 0,
  unit: json['unit'] as String? ?? '',
  dailyValuePercent: (json['dailyValuePercent'] as num?)?.toDouble() ?? 0,
);

Map<String, dynamic> _$MicronutrientSummaryToJson(
  _MicronutrientSummary instance,
) => <String, dynamic>{
  'name': instance.name,
  'amount': instance.amount,
  'unit': instance.unit,
  'dailyValuePercent': instance.dailyValuePercent,
};

_SupplementAnalytics _$SupplementAnalyticsFromJson(Map<String, dynamic> json) =>
    _SupplementAnalytics(
      overallAdherence: (json['overallAdherence'] as num?)?.toDouble() ?? 0,
      avgDailyDoses: (json['avgDailyDoses'] as num?)?.toDouble() ?? 0,
      totalSupplements: (json['totalSupplements'] as num?)?.toInt() ?? 0,
      totalScheduled: (json['totalScheduled'] as num?)?.toInt() ?? 0,
      totalTaken: (json['totalTaken'] as num?)?.toInt() ?? 0,
      totalDays: (json['totalDays'] as num?)?.toInt() ?? 0,
      supplements:
          (json['supplements'] as List<dynamic>?)
              ?.map(
                (e) => SupplementAdherence.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const [],
    );

Map<String, dynamic> _$SupplementAnalyticsToJson(
  _SupplementAnalytics instance,
) => <String, dynamic>{
  'overallAdherence': instance.overallAdherence,
  'avgDailyDoses': instance.avgDailyDoses,
  'totalSupplements': instance.totalSupplements,
  'totalScheduled': instance.totalScheduled,
  'totalTaken': instance.totalTaken,
  'totalDays': instance.totalDays,
  'supplements': instance.supplements,
};

_SupplementAdherence _$SupplementAdherenceFromJson(Map<String, dynamic> json) =>
    _SupplementAdherence(
      name: json['name'] as String,
      adherencePercent: (json['adherencePercent'] as num?)?.toDouble() ?? 0,
      daysTaken: (json['daysTaken'] as num?)?.toInt() ?? 0,
      totalDays: (json['totalDays'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$SupplementAdherenceToJson(
  _SupplementAdherence instance,
) => <String, dynamic>{
  'name': instance.name,
  'adherencePercent': instance.adherencePercent,
  'daysTaken': instance.daysTaken,
  'totalDays': instance.totalDays,
};

_HealthHistory _$HealthHistoryFromJson(
  Map<String, dynamic> json,
) => _HealthHistory(
  steps:
      (json['steps'] as List<dynamic>?)
          ?.map((e) => HealthHistoryPoint.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  weight:
      (json['weight'] as List<dynamic>?)
          ?.map((e) => HealthHistoryPoint.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
);

Map<String, dynamic> _$HealthHistoryToJson(_HealthHistory instance) =>
    <String, dynamic>{'steps': instance.steps, 'weight': instance.weight};

_HealthHistoryPoint _$HealthHistoryPointFromJson(Map<String, dynamic> json) =>
    _HealthHistoryPoint(
      date: DateTime.parse(json['date'] as String),
      value: (json['value'] as num).toDouble(),
    );

Map<String, dynamic> _$HealthHistoryPointToJson(_HealthHistoryPoint instance) =>
    <String, dynamic>{
      'date': instance.date.toIso8601String(),
      'value': instance.value,
    };
