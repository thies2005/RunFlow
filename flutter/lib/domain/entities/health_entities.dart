import 'package:flutter/foundation.dart';

class NutritionLog {
  const NutritionLog({
    required this.id,
    required this.date,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.water,
    this.notes,
    required this.createdAt,
  });

  final int id;
  final DateTime date;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final double water;
  final String? notes;
  final DateTime createdAt;

  NutritionLog copyWith({
    int? id,
    DateTime? date,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    double? water,
    String? notes,
    DateTime? createdAt,
  }) {
    return NutritionLog(
      id: id ?? this.id,
      date: date ?? this.date,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      water: water ?? this.water,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NutritionLog &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          date == other.date &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat &&
          water == other.water &&
          notes == other.notes &&
          createdAt == other.createdAt;

  @override
  int get hashCode => Object.hashAll([
    id,
    date,
    calories,
    protein,
    carbs,
    fat,
    water,
    notes,
    createdAt,
  ]);
}

class FoodItem {
  const FoodItem({
    required this.id,
    required this.name,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.servingSize,
    this.brand,
    this.barcode,
    this.favoriteId,
  });

  final int id;
  final String name;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final double servingSize;
  final String? brand;
  final String? barcode;
  final String? favoriteId;

  bool get isFavorite => favoriteId != null;

  FoodItem copyWith({
    int? id,
    String? name,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    double? servingSize,
    String? brand,
    String? barcode,
    String? favoriteId,
  }) {
    return FoodItem(
      id: id ?? this.id,
      name: name ?? this.name,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      servingSize: servingSize ?? this.servingSize,
      brand: brand ?? this.brand,
      barcode: barcode ?? this.barcode,
      favoriteId: favoriteId ?? this.favoriteId,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FoodItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat &&
          servingSize == other.servingSize &&
          brand == other.brand &&
          barcode == other.barcode &&
          favoriteId == other.favoriteId;

  @override
  int get hashCode => Object.hashAll([
    id,
    name,
    calories,
    protein,
    carbs,
    fat,
    servingSize,
    brand,
    barcode,
    favoriteId,
  ]);
}

class Supplement {
  const Supplement({
    required this.id,
    this.serverId,
    required this.name,
    this.amount = 0,
    this.unit = 'mg',
    this.timeOfDay = 'MORNING',
    this.daysOfWeek = const [],
    this.isActive = true,
    this.stackId,
    this.order = 0,
    this.dosage = '',
    this.frequency = 'Daily',
  });

  final int id;
  final String? serverId;
  final String name;
  final double amount;
  final String unit;
  final String timeOfDay;
  final List<int> daysOfWeek;
  final bool isActive;
  final String? stackId;
  final int order;
  final String dosage;
  final String frequency;

  String get uniqueId => serverId ?? id.toString();

  Supplement copyWith({
    int? id,
    String? serverId,
    String? name,
    double? amount,
    String? unit,
    String? timeOfDay,
    List<int>? daysOfWeek,
    bool? isActive,
    String? stackId,
    int? order,
    String? dosage,
    String? frequency,
  }) {
    return Supplement(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      name: name ?? this.name,
      amount: amount ?? this.amount,
      unit: unit ?? this.unit,
      timeOfDay: timeOfDay ?? this.timeOfDay,
      daysOfWeek: daysOfWeek ?? this.daysOfWeek,
      isActive: isActive ?? this.isActive,
      stackId: stackId ?? this.stackId,
      order: order ?? this.order,
      dosage: dosage ?? this.dosage,
      frequency: frequency ?? this.frequency,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Supplement &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          serverId == other.serverId &&
          name == other.name &&
          amount == other.amount &&
          unit == other.unit &&
          timeOfDay == other.timeOfDay &&
          listEquals(daysOfWeek, other.daysOfWeek) &&
          isActive == other.isActive &&
          stackId == other.stackId &&
          order == other.order &&
          dosage == other.dosage &&
          frequency == other.frequency;

  @override
  int get hashCode => Object.hash(
    id,
    serverId,
    name,
    amount,
    unit,
    timeOfDay,
    Object.hashAll(daysOfWeek),
    isActive,
    stackId,
    order,
    dosage,
    frequency,
  );
}

class SupplementStack {
  const SupplementStack({
    required this.id,
    required this.name,
    required this.supplements,
    required this.isActive,
  });

  final int id;
  final String name;
  final List<Supplement> supplements;
  final bool isActive;

  SupplementStack copyWith({
    int? id,
    String? name,
    List<Supplement>? supplements,
    bool? isActive,
  }) {
    return SupplementStack(
      id: id ?? this.id,
      name: name ?? this.name,
      supplements: supplements ?? this.supplements,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SupplementStack &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          listEquals(supplements, other.supplements) &&
          isActive == other.isActive;

  @override
  int get hashCode =>
      Object.hash(id, name, Object.hashAll(supplements), isActive);
}

class DailyHealthLog {
  const DailyHealthLog({
    required this.id,
    required this.date,
    this.steps = 0,
    this.weight,
    this.waterIntake = 0,
    this.exerciseCalories = 0,
    this.supplementLogs = const [],
    this.foodLogs = const [],
    this.meta,
  });

  final int id;
  final DateTime date;
  final int steps;
  final double? weight;
  final double waterIntake;
  final int exerciseCalories;
  final List<SupplementLog> supplementLogs;
  final List<FoodLogEntry> foodLogs;
  final DailyHealthMeta? meta;

  DailyHealthLog copyWith({
    int? id,
    DateTime? date,
    int? steps,
    double? weight,
    double? waterIntake,
    int? exerciseCalories,
    List<SupplementLog>? supplementLogs,
    List<FoodLogEntry>? foodLogs,
    DailyHealthMeta? meta,
  }) {
    return DailyHealthLog(
      id: id ?? this.id,
      date: date ?? this.date,
      steps: steps ?? this.steps,
      weight: weight ?? this.weight,
      waterIntake: waterIntake ?? this.waterIntake,
      exerciseCalories: exerciseCalories ?? this.exerciseCalories,
      supplementLogs: supplementLogs ?? this.supplementLogs,
      foodLogs: foodLogs ?? this.foodLogs,
      meta: meta ?? this.meta,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DailyHealthLog &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          date == other.date &&
          steps == other.steps &&
          weight == other.weight &&
          waterIntake == other.waterIntake &&
          exerciseCalories == other.exerciseCalories &&
          listEquals(supplementLogs, other.supplementLogs) &&
          listEquals(foodLogs, other.foodLogs) &&
          meta == other.meta;

  @override
  int get hashCode => Object.hash(
    id,
    date,
    steps,
    weight,
    waterIntake,
    exerciseCalories,
    Object.hashAll(supplementLogs),
    Object.hashAll(foodLogs),
    meta,
  );
}

class SupplementLog {
  const SupplementLog({
    required this.supplementId,
    required this.date,
    this.taken = false,
  });

  final String supplementId;
  final DateTime date;
  final bool taken;

  SupplementLog copyWith({String? supplementId, DateTime? date, bool? taken}) {
    return SupplementLog(
      supplementId: supplementId ?? this.supplementId,
      date: date ?? this.date,
      taken: taken ?? this.taken,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SupplementLog &&
          runtimeType == other.runtimeType &&
          supplementId == other.supplementId &&
          date == other.date &&
          taken == other.taken;

  @override
  int get hashCode => Object.hash(supplementId, date, taken);
}

class FoodLogEntry {
  const FoodLogEntry({
    this.id = '',
    required this.mealType,
    required this.name,
    this.quantity,
    this.calories,
    this.protein,
    this.carbs,
    this.fat,
    this.foodItemId,
  });

  final String id;
  final String mealType;
  final String name;
  final double? quantity;
  final double? calories;
  final double? protein;
  final double? carbs;
  final double? fat;
  final String? foodItemId;

  FoodLogEntry copyWith({
    String? id,
    String? mealType,
    String? name,
    double? quantity,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    String? foodItemId,
  }) {
    return FoodLogEntry(
      id: id ?? this.id,
      mealType: mealType ?? this.mealType,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      foodItemId: foodItemId ?? this.foodItemId,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FoodLogEntry &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          mealType == other.mealType &&
          name == other.name &&
          quantity == other.quantity &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat &&
          foodItemId == other.foodItemId;

  @override
  int get hashCode => Object.hashAll([
    id,
    mealType,
    name,
    quantity,
    calories,
    protein,
    carbs,
    fat,
    foodItemId,
  ]);
}

class DailyHealthMeta {
  const DailyHealthMeta({this.hasStepHistory = false});

  final bool hasStepHistory;

  DailyHealthMeta copyWith({bool? hasStepHistory}) {
    return DailyHealthMeta(
      hasStepHistory: hasStepHistory ?? this.hasStepHistory,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DailyHealthMeta &&
          runtimeType == other.runtimeType &&
          hasStepHistory == other.hasStepHistory;

  @override
  int get hashCode => hasStepHistory.hashCode;
}

class FastingSession {
  const FastingSession({
    required this.id,
    required this.startTime,
    this.endTime,
    required this.duration,
    required this.isActive,
  });

  final int id;
  final DateTime startTime;
  final DateTime? endTime;
  final int duration;
  final bool isActive;

  FastingSession copyWith({
    int? id,
    DateTime? startTime,
    DateTime? endTime,
    int? duration,
    bool? isActive,
  }) {
    return FastingSession(
      id: id ?? this.id,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      duration: duration ?? this.duration,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FastingSession &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          startTime == other.startTime &&
          endTime == other.endTime &&
          duration == other.duration &&
          isActive == other.isActive;

  @override
  int get hashCode => Object.hash(id, startTime, endTime, duration, isActive);
}

class FastingSchedule {
  const FastingSchedule({
    this.fastingStartHour = 20,
    this.fastingStartMinute = 0,
    this.fastingEndHour = 12,
    this.fastingEndMinute = 0,
    this.targetHours = 16.0,
    this.isEnabled = false,
  });

  factory FastingSchedule.fromJson(Map<String, dynamic> json) =>
      FastingSchedule(
        fastingStartHour: json['fastingStartHour'] as int? ?? 20,
        fastingStartMinute: json['fastingStartMinute'] as int? ?? 0,
        fastingEndHour: json['fastingEndHour'] as int? ?? 12,
        fastingEndMinute: json['fastingEndMinute'] as int? ?? 0,
        targetHours: (json['targetHours'] as num?)?.toDouble() ?? 16.0,
        isEnabled: json['isEnabled'] as bool? ?? false,
      );

  final int fastingStartHour;
  final int fastingStartMinute;
  final int fastingEndHour;
  final int fastingEndMinute;
  final double targetHours;
  final bool isEnabled;

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

  FastingSchedule copyWith({
    int? fastingStartHour,
    int? fastingStartMinute,
    int? fastingEndHour,
    int? fastingEndMinute,
    double? targetHours,
    bool? isEnabled,
  }) {
    return FastingSchedule(
      fastingStartHour: fastingStartHour ?? this.fastingStartHour,
      fastingStartMinute: fastingStartMinute ?? this.fastingStartMinute,
      fastingEndHour: fastingEndHour ?? this.fastingEndHour,
      fastingEndMinute: fastingEndMinute ?? this.fastingEndMinute,
      targetHours: targetHours ?? this.targetHours,
      isEnabled: isEnabled ?? this.isEnabled,
    );
  }

  Map<String, dynamic> toJson() => {
    'fastingStartHour': fastingStartHour,
    'fastingStartMinute': fastingStartMinute,
    'fastingEndHour': fastingEndHour,
    'fastingEndMinute': fastingEndMinute,
    'targetHours': targetHours,
    'isEnabled': isEnabled,
  };
}

class BodyMeasurement {
  const BodyMeasurement({
    required this.id,
    required this.date,
    required this.weight,
    required this.bodyFat,
    this.chest,
    this.waist,
    this.hips,
    this.arms,
    this.notes,
  });

  final int id;
  final DateTime date;
  final double weight;
  final double bodyFat;
  final double? chest;
  final double? waist;
  final double? hips;
  final double? arms;
  final String? notes;

  BodyMeasurement copyWith({
    int? id,
    DateTime? date,
    double? weight,
    double? bodyFat,
    double? chest,
    double? waist,
    double? hips,
    double? arms,
    String? notes,
  }) {
    return BodyMeasurement(
      id: id ?? this.id,
      date: date ?? this.date,
      weight: weight ?? this.weight,
      bodyFat: bodyFat ?? this.bodyFat,
      chest: chest ?? this.chest,
      waist: waist ?? this.waist,
      hips: hips ?? this.hips,
      arms: arms ?? this.arms,
      notes: notes ?? this.notes,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BodyMeasurement &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          date == other.date &&
          weight == other.weight &&
          bodyFat == other.bodyFat &&
          chest == other.chest &&
          waist == other.waist &&
          hips == other.hips &&
          arms == other.arms &&
          notes == other.notes;

  @override
  int get hashCode => Object.hashAll([
    id,
    date,
    weight,
    bodyFat,
    chest,
    waist,
    hips,
    arms,
    notes,
  ]);
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
    this.fatPercent = 30,
    this.waterGoalMl = 2500,
    this.exerciseCalorieFactor = 0.5,
    this.exerciseCalorieSource = 'strava',
    this.waterTrackingEnabled = false,
  });

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

  final int calories;
  final int protein;
  final int carbs;
  final int fat;
  final double water;
  final double proteinPercent;
  final double carbsPercent;
  final double fatPercent;
  final int waterGoalMl;
  final double exerciseCalorieFactor;
  final String exerciseCalorieSource;
  final bool waterTrackingEnabled;

  NutritionTargets copyWith({
    int? calories,
    int? protein,
    int? carbs,
    int? fat,
    double? water,
    double? proteinPercent,
    double? carbsPercent,
    double? fatPercent,
    int? waterGoalMl,
    double? exerciseCalorieFactor,
    String? exerciseCalorieSource,
    bool? waterTrackingEnabled,
  }) {
    return NutritionTargets(
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      water: water ?? this.water,
      proteinPercent: proteinPercent ?? this.proteinPercent,
      carbsPercent: carbsPercent ?? this.carbsPercent,
      fatPercent: fatPercent ?? this.fatPercent,
      waterGoalMl: waterGoalMl ?? this.waterGoalMl,
      exerciseCalorieFactor:
          exerciseCalorieFactor ?? this.exerciseCalorieFactor,
      exerciseCalorieSource:
          exerciseCalorieSource ?? this.exerciseCalorieSource,
      waterTrackingEnabled: waterTrackingEnabled ?? this.waterTrackingEnabled,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NutritionTargets &&
          runtimeType == other.runtimeType &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat &&
          water == other.water &&
          proteinPercent == other.proteinPercent &&
          carbsPercent == other.carbsPercent &&
          fatPercent == other.fatPercent &&
          waterGoalMl == other.waterGoalMl &&
          exerciseCalorieFactor == other.exerciseCalorieFactor &&
          exerciseCalorieSource == other.exerciseCalorieSource &&
          waterTrackingEnabled == other.waterTrackingEnabled;

  @override
  int get hashCode => Object.hashAll([
    calories,
    protein,
    carbs,
    fat,
    water,
    proteinPercent,
    carbsPercent,
    fatPercent,
    waterGoalMl,
    exerciseCalorieFactor,
    exerciseCalorieSource,
    waterTrackingEnabled,
  ]);
}

class NutritionAnalytics {
  const NutritionAnalytics({
    this.macroAdherenceScore = 0,
    this.dailyData = const [],
    this.micronutrients = const [],
  });

  final double macroAdherenceScore;
  final List<DailyNutrition> dailyData;
  final List<MicronutrientSummary> micronutrients;

  NutritionAnalytics copyWith({
    double? macroAdherenceScore,
    List<DailyNutrition>? dailyData,
    List<MicronutrientSummary>? micronutrients,
  }) {
    return NutritionAnalytics(
      macroAdherenceScore: macroAdherenceScore ?? this.macroAdherenceScore,
      dailyData: dailyData ?? this.dailyData,
      micronutrients: micronutrients ?? this.micronutrients,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NutritionAnalytics &&
          runtimeType == other.runtimeType &&
          macroAdherenceScore == other.macroAdherenceScore &&
          listEquals(dailyData, other.dailyData) &&
          listEquals(micronutrients, other.micronutrients);

  @override
  int get hashCode => Object.hash(
    macroAdherenceScore,
    Object.hashAll(dailyData),
    Object.hashAll(micronutrients),
  );
}

class DailyNutrition {
  const DailyNutrition({
    required this.date,
    this.calories = 0,
    this.protein = 0,
    this.carbs = 0,
    this.fat = 0,
  });

  final DateTime date;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;

  DailyNutrition copyWith({
    DateTime? date,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
  }) {
    return DailyNutrition(
      date: date ?? this.date,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DailyNutrition &&
          runtimeType == other.runtimeType &&
          date == other.date &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat;

  @override
  int get hashCode => Object.hash(date, calories, protein, carbs, fat);
}

class MicronutrientSummary {
  const MicronutrientSummary({
    required this.name,
    this.amount = 0,
    this.unit = '',
    this.dailyValuePercent = 0,
  });

  final String name;
  final double amount;
  final String unit;
  final double dailyValuePercent;

  MicronutrientSummary copyWith({
    String? name,
    double? amount,
    String? unit,
    double? dailyValuePercent,
  }) {
    return MicronutrientSummary(
      name: name ?? this.name,
      amount: amount ?? this.amount,
      unit: unit ?? this.unit,
      dailyValuePercent: dailyValuePercent ?? this.dailyValuePercent,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MicronutrientSummary &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          amount == other.amount &&
          unit == other.unit &&
          dailyValuePercent == other.dailyValuePercent;

  @override
  int get hashCode => Object.hash(name, amount, unit, dailyValuePercent);
}

class SupplementAnalytics {
  const SupplementAnalytics({
    this.overallAdherence = 0,
    this.avgDailyDoses = 0,
    this.totalSupplements = 0,
    this.totalScheduled = 0,
    this.totalTaken = 0,
    this.totalDays = 0,
    this.supplements = const [],
  });

  final double overallAdherence;
  final double avgDailyDoses;
  final int totalSupplements;
  final int totalScheduled;
  final int totalTaken;
  final int totalDays;
  final List<SupplementAdherence> supplements;

  SupplementAnalytics copyWith({
    double? overallAdherence,
    double? avgDailyDoses,
    int? totalSupplements,
    int? totalScheduled,
    int? totalTaken,
    int? totalDays,
    List<SupplementAdherence>? supplements,
  }) {
    return SupplementAnalytics(
      overallAdherence: overallAdherence ?? this.overallAdherence,
      avgDailyDoses: avgDailyDoses ?? this.avgDailyDoses,
      totalSupplements: totalSupplements ?? this.totalSupplements,
      totalScheduled: totalScheduled ?? this.totalScheduled,
      totalTaken: totalTaken ?? this.totalTaken,
      totalDays: totalDays ?? this.totalDays,
      supplements: supplements ?? this.supplements,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SupplementAnalytics &&
          runtimeType == other.runtimeType &&
          overallAdherence == other.overallAdherence &&
          avgDailyDoses == other.avgDailyDoses &&
          totalSupplements == other.totalSupplements &&
          totalScheduled == other.totalScheduled &&
          totalTaken == other.totalTaken &&
          totalDays == other.totalDays &&
          listEquals(supplements, other.supplements);

  @override
  int get hashCode => Object.hash(
    overallAdherence,
    avgDailyDoses,
    totalSupplements,
    totalScheduled,
    totalTaken,
    totalDays,
    Object.hashAll(supplements),
  );
}

class SupplementAdherence {
  const SupplementAdherence({
    required this.name,
    this.adherencePercent = 0,
    this.daysTaken = 0,
    this.totalDays = 0,
  });

  final String name;
  final double adherencePercent;
  final int daysTaken;
  final int totalDays;

  SupplementAdherence copyWith({
    String? name,
    double? adherencePercent,
    int? daysTaken,
    int? totalDays,
  }) {
    return SupplementAdherence(
      name: name ?? this.name,
      adherencePercent: adherencePercent ?? this.adherencePercent,
      daysTaken: daysTaken ?? this.daysTaken,
      totalDays: totalDays ?? this.totalDays,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SupplementAdherence &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          adherencePercent == other.adherencePercent &&
          daysTaken == other.daysTaken &&
          totalDays == other.totalDays;

  @override
  int get hashCode => Object.hash(name, adherencePercent, daysTaken, totalDays);
}

class HealthHistory {
  const HealthHistory({this.steps = const [], this.weight = const []});

  final List<HealthHistoryPoint> steps;
  final List<HealthHistoryPoint> weight;

  HealthHistory copyWith({
    List<HealthHistoryPoint>? steps,
    List<HealthHistoryPoint>? weight,
  }) {
    return HealthHistory(
      steps: steps ?? this.steps,
      weight: weight ?? this.weight,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HealthHistory &&
          runtimeType == other.runtimeType &&
          listEquals(steps, other.steps) &&
          listEquals(weight, other.weight);

  @override
  int get hashCode =>
      Object.hash(Object.hashAll(steps), Object.hashAll(weight));
}

class HealthHistoryPoint {
  const HealthHistoryPoint({required this.date, required this.value});

  final DateTime date;
  final double value;

  HealthHistoryPoint copyWith({DateTime? date, double? value}) {
    return HealthHistoryPoint(
      date: date ?? this.date,
      value: value ?? this.value,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HealthHistoryPoint &&
          runtimeType == other.runtimeType &&
          date == other.date &&
          value == other.value;

  @override
  int get hashCode => Object.hash(date, value);
}

class SavedMeal {
  const SavedMeal({
    required this.id,
    required this.userId,
    required this.name,
    required this.totalCalories,
    required this.totalProtein,
    required this.totalCarbs,
    required this.totalFat,
    required this.items,
  });

  final String id;
  final String userId;
  final String name;
  final double totalCalories;
  final double totalProtein;
  final double totalCarbs;
  final double totalFat;
  final List<SavedMealItem> items;

  SavedMeal copyWith({
    String? id,
    String? userId,
    String? name,
    double? totalCalories,
    double? totalProtein,
    double? totalCarbs,
    double? totalFat,
    List<SavedMealItem>? items,
  }) {
    return SavedMeal(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      totalCalories: totalCalories ?? this.totalCalories,
      totalProtein: totalProtein ?? this.totalProtein,
      totalCarbs: totalCarbs ?? this.totalCarbs,
      totalFat: totalFat ?? this.totalFat,
      items: items ?? this.items,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SavedMeal &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userId == other.userId &&
          name == other.name &&
          totalCalories == other.totalCalories &&
          totalProtein == other.totalProtein &&
          totalCarbs == other.totalCarbs &&
          totalFat == other.totalFat &&
          listEquals(items, other.items);

  @override
  int get hashCode => Object.hash(
        id,
        userId,
        name,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        Object.hashAll(items),
      );
}

class SavedMealItem {
  const SavedMealItem({
    required this.id,
    required this.savedMealId,
    required this.name,
    required this.estimatedGrams,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
  });

  final String id;
  final String savedMealId;
  final String name;
  final double estimatedGrams;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;

  SavedMealItem copyWith({
    String? id,
    String? savedMealId,
    String? name,
    double? estimatedGrams,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
  }) {
    return SavedMealItem(
      id: id ?? this.id,
      savedMealId: savedMealId ?? this.savedMealId,
      name: name ?? this.name,
      estimatedGrams: estimatedGrams ?? this.estimatedGrams,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SavedMealItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          savedMealId == other.savedMealId &&
          name == other.name &&
          estimatedGrams == other.estimatedGrams &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fat == other.fat;

  @override
  int get hashCode => Object.hash(
        id,
        savedMealId,
        name,
        estimatedGrams,
        calories,
        protein,
        carbs,
        fat,
      );
}
