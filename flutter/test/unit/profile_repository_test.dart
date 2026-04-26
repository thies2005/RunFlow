import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/data/repositories/profile_repository_impl.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late ProfileRepositoryImpl repository;

  final testProfile = UserProfile(
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    sex: null,
    birthDate: null,
    hrMax: 185,
    hrRest: 55,
    weight: 75.0,
    height: 180.0,
    hrZone1Max: 120,
    hrZone2Max: 140,
    hrZone3Max: 160,
    hrZone4Max: 175,
    hrZone5Max: 185,
    hrZone6Max: 200,
    thresholdHeartRate: 165,
    thresholdPace: 300,
    vdotCorrectionFactor: 1.0,
    createdAt: DateTime(2024, 1, 1),
  );

  setUp(() {
    mockDio = MockDio();
    repository = ProfileRepositoryImpl(dio: mockDio);
  });

  group('ProfileRepositoryImpl', () {
    group('getProfile', () {
      test('success - returns UserProfile from user envelope', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'user': testProfile.toJson()},
            ));

        final result = await repository.getProfile();
        expect(result.id, 'user-1');
        expect(result.name, 'Test User');
        expect(result.hrMax, 185);
        expect(result.weight, 75.0);
      });

      test('success - returns UserProfile from flat response', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: testProfile.toJson(),
            ));

        final result = await repository.getProfile();
        expect(result.id, 'user-1');
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.getProfile(),
          throwsA(isA<ServerException>()),
        );
      });

      test('failure - re-throws wrapped AppException', () async {
        const ServerException appException =
            ServerException(message: 'custom');
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          error: appException,
        ));

        expect(
          () => repository.getProfile(),
          throwsA(same(appException)),
        );
      });
    });

    group('updateProfile', () {
      test('success - sends PUT and returns updated UserProfile', () async {
        const UpdateProfileRequest request = UpdateProfileRequest(
          name: 'Updated Name',
          weight: 76.0,
          hrMax: 190,
        );
        final UserProfile updatedProfile =
            testProfile.copyWith(name: 'Updated Name', weight: 76.0, hrMax: 190);

        when(() => mockDio.put(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'user': updatedProfile.toJson()},
                ));

        final result = await repository.updateProfile(request);
        expect(result.name, 'Updated Name');
        expect(result.weight, 76.0);
        expect(result.hrMax, 190);
      });

      test('failure - throws ServerException on DioException', () async {
        const UpdateProfileRequest request = UpdateProfileRequest(name: 'X');

        when(() => mockDio.put(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              response: Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 400,
              ),
              type: DioExceptionType.badResponse,
            ));

        expect(
          () => repository.updateProfile(request),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('deleteAccount', () {
      test('success - sends DELETE request', () async {
        when(() => mockDio.delete(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: null,
            ));

        await repository.deleteAccount();
        verify(() => mockDio.delete(any())).called(1);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.delete(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.deleteAccount(),
          throwsA(isA<ServerException>()),
        );
      });
    });
  });
}
