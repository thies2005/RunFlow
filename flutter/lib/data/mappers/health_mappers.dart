import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart' as domain;

extension NutritionLogMapper on NutritionLog {
  domain.NutritionLog toDomain() => domain.NutritionLog(
        id: id,
        date: date,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        water: water,
        notes: notes,
        createdAt: createdAt,
      );
}

extension DomainNutritionLogMapper on domain.NutritionLog {
  NutritionLog toData() => NutritionLog(
        id: id,
        date: date,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        water: water,
        notes: notes,
        createdAt: createdAt,
      );
}

extension FoodItemMapper on FoodItem {
  domain.FoodItem toDomain() => domain.FoodItem(
        id: id,
        name: name,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        servingSize: servingSize,
        brand: brand,
        barcode: barcode,
        favoriteId: favoriteId,
      );
}

extension DomainFoodItemMapper on domain.FoodItem {
  FoodItem toData() => FoodItem(
        id: id,
        name: name,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        servingSize: servingSize,
        brand: brand,
        barcode: barcode,
        favoriteId: favoriteId,
      );
}

extension SupplementMapper on Supplement {
  domain.Supplement toDomain() => domain.Supplement(
        id: id,
        serverId: serverId,
        name: name,
        amount: amount,
        unit: unit,
        timeOfDay: timeOfDay,
        daysOfWeek: daysOfWeek,
        isActive: isActive,
        stackId: stackId,
        order: order,
        dosage: dosage,
        frequency: frequency,
      );
}

extension DomainSupplementMapper on domain.Supplement {
  Supplement toData() => Supplement(
        id: id,
        serverId: serverId,
        name: name,
        amount: amount,
        unit: unit,
        timeOfDay: timeOfDay,
        daysOfWeek: daysOfWeek,
        isActive: isActive,
        stackId: stackId,
        order: order,
        dosage: dosage,
        frequency: frequency,
      );
}

extension SupplementStackMapper on SupplementStack {
  domain.SupplementStack toDomain() => domain.SupplementStack(
        id: id,
        name: name,
        supplements: supplements.map((s) => s.toDomain()).toList(),
        isActive: isActive,
      );
}

extension DomainSupplementStackMapper on domain.SupplementStack {
  SupplementStack toData() => SupplementStack(
        id: id,
        name: name,
        supplements: supplements.map((s) => s.toData()).toList(),
        isActive: isActive,
      );
}

extension DailyHealthLogMapper on DailyHealthLog {
  domain.DailyHealthLog toDomain() => domain.DailyHealthLog(
        id: id,
        date: date,
        steps: steps,
        weight: weight,
        waterIntake: waterIntake,
        exerciseCalories: exerciseCalories,
        supplementLogs: supplementLogs.map((s) => s.toDomain()).toList(),
        foodLogs: foodLogs.map((f) => f.toDomain()).toList(),
        meta: meta?.toDomain(),
      );
}

extension DomainDailyHealthLogMapper on domain.DailyHealthLog {
  DailyHealthLog toData() => DailyHealthLog(
        id: id,
        date: date,
        steps: steps,
        weight: weight,
        waterIntake: waterIntake,
        exerciseCalories: exerciseCalories,
        supplementLogs: supplementLogs.map((s) => s.toData()).toList(),
        foodLogs: foodLogs.map((f) => f.toData()).toList(),
        meta: meta?.toData(),
      );
}

extension SupplementLogMapper on SupplementLog {
  domain.SupplementLog toDomain() => domain.SupplementLog(
        supplementId: supplementId,
        date: date,
        taken: taken,
      );
}

extension DomainSupplementLogMapper on domain.SupplementLog {
  SupplementLog toData() => SupplementLog(
        supplementId: supplementId,
        date: date,
        taken: taken,
      );
}

extension FoodLogEntryMapper on FoodLogEntry {
  domain.FoodLogEntry toDomain() => domain.FoodLogEntry(
        id: id,
        mealType: mealType,
        name: name,
        quantity: quantity,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
        foodItemId: foodItemId,
      );
}

extension DomainFoodLogEntryMapper on domain.FoodLogEntry {
  FoodLogEntry toData() => FoodLogEntry(
        id: id,
        mealType: mealType,
        name: name,
        quantity: quantity,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
        foodItemId: foodItemId,
      );
}

extension DailyHealthMetaMapper on DailyHealthMeta {
  domain.DailyHealthMeta toDomain() => domain.DailyHealthMeta(
        hasStepHistory: hasStepHistory,
      );
}

extension DomainDailyHealthMetaMapper on domain.DailyHealthMeta {
  DailyHealthMeta toData() => DailyHealthMeta(
        hasStepHistory: hasStepHistory,
      );
}

extension FastingSessionMapper on FastingSession {
  domain.FastingSession toDomain() => domain.FastingSession(
        id: id,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        isActive: isActive,
      );
}

extension DomainFastingSessionMapper on domain.FastingSession {
  FastingSession toData() => FastingSession(
        id: id,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        isActive: isActive,
      );
}

extension BodyMeasurementMapper on BodyMeasurement {
  domain.BodyMeasurement toDomain() => domain.BodyMeasurement(
        id: id,
        date: date,
        weight: weight,
        bodyFat: bodyFat,
        chest: chest,
        waist: waist,
        hips: hips,
        arms: arms,
        notes: notes,
      );
}

