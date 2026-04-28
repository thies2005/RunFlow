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

  group('HealthApiRepositoryImpl', () {
    group('syncNutritionLog', () {
      test('sends POST to nutrition/log', () async {
        final log = NutritionLog(
          id: 1,
          date: DateTime(2024, 6, 15),
          calories: 2100,
          protein: 120,
          carbs: 250,
          fat: 70,
          water: 2.5,
          createdAt: DateTime(2024, 6, 15),
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.syncNutritionLog(log);

        verify(() => mockDio.post(
              '/health/nutrition/log',
              data: any(named: 'data'),
            )).called(1);
      });

      test('throws ServerException on network error', () async {
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

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.syncNutritionLog(log),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('searchFood', () {
      test('returns list of FoodItem from array response', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: [
                {
                  'id': 1,
                  'name': 'Apple',
                  'calories': 95.0,
                  'protein': 0.5,
                  'carbs': 25.0,
                  'fat': 0.3,
                  'servingSize': 182.0,
                },
              ],
            ));

        final results = await repository.searchFood('apple');

        expect(results.length, 1);
        expect(results.first.name, 'Apple');
      });

      test('returns list of FoodItem from envelope response', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'foods': [
                  {
                    'id': 2,
                    'name': 'Banana',
                    'calories': 105.0,
                    'protein': 1.3,
                    'carbs': 27.0,
                    'fat': 0.4,
                    'servingSize': 118.0,
                  },
                ],
              },
            ));

        final results = await repository.searchFood('banana');

        expect(results.length, 1);
        expect(results.first.name, 'Banana');
      });

      test('throws ServerException on DioException', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.searchFood('test'),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('scanBarcode', () {
      test('returns FoodItem when found', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'food': {
                  'id': 10,
                  'name': 'Protein Bar',
                  'calories': 200.0,
                  'protein': 20.0,
                  'carbs': 25.0,
                  'fat': 7.0,
                  'servingSize': 60.0,
                  'barcode': '1234567890',
                },
              },
            ));

        final result = await repository.scanBarcode('1234567890');

        expect(result, isNotNull);
        expect(result!.name, 'Protein Bar');
        expect(result.barcode, '1234567890');
      });

      test('returns null when barcode not found (404)', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              response: Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 404,
              ),
              type: DioExceptionType.badResponse,
            ));

        final result = await repository.scanBarcode('0000000000');

        expect(result, isNull);
      });

      test('throws on non-404 error', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              response: Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 500,
              ),
              type: DioExceptionType.badResponse,
            ));

        expect(
          () => repository.scanBarcode('123'),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getSupplements', () {
      test('returns supplements from list response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: [
                {
                  'id': 1,
                  'name': 'Vitamin D',
                  'dosage': '2000 IU',
                  'frequency': 'Daily',
                  'isActive': true,
                },
              ],
            ));

        final results = await repository.getSupplements();

        expect(results.length, 1);
        expect(results.first.name, 'Vitamin D');
      });

      test('returns supplements from envelope response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'supplements': [
                  {
                  'id': 2,
                  'name': 'Creatine',
                    'dosage': '5g',
                    'frequency': 'Daily',
                    'isActive': true,
                  },
                ],
              },
            ));

        final results = await repository.getSupplements();

        expect(results.length, 1);
        expect(results.first.name, 'Creatine');
      });
    });

    group('saveSupplementRemote', () {
      test('sends POST to supplements path', () async {
        const supplement = Supplement(
          id: 1,
          name: 'Zinc',
          dosage: '15mg',
          frequency: 'Daily',
          isActive: true,
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.saveSupplementRemote(supplement);

        verify(() => mockDio.post(
              '/health/supplements',
              data: any(named: 'data'),
            )).called(1);
      });
    });

    group('syncFasting', () {
      test('sends POST to fasting path', () async {
        final session = FastingSession(
          id: 1,
          startTime: DateTime(2024, 6, 15, 8, 0),
          duration: 480,
          isActive: true,
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.syncFasting(session);

        verify(() => mockDio.post(
              '/health/fasting',
              data: any(named: 'data'),
            )).called(1);
      });
    });

    group('syncBodyMeasurement', () {
      test('sends POST to body-composition path', () async {
        final measurement = BodyMeasurement(
          id: 1,
          date: DateTime(2024, 6, 15),
          weight: 75.5,
          bodyFat: 15.2,
        );

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.syncBodyMeasurement(measurement);

        verify(() => mockDio.post(
              '/health/body-composition',
              data: {
                'dateStr': '2024-06-15',
                'weight': 75.5,
                'bodyFat': 15.2,
              },
            )).called(1);
      });
    });

    group('getBodyMeasurements', () {
      test('parses mixed server payload types', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'measurements': [
                  {
                    'id': 'abc-1',
                    'dateStr': '2024-06-10',
                    'weight': 75.2,
                    'bodyFat': 14.8,
                    'waist': 81,
                  },
                  {
                    'id': 2,
                    'date': '2024-06-11T00:00:00.000Z',
                    'weight': '74.9',
                    'bodyFat': '14.5',
                  },
                ],
              },
            ));

        final result = await repository.getBodyMeasurements();

        expect(result, hasLength(2));
        expect(result.first.id, 0);
        expect(result.first.date, DateTime(2024, 6, 10));
        expect(result.first.weight, 75.2);
        expect(result.first.bodyFat, 14.8);
        expect(result.first.waist, 81);
        expect(result.last.id, 2);
        expect(result.last.weight, 74.9);
        expect(result.last.bodyFat, 14.5);
      });
    });

    group('batchSync', () {
      test('sends POST to sync-batch path', () async {
        final data = <String, dynamic>{
          'nutritionLogs': [],
          'supplements': [],
        };

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.batchSync(data);

        verify(() => mockDio.post(
              '/health/sync-batch',
              data: any(named: 'data'),
            )).called(1);
      });
    });

    group('getInsights', () {
      test('returns insights map', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'insights': []},
            ));

        final result = await repository.getInsights();

        expect(result, isA<Map<String, dynamic>>());
        expect(result.containsKey('insights'), true);
      });
    });
  });
}
