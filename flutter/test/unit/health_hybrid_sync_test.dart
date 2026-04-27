import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/health_models.dart';

void main() {
  group('Food search merge/dedup', () {
    List<FoodItem> mergeResults(List<FoodItem> local, List<FoodItem> server) {
      final seen = <String>{};
      final merged = <FoodItem>[];

      for (final item in local) {
        final key = item.name.toLowerCase();
        if (seen.add(key)) {
          merged.add(item);
        }
      }

      for (final item in server) {
        final key = item.name.toLowerCase();
        if (seen.add(key)) {
          merged.add(item.copyWith(id: 0));
        }
      }

      return merged;
    }

    test('returns only local results when server is empty', () {
      final local = [
        const FoodItem(
          id: 1,
          name: 'Apple',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          servingSize: 182,
        ),
      ];

      final result = mergeResults(local, []);

      expect(result.length, 1);
      expect(result.first.name, 'Apple');
      expect(result.first.id, 1);
    });

    test('merges local and server results', () {
      final local = [
        const FoodItem(
          id: 1,
          name: 'Apple',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          servingSize: 182,
        ),
      ];
      final server = [
        const FoodItem(
          id: 100,
          name: 'Banana',
          calories: 105,
          protein: 1.3,
          carbs: 27,
          fat: 0.4,
          servingSize: 118,
        ),
      ];

      final result = mergeResults(local, server);

      expect(result.length, 2);
      expect(result[0].name, 'Apple');
      expect(result[1].name, 'Banana');
      expect(result[1].id, 0);
    });

    test('deduplicates by name case-insensitive', () {
      final local = [
        const FoodItem(
          id: 1,
          name: 'Chicken Breast',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
        ),
      ];
      final server = [
        const FoodItem(
          id: 200,
          name: 'chicken breast',
          calories: 170,
          protein: 32,
          carbs: 0,
          fat: 3.5,
          servingSize: 100,
        ),
      ];

      final result = mergeResults(local, server);

      expect(result.length, 1);
      expect(result.first.name, 'Chicken Breast');
      expect(result.first.id, 1);
    });

    test('local results take precedence over server duplicates', () {
      final local = [
        const FoodItem(
          id: 1,
          name: 'Rice',
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fat: 0.3,
          servingSize: 100,
        ),
      ];
      final server = [
        const FoodItem(
          id: 300,
          name: 'Rice',
          calories: 135,
          protein: 3.0,
          carbs: 29,
          fat: 0.4,
          servingSize: 100,
        ),
      ];

      final result = mergeResults(local, server);

      expect(result.length, 1);
      expect(result.first.calories, 130);
    });

    test('deduplicates within server results too', () {
      final local = <FoodItem>[];
      final server = [
        const FoodItem(
          id: 1,
          name: 'Egg',
          calories: 78,
          protein: 6,
          carbs: 0.6,
          fat: 5,
          servingSize: 50,
        ),
        const FoodItem(
          id: 2,
          name: 'egg',
          calories: 78,
          protein: 6,
          carbs: 0.6,
          fat: 5,
          servingSize: 50,
        ),
      ];

      final result = mergeResults(local, server);

      expect(result.length, 1);
    });

    test('returns empty when both are empty', () {
      final result = mergeResults([], []);
      expect(result, isEmpty);
    });

    test('preserves all distinct items from large result sets', () {
      final local = List.generate(
        10,
        (int i) => FoodItem(
          id: i,
          name: 'Food $i',
          calories: 100.0 + i,
          protein: 10.0,
          carbs: 20.0,
          fat: 5.0,
          servingSize: 100.0,
        ),
      );
      final server = List.generate(
        10,
        (int i) => FoodItem(
          id: 100 + i,
          name: 'Server Food $i',
          calories: 200.0 + i,
          protein: 20.0,
          carbs: 30.0,
          fat: 10.0,
          servingSize: 150.0,
        ),
      );

      final result = mergeResults(local, server);

      expect(result.length, 20);
    });
  });

  group('Hybrid sync logic', () {
    test('local-first save returns immediately, sync happens in background',
        () async {
      int localSaveCount = 0;
      int serverSyncCount = 0;

      Future<void> localSave() async {
        localSaveCount++;
      }

      Future<void> serverSync() async {
        await Future<void>.delayed(const Duration(milliseconds: 10));
        serverSyncCount++;
      }

      await localSave();
      // ignore: unawaited_futures
      serverSync().catchError((Object _) {});

      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(localSaveCount, 1);
      expect(serverSyncCount, 1);
    });

    test('server sync failure does not affect local save', () async {
      bool localSaveSucceeded = false;

      Future<void> localSave() async {
        localSaveSucceeded = true;
      }

      Future<void> failingSync() async {
        throw Exception('Network error');
      }

      await localSave();
      // ignore: unawaited_futures
      failingSync().catchError((Object _) {});

      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(localSaveSucceeded, true);
    });

    test('read from local when API repository is null', () async {
      const localItems = [
        FoodItem(
          id: 1,
          name: 'Local Food',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          servingSize: 100,
        ),
      ];

      List<FoodItem> mergeWithServer(
        List<FoodItem> local,
        List<FoodItem>? serverResults,
      ) {
        if (serverResults == null) return local;
        final seen = <String>{};
        final merged = <FoodItem>[];
        for (final item in local) {
          if (seen.add(item.name.toLowerCase())) merged.add(item);
        }
        for (final item in serverResults) {
          if (seen.add(item.name.toLowerCase())) {
            merged.add(item.copyWith(id: 0));
          }
        }
        return merged;
      }

      final result = mergeWithServer(localItems, null);
      expect(result.length, 1);
      expect(result.first.name, 'Local Food');
    });

    test('read from local when server sync fails', () async {
      const localItems = [
        FoodItem(
          id: 1,
          name: 'Local Food',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          servingSize: 100,
        ),
      ];

      Future<List<FoodItem>?> serverSearch() async {
        throw Exception('Network error');
      }

      List<FoodItem> result = localItems;
      try {
        final serverResults = await serverSearch();
        if (serverResults != null) {
          result = [...result, ...serverResults];
        }
      } catch (_) {}

      expect(result.length, 1);
      expect(result.first.name, 'Local Food');
    });
  });

  group('Batch sync data preparation', () {
    test('serializes all health data for batch sync', () async {
      final foodItems = [
        const FoodItem(
          id: 1,
          name: 'Chicken',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          servingSize: 100,
        ),
      ];
      final supplements = [
        const Supplement(
          id: '1',
          name: 'Vitamin D',
          dosage: '2000 IU',
          frequency: 'Daily',
          isActive: true,
        ),
      ];
      final measurements = [
        BodyMeasurement(
          id: 1,
          date: DateTime(2024, 6, 15),
          weight: 75.5,
          bodyFat: 15.2,
        ),
      ];
      final sessions = [
        FastingSession(
          id: 1,
          startTime: DateTime(2024, 6, 15, 8, 0),
          duration: 480,
          isActive: false,
        ),
      ];

      final batchData = <String, dynamic>{
        'nutritionLogs': foodItems.map((FoodItem e) => e.toJson()).toList(),
        'supplements': supplements.map((Supplement e) => e.toJson()).toList(),
        'bodyMeasurements':
            measurements.map((BodyMeasurement e) => e.toJson()).toList(),
        'fastingSessions':
            sessions.map((FastingSession e) => e.toJson()).toList(),
      };

      expect(batchData['nutritionLogs'], isA<List<dynamic>>());
      expect(batchData['supplements'], isA<List<dynamic>>());
      expect(batchData['bodyMeasurements'], isA<List<dynamic>>());
      expect(batchData['fastingSessions'], isA<List<dynamic>>());

      final foodList = batchData['nutritionLogs'] as List<dynamic>;
      expect(foodList.length, 1);
      expect(foodList.first['name'], 'Chicken');

      final supplementList = batchData['supplements'] as List<dynamic>;
      expect(supplementList.length, 1);
      expect(supplementList.first['name'], 'Vitamin D');
    });
  });
}
