import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late HealthApiRepositoryImpl repository;

  setUp(() {
    mockDio = MockDio();
    repository = HealthApiRepositoryImpl(dio: mockDio);
  });

  group('NutritionTargets', () {
    group('getNutritionTargets', () {
      test('returns targets from envelope response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'target': {
                  'calories': 2200.0,
                  'protein': 140.0,
                  'carbs': 280.0,
                  'fat': 70.0,
                  'water': 2.5,
                },
              },
            ));

        final result = await repository.getNutritionTargets();

        expect(result.calories, 2200.0);
        expect(result.protein, 140.0);
        expect(result.carbs, 280.0);
        expect(result.fat, 70.0);
        expect(result.water, 2.5);
      });

      test('returns targets from flat response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'calories': 2500.0,
                'protein': 150.0,
                'carbs': 300.0,
                'fat': 80.0,
                'water': 2.0,
              },
            ));

        final result = await repository.getNutritionTargets();

        expect(result.calories, 2500.0);
        expect(result.protein, 150.0);
      });

      test('returns default targets when data is not a map', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        final result = await repository.getNutritionTargets();

        expect(result.calories, 2500.0);
        expect(result.protein, 150.0);
        expect(result.carbs, 300.0);
        expect(result.fat, 80.0);
        expect(result.water, 2.0);
      });

      test('throws ServerException on network error', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.getNutritionTargets(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('setNutritionTargets', () {
      test('sends POST to nutrition target path', () async {
        const targets = NutritionTargets(
          calories: 2200,
          protein: 140,
          carbs: 280,
          fat: 70,
          water: 2.5,
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.setNutritionTargets(targets);

        verify(() => mockDio.post(
              '/health/nutrition/target',
              data: any(named: 'data'),
            )).called(1);
      });

      test('throws ServerException on network error', () async {
        const targets = NutritionTargets(
          calories: 2200,
          protein: 140,
          carbs: 280,
          fat: 70,
          water: 2.5,
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.setNutritionTargets(targets),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('NutritionTargets model', () {
      test('round-trip serialization', () {
        const targets = NutritionTargets(
          calories: 2200,
          protein: 140,
          carbs: 280,
          fat: 70,
          water: 2.5,
        );
        final json = targets.toJson();
        final restored = NutritionTargets.fromJson(
          Map<String, dynamic>.from(json),
        );

        expect(restored.calories, 2200);
        expect(restored.protein, 140);
        expect(restored.carbs, 280);
        expect(restored.fat, 70);
        expect(restored.water, 2.5);
      });

      test('copyWith modifies individual fields', () {
        const targets = NutritionTargets(
          calories: 2500,
          protein: 150,
          carbs: 300,
          fat: 80,
          water: 2.0,
        );
        final modified = targets.copyWith(
          calories: 2200,
          water: 3.0,
        );

        expect(modified.calories, 2200);
        expect(modified.protein, 150);
        expect(modified.water, 3.0);
      });

      test('target ring percentage calculation', () {
        const targets = NutritionTargets(
          calories: 2500,
          protein: 150,
          carbs: 300,
          fat: 80,
          water: 2.0,
        );

        final log = NutritionLog(
          id: 1,
          date: DateTime(2024, 6, 15),
          calories: 1250,
          protein: 75,
          carbs: 150,
          fat: 40,
          water: 1.0,
          createdAt: DateTime(2024, 6, 15),
        );

        final calPct = (log.calories / targets.calories).clamp(0.0, 1.0);
        final proteinPct = (log.protein / targets.protein).clamp(0.0, 1.0);
        final carbsPct = (log.carbs / targets.carbs).clamp(0.0, 1.0);
        final fatPct = (log.fat / targets.fat).clamp(0.0, 1.0);
        final waterPct = (log.water / targets.water).clamp(0.0, 1.0);

        expect(calPct, 0.5);
        expect(proteinPct, 0.5);
        expect(carbsPct, 0.5);
        expect(fatPct, 0.5);
        expect(waterPct, 0.5);
      });

      test('target ring exceeds 1.0 when over target', () {
        const targets = NutritionTargets(
          calories: 2500,
          protein: 150,
          carbs: 300,
          fat: 80,
          water: 2.0,
        );

        final log = NutritionLog(
          id: 1,
          date: DateTime(2024, 6, 15),
          calories: 3000,
          protein: 200,
          carbs: 400,
          fat: 100,
          water: 3.0,
          createdAt: DateTime(2024, 6, 15),
        );

        expect(
          (log.calories / targets.calories).clamp(0.0, 1.0),
          1.0,
        );
        expect(log.calories / targets.calories, 1.2);
      });
    });
  });
}