extension DomainBodyMeasurementMapper on domain.BodyMeasurement {
  BodyMeasurement toData() => BodyMeasurement(
        id: id,
        date: date,
        weight: weight,
        bodyFat: bodyFat,
        chest: chest,
        waist: waist,
        hips: hips,
        arms: arms,
        notes: notes,
      );
}

extension NutritionTargetsMapper on NutritionTargets {
  domain.NutritionTargets toDomain() => domain.NutritionTargets(
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        water: water,
        proteinPercent: proteinPercent,
        carbsPercent: carbsPercent,
        fatsPercent: fatsPercent,
        waterGoalMl: waterGoalMl,
        exerciseCalorieFactor: exerciseCalorieFactor,
        exerciseCalorieSource: exerciseCalorieSource,
      );
}

extension DomainNutritionTargetsMapper on domain.NutritionTargets {
  NutritionTargets toData() => NutritionTargets(
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        water: water,
        proteinPercent: proteinPercent,
        carbsPercent: carbsPercent,
        fatsPercent: fatsPercent,
        waterGoalMl: waterGoalMl,
        exerciseCalorieFactor: exerciseCalorieFactor,
        exerciseCalorieSource: exerciseCalorieSource,
      );
}

extension NutritionAnalyticsMapper on NutritionAnalytics {
  domain.NutritionAnalytics toDomain() => domain.NutritionAnalytics(
        macroAdherenceScore: macroAdherenceScore,
        dailyData: dailyData.map((d) => d.toDomain()).toList(),
        micronutrients: micronutrients.map((m) => m.toDomain()).toList(),
      );
}

extension DomainNutritionAnalyticsMapper on domain.NutritionAnalytics {
  NutritionAnalytics toData() => NutritionAnalytics(
        macroAdherenceScore: macroAdherenceScore,
        dailyData: dailyData.map((d) => d.toData()).toList(),
        micronutrients: micronutrients.map((m) => m.toData()).toList(),
      );
}

extension DailyNutritionMapper on DailyNutrition {
  domain.DailyNutrition toDomain() => domain.DailyNutrition(
        date: date,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
      );
}

extension DomainDailyNutritionMapper on domain.DailyNutrition {
  DailyNutrition toData() => DailyNutrition(
        date: date,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
      );
}

extension MicronutrientSummaryMapper on MicronutrientSummary {
  domain.MicronutrientSummary toDomain() => domain.MicronutrientSummary(
        name: name,
        amount: amount,
        unit: unit,
        dailyValuePercent: dailyValuePercent,
      );
}

extension DomainMicronutrientSummaryMapper on domain.MicronutrientSummary {
  MicronutrientSummary toData() => MicronutrientSummary(
        name: name,
        amount: amount,
        unit: unit,
        dailyValuePercent: dailyValuePercent,
      );
}

extension SupplementAnalyticsMapper on SupplementAnalytics {
  domain.SupplementAnalytics toDomain() => domain.SupplementAnalytics(
        overallAdherence: overallAdherence,
        avgDailyDoses: avgDailyDoses,
        totalSupplements: totalSupplements,
        totalScheduled: totalScheduled,
        totalTaken: totalTaken,
        totalDays: totalDays,
        supplements: supplements.map((s) => s.toDomain()).toList(),
      );
}

extension DomainSupplementAnalyticsMapper on domain.SupplementAnalytics {
  SupplementAnalytics toData() => SupplementAnalytics(
        overallAdherence: overallAdherence,
        avgDailyDoses: avgDailyDoses,
        totalSupplements: totalSupplements,
        totalScheduled: totalScheduled,
        totalTaken: totalTaken,
        totalDays: totalDays,
        supplements: supplements.map((s) => s.toData()).toList(),
      );
}

extension SupplementAdherenceMapper on SupplementAdherence {
  domain.SupplementAdherence toDomain() => domain.SupplementAdherence(
        name: name,
        adherencePercent: adherencePercent,
        daysTaken: daysTaken,
        totalDays: totalDays,
      );
}

extension DomainSupplementAdherenceMapper on domain.SupplementAdherence {
  SupplementAdherence toData() => SupplementAdherence(
        name: name,
        adherencePercent: adherencePercent,
        daysTaken: daysTaken,
        totalDays: totalDays,
      );
}

extension HealthHistoryMapper on HealthHistory {
  domain.HealthHistory toDomain() => domain.HealthHistory(
        steps: steps.map((s) => s.toDomain()).toList(),
        weight: weight.map((w) => w.toDomain()).toList(),
      );
}

extension DomainHealthHistoryMapper on domain.HealthHistory {
  HealthHistory toData() => HealthHistory(
        steps: steps.map((s) => s.toData()).toList(),
        weight: weight.map((w) => w.toData()).toList(),
      );
}

extension HealthHistoryPointMapper on HealthHistoryPoint {
  domain.HealthHistoryPoint toDomain() => domain.HealthHistoryPoint(
        date: date,
        value: value,
      );
}

extension DomainHealthHistoryPointMapper on domain.HealthHistoryPoint {
  HealthHistoryPoint toData() => HealthHistoryPoint(
        date: date,
        value: value,
      );
}
