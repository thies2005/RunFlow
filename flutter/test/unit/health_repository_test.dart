import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/data/repositories/health_repository_impl.dart';

void main() {
  late AppDatabase database;
  late HealthRepositoryImpl repository;

  setUp(() {
    database = AppDatabase.forTesting();
    repository = HealthRepositoryImpl(database: database);
  });

  tearDown(() {
    database.close();
  });

  group('HealthRepositoryImpl', () {
    group('getNutritionLog', () {
      test('creates new log when none exists for date', () async {
        final date = DateTime(2024, 6, 15);
        final log = await repository.getNutritionLog(date);

        expect(log.date.year, 2024);
        expect(log.date.month, 6);
        expect(log.date.day, 15);
        expect(log.calories, 0);
        expect(log.protein, 0);
      });

      test('returns existing log for date', () async {
        final date = DateTime(2024, 7, 1);
        final created = await repository.getNutritionLog(date);

        await repository.saveNutritionLog(NutritionLog(
          id: created.id,
          date: date,
          calories: 2100,
          protein: 120,
          carbs: 250,
          fat: 70,
          water: 2.5,
          createdAt: created.createdAt,
        ));

        final fetched = await repository.getNutritionLog(date);
        expect(fetched.calories, 2100);
        expect(fetched.protein, 120);
        expect(fetched.id, created.id);
      });
    });

    group('saveNutritionLog', () {
      test('updates existing log', () async {
        final date = DateTime(2024, 8, 1);
        final created = await repository.getNutritionLog(date);

        final updated = NutritionLog(
          id: created.id,
          date: date,
          calories: 1800,
          protein: 100,
          carbs: 200,
          fat: 60,
          water: 3.0,
          notes: 'Healthy day',
          createdAt: created.createdAt,
        );

        await repository.saveNutritionLog(updated);
        final fetched = await repository.getNutritionLog(date);
        expect(fetched.calories, 1800);
        expect(fetched.notes, 'Healthy day');
      });
    });

    group('foodItems', () {
      test('saveFoodItem and getFoodItems round-trip', () async {
        const item = FoodItem(
          id: 0,
          name: 'Apple',
          calories: 95.0,
          protein: 0.5,
          carbs: 25.0,
          fat: 0.3,
          servingSize: 182.0,
        );

        await repository.saveFoodItem(item);
        final items = await repository.getFoodItems();
        expect(items.length, 1);
        expect(items.first.name, 'Apple');
        expect(items.first.calories, 95.0);
      });

      test('searchFoodItems returns local matches', () async {
        await repository.saveFoodItem(const FoodItem(
          id: 0, name: 'Banana', calories: 105.0,
          protein: 1.3, carbs: 27.0, fat: 0.4, servingSize: 118.0,
        ));
        await repository.saveFoodItem(const FoodItem(
          id: 0, name: 'Apple', calories: 95.0,
          protein: 0.5, carbs: 25.0, fat: 0.3, servingSize: 182.0,
        ));

        final results = await repository.searchFoodItems('Ban');
        expect(results.length, 1);
        expect(results.first.name, 'Banana');
      });
    });

    group('supplements', () {
      test('saveSupplement and getSupplements round-trip', () async {
        const Supplement supplement = Supplement(
          id: 0,
          name: 'Vitamin D',
          dosage: '2000 IU',
          frequency: 'Daily',
          isActive: true,
        );

        await repository.saveSupplement(supplement);
        final supplements = await repository.getSupplements();
        expect(supplements.length, 1);
        expect(supplements.first.name, 'Vitamin D');
        expect(supplements.first.isActive, true);
      });

      test('toggleSupplement flips isActive', () async {
        const Supplement supplement = Supplement(
          id: 0,
          name: 'Creatine',
          dosage: '5g',
          frequency: 'Daily',
          isActive: true,
        );

        await repository.saveSupplement(supplement);
        final saved = (await repository.getSupplements()).first;
        expect(saved.isActive, true);

        await repository.toggleSupplement(saved.id);
        final toggled = (await repository.getSupplements()).first;
        expect(toggled.isActive, false);

        await repository.toggleSupplement(saved.id);
        final toggledBack = (await repository.getSupplements()).first;
        expect(toggledBack.isActive, true);
      });
    });

    group('bodyMeasurements', () {
      test('saveBodyMeasurement and getBodyMeasurements round-trip', () async {
        final measurement = BodyMeasurement(
          id: 0,
          date: DateTime(2024, 6, 15),
          weight: 75.5,
          bodyFat: 15.2,
        );

        await repository.saveBodyMeasurement(measurement);
        final results = await repository.getBodyMeasurements();
        expect(results.length, 1);
        expect(results.first.weight, 75.5);
        expect(results.first.bodyFat, 15.2);
      });

      test('getBodyMeasurements with date range filter', () async {
        await repository.saveBodyMeasurement(BodyMeasurement(
          id: 0, date: DateTime(2024, 6, 10), weight: 75.0, bodyFat: 15.0,
        ));
        await repository.saveBodyMeasurement(BodyMeasurement(
          id: 0, date: DateTime(2024, 6, 20), weight: 74.5, bodyFat: 14.8,
        ));
        await repository.saveBodyMeasurement(BodyMeasurement(
          id: 0, date: DateTime(2024, 6, 25), weight: 74.0, bodyFat: 14.5,
        ));

        final results = await repository.getBodyMeasurements(
          startDate: DateTime(2024, 6, 15),
          endDate: DateTime(2024, 6, 22),
        );
        expect(results.length, 1);
        expect(results.first.weight, 74.5);
      });

      test('getBodyMeasurements with optional null fields', () async {
        await repository.saveBodyMeasurement(BodyMeasurement(
          id: 0,
          date: DateTime(2024, 6, 15),
          weight: 75.0,
          bodyFat: 15.0,
          chest: 100.0,
          waist: 80.0,
          hips: 95.0,
          notes: 'After workout',
        ));

        final results = await repository.getBodyMeasurements();
        expect(results.first.chest, 100.0);
        expect(results.first.waist, 80.0);
        expect(results.first.hips, 95.0);
        expect(results.first.notes, 'After workout');
      });
    });

    group('fasting', () {
      test('startFasting creates active session', () async {
        final session = await repository.startFasting();
        expect(session.isActive, true);
        expect(session.duration, 0);
        expect(session.endTime, isNull);
      });

      test('stopFasting ends active session', () async {
        await repository.startFasting();
        final stopped = await repository.stopFasting();
        expect(stopped.isActive, false);
        expect(stopped.endTime, isNotNull);
        expect(stopped.duration, greaterThanOrEqualTo(0));
      });

      test('stopFasting throws when no active session', () async {
        expect(
          () => repository.stopFasting(),
          throwsA(isA<Exception>()),
        );
      });

      test('getActiveFasting returns null when no active session', () async {
        final result = await repository.getActiveFasting();
        expect(result, isNull);
      });

      test('getActiveFasting returns active session', () async {
        final started = await repository.startFasting();
        final active = await repository.getActiveFasting();
        expect(active, isNotNull);
        expect(active!.id, started.id);
        expect(active.isActive, true);
      });

      test('getFastingHistory returns completed sessions', () async {
        await repository.startFasting();
        await repository.stopFasting();

        final history = await repository.getFastingHistory();
        expect(history.length, 1);
        expect(history.first.isActive, false);
      });

      test('getFastingHistory excludes active sessions', () async {
        await repository.startFasting();

        final history = await repository.getFastingHistory();
        expect(history, isEmpty);
      });
    });
  });
}
