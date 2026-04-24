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
  name: json['name'] as String,
  dosage: json['dosage'] as String,
  frequency: json['frequency'] as String,
  isActive: json['isActive'] as bool,
);

Map<String, dynamic> _$SupplementToJson(_Supplement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'dosage': instance.dosage,
      'frequency': instance.frequency,
      'isActive': instance.isActive,
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
      nutritionLog: NutritionLog.fromJson(
        json['nutritionLog'] as Map<String, dynamic>,
      ),
      weight: (json['weight'] as num).toDouble(),
      bodyFat: (json['bodyFat'] as num).toDouble(),
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$DailyHealthLogToJson(_DailyHealthLog instance) =>
    <String, dynamic>{
      'id': instance.id,
      'date': instance.date.toIso8601String(),
      'nutritionLog': instance.nutritionLog,
      'weight': instance.weight,
      'bodyFat': instance.bodyFat,
      'notes': instance.notes,
    };

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
      'notes': instance.notes,
    };
