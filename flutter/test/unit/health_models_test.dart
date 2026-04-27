import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/health_models.dart';

void main() {
  group('NutritionLog', () {
    test('round-trip serialization', () {
      final log = NutritionLog(
        id: 1,
        date: DateTime(2024, 6, 15),
        calories: 2100.0,
        protein: 120.0,
        carbs: 250.0,
        fat: 70.0,
        water: 2.5,
        notes: 'Good day',
        createdAt: DateTime(2024, 6, 15, 8, 0),
      );
      final json = jsonEncode(log.toJson());
      final restored = NutritionLog.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.id, 1);
      expect(restored.calories, 2100.0);
      expect(restored.protein, 120.0);
      expect(restored.carbs, 250.0);
      expect(restored.fat, 70.0);
      expect(restored.water, 2.5);
      expect(restored.notes, 'Good day');
    });

    test('handles null notes', () {
      final log = NutritionLog(
        id: 1,
        date: DateTime(2024, 6, 15),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        createdAt: DateTime(2024, 6, 15),
      );
      final json = log.toJson();
      final restored = NutritionLog.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.notes, isNull);
    });
  });

  group('FoodItem', () {
    test('round-trip serialization', () {
      const item = FoodItem(
        id: 1,
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: 100,
        barcode: '1234567890',
      );
      final json = jsonEncode(item.toJson());
      final restored = FoodItem.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.name, 'Chicken Breast');
      expect(restored.calories, 165);
      expect(restored.protein, 31);
      expect(restored.barcode, '1234567890');
    });

    test('handles null barcode', () {
      const item = FoodItem(
        id: 1,
        name: 'Apple',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        servingSize: 182,
      );
      final json = item.toJson();
      final restored = FoodItem.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.barcode, isNull);
    });
  });

  group('Supplement', () {
    test('round-trip serialization', () {
      const supplement = Supplement(
        id: '1',
        name: 'Vitamin D',
        dosage: '2000 IU',
        frequency: 'Daily',
        isActive: true,
      );
      final json = jsonEncode(supplement.toJson());
      final restored = Supplement.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.name, 'Vitamin D');
      expect(restored.dosage, '2000 IU');
      expect(restored.isActive, true);
    });

    test('copyWith toggles isActive', () {
      const supplement = Supplement(
        id: '1',
        name: 'Creatine',
        dosage: '5g',
        frequency: 'Daily',
        isActive: true,
      );
      final toggled = supplement.copyWith(isActive: false);

      expect(toggled.isActive, false);
      expect(toggled.name, 'Creatine');
    });
  });

  group('FastingSession', () {
    test('round-trip serialization', () {
      final session = FastingSession(
        id: 1,
        startTime: DateTime(2024, 6, 15, 8, 0),
        endTime: DateTime(2024, 6, 15, 16, 0),
        duration: 480,
        isActive: false,
      );
      final json = jsonEncode(session.toJson());
      final restored = FastingSession.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.duration, 480);
      expect(restored.isActive, false);
      expect(restored.endTime, isNotNull);
    });

    test('handles active session with null endTime', () {
      final session = FastingSession(
        id: 1,
        startTime: DateTime(2024, 6, 15, 8, 0),
        duration: 0,
        isActive: true,
      );
      final json = session.toJson();
      final restored = FastingSession.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.endTime, isNull);
      expect(restored.isActive, true);
    });
  });

  group('BodyMeasurement', () {
    test('round-trip serialization', () {
      final measurement = BodyMeasurement(
        id: 1,
        date: DateTime(2024, 6, 15),
        weight: 75.5,
        bodyFat: 15.2,
        chest: 100.0,
        waist: 80.0,
        hips: 95.0,
        notes: 'Morning measurement',
      );
      final json = jsonEncode(measurement.toJson());
      final restored = BodyMeasurement.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.weight, 75.5);
      expect(restored.bodyFat, 15.2);
      expect(restored.chest, 100.0);
      expect(restored.waist, 80.0);
      expect(restored.notes, 'Morning measurement');
    });

    test('handles null optional fields', () {
      final measurement = BodyMeasurement(
        id: 1,
        date: DateTime(2024, 6, 15),
        weight: 75.5,
        bodyFat: 15.2,
      );
      final json = measurement.toJson();
      final restored = BodyMeasurement.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.chest, isNull);
      expect(restored.waist, isNull);
      expect(restored.hips, isNull);
      expect(restored.notes, isNull);
    });
  });

  group('Nutrition calculations', () {
    test('macro percentages from NutritionLog', () {
      final log = NutritionLog(
        id: 1,
        date: DateTime(2024, 6, 15),
        calories: 2000,
        protein: 100,
        carbs: 250,
        fat: 55,
        water: 2,
        createdAt: DateTime(2024, 6, 15),
      );
      final proteinCals = log.protein * 4;
      final carbsCals = log.carbs * 4;
      final fatCals = log.fat * 9;
      final totalCals = proteinCals + carbsCals + fatCals;

      expect(proteinCals, 400);
      expect(carbsCals, 1000);
      expect(fatCals, 495);
      expect(totalCals, 1895);

      final proteinPct = proteinCals / log.calories;
      final carbsPct = carbsCals / log.calories;
      final fatPct = fatCals / log.calories;

      expect((proteinPct * 100).toStringAsFixed(1), '20.0');
      expect((carbsPct * 100).toStringAsFixed(1), '50.0');
      expect((fatPct * 100).toStringAsFixed(1), '24.8');
    });

    test('zero calories yields zero percentages', () {
      final log = NutritionLog(
        id: 1,
        date: DateTime(2024, 6, 15),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        createdAt: DateTime(2024, 6, 15),
      );
      final proteinPct = log.calories > 0 ? (log.protein * 4) / log.calories : 0.0;
      final carbsPct = log.calories > 0 ? (log.carbs * 4) / log.calories : 0.0;
      final fatPct = log.calories > 0 ? (log.fat * 9) / log.calories : 0.0;

      expect(proteinPct, 0.0);
      expect(carbsPct, 0.0);
      expect(fatPct, 0.0);
    });

    test('calorie totals sum correctly', () {
      final log = NutritionLog(
        id: 1,
        date: DateTime(2024, 6, 15),
        calories: 2400,
        protein: 150,
        carbs: 300,
        fat: 66,
        water: 3,
        createdAt: DateTime(2024, 6, 15),
      );
      final totalFromMacros = (log.protein * 4) + (log.carbs * 4) + (log.fat * 9);
      expect(totalFromMacros, 2394);
    });
  });
}
