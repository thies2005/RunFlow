import 'dart:convert';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';

void main() {
  late AppDatabase database;

  setUp(() {
    database = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() async {
    await database.close();
  });

  group('AppDatabase', () {
    group('NutritionLogs CRUD', () {
      test('insert and read nutrition log', () async {
        final date = DateTime(2024, 6, 15).millisecondsSinceEpoch;
        final id = await database.nutritionDao.insertNutritionLog(
          NutritionLogsCompanion.insert(date: date),
        );

        final log = await database.nutritionDao.getNutritionLogByDate(DateTime(2024, 6, 15));
        expect(log, isNotNull);
        expect(log!.id, id);
        expect(log.date, date);
        expect(log.calories, 0.0);
      });

      test('update nutrition log values', () async {
        final date = DateTime(2024, 7, 1).millisecondsSinceEpoch;
        final id = await database.nutritionDao.insertNutritionLog(
          NutritionLogsCompanion.insert(date: date),
        );

        await database.nutritionDao.updateNutritionLog(NutritionLogsCompanion(
          id: Value(id),
          date: Value(date),
          calories: const Value(2100.0),
          protein: const Value(120.0),
          carbs: const Value(250.0),
          fat: const Value(70.0),
          water: const Value(2.5),
          notes: const Value('Lunch'),
        ));

        final updated = await database.nutritionDao.getNutritionLogByDate(DateTime(2024, 7, 1));
        expect(updated!.calories, 2100.0);
        expect(updated.protein, 120.0);
        expect(updated.notes, 'Lunch');
      });

      test('getNutritionLogByDate returns null for missing date', () async {
        final result = await database.nutritionDao.getNutritionLogByDate(DateTime(2025, 1, 1));
        expect(result, isNull);
      });

      test('null fields default correctly', () async {
        final date = DateTime(2024, 8, 1).millisecondsSinceEpoch;
        await database.nutritionDao.insertNutritionLog(
          NutritionLogsCompanion.insert(date: date),
        );

        final log = await database.nutritionDao.getNutritionLogByDate(DateTime(2024, 8, 1));
        expect(log!.notes, isNull);
        expect(log.calories, 0.0);
        expect(log.water, 0.0);
      });
    });

    group('FoodItems CRUD', () {
      test('insert and read food items', () async {
        final id = await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple',
            calories: 95.0,
            protein: 0.5,
            carbs: 25.0,
            fat: 0.3,
            servingSize: 182.0,
          ),
        );

        final items = await database.nutritionDao.getAllFoodItems();
        expect(items.length, 1);
        expect(items.first.id, id);
        expect(items.first.name, 'Apple');
      });

      test('search food items by name', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Banana', calories: 105.0, protein: 1.3,
            carbs: 27.0, fat: 0.4, servingSize: 118.0,
          ),
        );
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple', calories: 95.0, protein: 0.5,
            carbs: 25.0, fat: 0.3, servingSize: 182.0,
          ),
        );

        final results = await database.nutritionDao.searchFoodItems('Ban');
        expect(results.length, 1);
        expect(results.first.name, 'Banana');
      });

      test('search returns empty when no match', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple', calories: 95.0, protein: 0.5,
            carbs: 25.0, fat: 0.3, servingSize: 182.0,
          ),
        );

        final results = await database.nutritionDao.searchFoodItems('Orange');
        expect(results, isEmpty);
      });

      test('food item with barcode', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Protein Bar', calories: 200.0, protein: 20.0,
            carbs: 25.0, fat: 7.0, servingSize: 60.0,
            barcode: const Value('1234567890'),
          ),
        );

        final items = await database.nutritionDao.getAllFoodItems();
        expect(items.first.barcode, '1234567890');
      });

      test('food item with null barcode', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Banana', calories: 105.0, protein: 1.3,
            carbs: 27.0, fat: 0.4, servingSize: 118.0,
          ),
        );

        final items = await database.nutritionDao.getAllFoodItems();
        expect(items.first.barcode, isNull);
      });

      test('multiple food items returned in order', () async {
        for (int i = 0; i < 5; i++) {
          await database.nutritionDao.insertFoodItem(
            FoodItemsCompanion.insert(
              name: 'Food $i', calories: i * 10.0, protein: 1.0,
              carbs: 10.0, fat: 1.0, servingSize: 100.0,
            ),
          );
        }

        final items = await database.nutritionDao.getAllFoodItems();
        expect(items.length, 5);
      });
    });

    group('Supplements CRUD', () {
      test('insert and read supplements', () async {
        final id = await database.supplementDao.insertSupplement(
          SupplementsCompanion.insert(
            name: 'Vitamin D',
            dosage: '2000 IU',
            frequency: 'Daily',
          ),
        );

        final supplements = await database.supplementDao.getAllSupplements();
        expect(supplements.length, 1);
        expect(supplements.first.id, id);
        expect(supplements.first.isActive, 1);
      });

      test('update supplement', () async {
        final id = await database.supplementDao.insertSupplement(
          SupplementsCompanion.insert(
            name: 'Creatine', dosage: '5g', frequency: 'Daily',
          ),
        );

        await database.supplementDao.updateSupplement(SupplementsCompanion(
          id: Value(id),
          name: const Value('Creatine Monohydrate'),
          dosage: const Value('10g'),
          frequency: const Value('Twice daily'),
          isActive: const Value(0),
        ));

        final supplements = await database.supplementDao.getAllSupplements();
        expect(supplements.first.name, 'Creatine Monohydrate');
        expect(supplements.first.isActive, 0);
      });

      test('default isActive is 1', () async {
        await database.supplementDao.insertSupplement(
          SupplementsCompanion.insert(
            name: 'Zinc', dosage: '15mg', frequency: 'Daily',
          ),
        );

        final supplements = await database.supplementDao.getAllSupplements();
        expect(supplements.first.isActive, 1);
      });
    });

    group('FastingSessions CRUD', () {
      test('insert and get active fasting session', () async {
        final now = DateTime(2024, 6, 15, 8, 0).millisecondsSinceEpoch;
        await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: now),
        );

        final active = await database.healthDao.getActiveFastingSession();
        expect(active, isNotNull);
        expect(active!.startTime, now);
        expect(active.isActive, 1);
        expect(active.endTime, isNull);
      });

      test('getActiveFastingSession returns null when none active', () async {
        final result = await database.healthDao.getActiveFastingSession();
        expect(result, isNull);
      });

      test('update fasting session to inactive', () async {
        final now = DateTime(2024, 6, 15, 8, 0).millisecondsSinceEpoch;
        final id = await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: now),
        );

        final endTime = DateTime(2024, 6, 15, 16, 0).millisecondsSinceEpoch;
        await database.healthDao.updateFastingSession(FastingSessionsCompanion(
          id: Value(id),
          startTime: Value(now),
          endTime: Value(endTime),
          duration: const Value(480),
          isActive: const Value(0),
        ));

        final active = await database.healthDao.getActiveFastingSession();
        expect(active, isNull);

        final history = await database.healthDao.getFastingHistory();
        expect(history.length, 1);
        expect(history.first.duration, 480);
        expect(history.first.isActive, 0);
      });

      test('getFastingHistory returns only inactive sessions', () async {
        final t1 = DateTime(2024, 6, 14, 8, 0).millisecondsSinceEpoch;
        final t2 = DateTime(2024, 6, 15, 8, 0).millisecondsSinceEpoch;

        final id1 = await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: t1),
        );
        await database.healthDao.updateFastingSession(FastingSessionsCompanion(
          id: Value(id1),
          startTime: Value(t1),
          endTime: Value(DateTime(2024, 6, 14, 16, 0).millisecondsSinceEpoch),
          duration: const Value(480),
          isActive: const Value(0),
        ));

        await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: t2),
        );

        final history = await database.healthDao.getFastingHistory();
        expect(history.length, 1);
        expect(history.first.isActive, 0);
      });

      test('multiple active sessions throws too many elements', () async {
        final t1 = DateTime(2024, 6, 15, 8, 0).millisecondsSinceEpoch;
        await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: t1),
        );
        final t2 = DateTime(2024, 6, 15, 10, 0).millisecondsSinceEpoch;
        await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: t2),
        );

        expect(
          () => database.healthDao.getActiveFastingSession(),
          throwsA(isA<StateError>()),
        );
      });
    });

    group('BodyMeasurements CRUD', () {
      test('insert and read body measurements', () async {
        final date = DateTime(2024, 6, 15).millisecondsSinceEpoch;
        final id = await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: date,
            weight: 75.5,
            bodyFat: 15.2,
          ),
        );

        final results = await database.healthDao.getBodyMeasurements();
        expect(results.length, 1);
        expect(results.first.id, id);
        expect(results.first.weight, 75.5);
        expect(results.first.bodyFat, 15.2);
      });

      test('body measurement with all optional fields', () async {
        final date = DateTime(2024, 6, 20).millisecondsSinceEpoch;
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: date,
            weight: 74.0,
            bodyFat: 14.5,
            chest: const Value(100.0),
            waist: const Value(80.0),
            hips: const Value(95.0),
            notes: const Value('Morning measurement'),
          ),
        );

        final results = await database.healthDao.getBodyMeasurements();
        expect(results.first.chest, 100.0);
        expect(results.first.waist, 80.0);
        expect(results.first.hips, 95.0);
        expect(results.first.notes, 'Morning measurement');
      });

      test('date range query - startDate filter', () async {
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: DateTime(2024, 6, 10).millisecondsSinceEpoch,
            weight: 75.0, bodyFat: 15.0,
          ),
        );
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: DateTime(2024, 6, 20).millisecondsSinceEpoch,
            weight: 74.0, bodyFat: 14.0,
          ),
        );

        final results = await database.healthDao.getBodyMeasurements(
          startDate: DateTime(2024, 6, 15),
        );
        expect(results.length, 1);
        expect(results.first.weight, 74.0);
      });

      test('date range query - endDate filter', () async {
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: DateTime(2024, 6, 10).millisecondsSinceEpoch,
            weight: 75.0, bodyFat: 15.0,
          ),
        );
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: DateTime(2024, 6, 20).millisecondsSinceEpoch,
            weight: 74.0, bodyFat: 14.0,
          ),
        );

        final results = await database.healthDao.getBodyMeasurements(
          endDate: DateTime(2024, 6, 15),
        );
        expect(results.length, 1);
        expect(results.first.weight, 75.0);
      });

      test('date range query - both filters', () async {
        for (int d = 10; d <= 20; d += 5) {
          await database.healthDao.insertBodyMeasurement(
            BodyMeasurementsCompanion.insert(
              date: DateTime(2024, 6, d).millisecondsSinceEpoch,
              weight: 75.0 - d, bodyFat: 15.0,
            ),
          );
        }

        final results = await database.healthDao.getBodyMeasurements(
          startDate: DateTime(2024, 6, 13),
          endDate: DateTime(2024, 6, 18),
        );
        expect(results.length, 1);
      });

      test('date range query - no filter returns all', () async {
        for (int i = 0; i < 3; i++) {
          await database.healthDao.insertBodyMeasurement(
            BodyMeasurementsCompanion.insert(
              date: DateTime(2024, 6, 10 + i).millisecondsSinceEpoch,
              weight: 75.0, bodyFat: 15.0,
            ),
          );
        }

        final results = await database.healthDao.getBodyMeasurements();
        expect(results.length, 3);
      });
    });

    group('CacheDao - CachedDashboard', () {
      test('cache and retrieve dashboard', () async {
        final jsonData = jsonEncode({'stats': {'mileage': 42.5}});
        await database.cacheDao.cacheDashboard(
          CachedDashboardCompanion.insert(
            jsonData: jsonData,
            cachedAt: DateTime.now().millisecondsSinceEpoch,
          ),
        );

        final cached = await database.cacheDao.getCachedDashboard();
        expect(cached, isNotNull);
        expect(cached!.jsonData, jsonData);
      });

      test('cache replaces previous dashboard', () async {
        await database.cacheDao.cacheDashboard(
          CachedDashboardCompanion.insert(
            jsonData: '{"old": true}',
            cachedAt: 1000,
          ),
        );
        await database.cacheDao.cacheDashboard(
          CachedDashboardCompanion.insert(
            jsonData: '{"new": true}',
            cachedAt: 2000,
          ),
        );

        final cached = await database.cacheDao.getCachedDashboard();
        expect(cached!.jsonData, '{"new": true}');
      });

      test('clearCachedDashboard removes entry', () async {
        await database.cacheDao.cacheDashboard(
          CachedDashboardCompanion.insert(
            jsonData: '{}',
            cachedAt: 1000,
          ),
        );
        await database.cacheDao.clearCachedDashboard();
        final cached = await database.cacheDao.getCachedDashboard();
        expect(cached, isNull);
      });
    });

    group('CacheDao - CachedActivities', () {
      test('cache and retrieve activities', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheActivity(DbCachedActivity(
          activityId: 'act1',
          jsonData: '{"id":"act1"}',
          cachedAt: now,
        ));

        final cached = await database.cacheDao.getCachedActivities();
        expect(cached.length, 1);
        expect(cached.first.activityId, 'act1');
      });

      test('cacheActivity upserts on conflict', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheActivity(DbCachedActivity(
          activityId: 'act1',
          jsonData: '{"v":1}',
          cachedAt: now,
        ));
        await database.cacheDao.cacheActivity(DbCachedActivity(
          activityId: 'act1',
          jsonData: '{"v":2}',
          cachedAt: now + 1000,
        ));

        final cached = await database.cacheDao.getCachedActivities();
        expect(cached.length, 1);
        expect(cached.first.jsonData, '{"v":2}');
      });

      test('clearCachedActivities removes all', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheActivity(DbCachedActivity(
          activityId: 'a1', jsonData: '{}', cachedAt: now,
        ));
        await database.cacheDao.cacheActivity(DbCachedActivity(
          activityId: 'a2', jsonData: '{}', cachedAt: now,
        ));

        await database.cacheDao.clearCachedActivities();
        final cached = await database.cacheDao.getCachedActivities();
        expect(cached, isEmpty);
      });

      test('multiple activities cached independently', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        for (int i = 0; i < 5; i++) {
          await database.cacheDao.cacheActivity(DbCachedActivity(
            activityId: 'act$i',
            jsonData: '{"id":"act$i"}',
            cachedAt: now,
          ));
        }

        final cached = await database.cacheDao.getCachedActivities();
        expect(cached.length, 5);
      });
    });

    group('CacheDao - CachedChatMessages', () {
      test('cache and retrieve chat messages', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheChatMessages(DbCachedChatMessage(
          sessionId: 's1',
          jsonData: '[{"id":"m1"}]',
          cachedAt: now,
        ));

        final cached = await database.cacheDao.getCachedChatMessages('s1');
        expect(cached, isNotNull);
        expect(cached!.sessionId, 's1');
      });

      test('returns null for unknown session', () async {
        final result = await database.cacheDao.getCachedChatMessages('unknown');
        expect(result, isNull);
      });

      test('upsert on conflict', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheChatMessages(DbCachedChatMessage(
          sessionId: 's1',
          jsonData: '[{"v":1}]',
          cachedAt: now,
        ));
        await database.cacheDao.cacheChatMessages(DbCachedChatMessage(
          sessionId: 's1',
          jsonData: '[{"v":2}]',
          cachedAt: now + 1000,
        ));

        final cached = await database.cacheDao.getCachedChatMessages('s1');
        expect(cached!.jsonData, '[{"v":2}]');
      });

      test('clearCachedChatMessages removes specific session', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        await database.cacheDao.cacheChatMessages(DbCachedChatMessage(
          sessionId: 's1', jsonData: '[]', cachedAt: now,
        ));
        await database.cacheDao.cacheChatMessages(DbCachedChatMessage(
          sessionId: 's2', jsonData: '[]', cachedAt: now,
        ));

        await database.cacheDao.clearCachedChatMessages('s1');
        expect(await database.cacheDao.getCachedChatMessages('s1'), isNull);
        expect(await database.cacheDao.getCachedChatMessages('s2'), isNotNull);
      });
    });

    group('Migration', () {
      test('schema version is 2', () {
        expect(database.schemaVersion, 2);
      });

      test('fresh database has all tables', () async {
        final nutrition = await database.nutritionDao.getAllFoodItems();
        expect(nutrition, isEmpty);

        final supplements = await database.supplementDao.getAllSupplements();
        expect(supplements, isEmpty);

        final history = await database.healthDao.getFastingHistory();
        expect(history, isEmpty);

        final measurements = await database.healthDao.getBodyMeasurements();
        expect(measurements, isEmpty);

        final cachedDashboard = await database.cacheDao.getCachedDashboard();
        expect(cachedDashboard, isNull);

        final cachedActivities = await database.cacheDao.getCachedActivities();
        expect(cachedActivities, isEmpty);
      });
    });

    group('Edge cases', () {
      test('duplicate food items are allowed (different rows)', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple', calories: 95.0, protein: 0.5,
            carbs: 25.0, fat: 0.3, servingSize: 182.0,
          ),
        );
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple', calories: 95.0, protein: 0.5,
            carbs: 25.0, fat: 0.3, servingSize: 182.0,
          ),
        );

        final items = await database.nutritionDao.getAllFoodItems();
        expect(items.length, 2);
      });

      test('search food items is case-insensitive in SQL LIKE', () async {
        await database.nutritionDao.insertFoodItem(
          FoodItemsCompanion.insert(
            name: 'Apple', calories: 95.0, protein: 0.5,
            carbs: 25.0, fat: 0.3, servingSize: 182.0,
          ),
        );

        final lower = await database.nutritionDao.searchFoodItems('apple');
        expect(lower.length, 1);

        final upper = await database.nutritionDao.searchFoodItems('APPLE');
        expect(upper.length, 1);
      });

      test('fasting session with zero duration', () async {
        final now = DateTime.now().millisecondsSinceEpoch;
        final id = await database.healthDao.insertFastingSession(
          FastingSessionsCompanion.insert(startTime: now),
        );
        await database.healthDao.updateFastingSession(FastingSessionsCompanion(
          id: Value(id),
          startTime: Value(now),
          endTime: Value(now),
          duration: const Value(0),
          isActive: const Value(0),
        ));

        final history = await database.healthDao.getFastingHistory();
        expect(history.first.duration, 0);
      });

      test('body measurement with null optional fields', () async {
        await database.healthDao.insertBodyMeasurement(
          BodyMeasurementsCompanion.insert(
            date: DateTime(2024, 6, 15).millisecondsSinceEpoch,
            weight: 75.0,
            bodyFat: 15.0,
          ),
        );

        final results = await database.healthDao.getBodyMeasurements();
        expect(results.first.chest, isNull);
        expect(results.first.waist, isNull);
        expect(results.first.hips, isNull);
        expect(results.first.notes, isNull);
      });
    });
  });
}
