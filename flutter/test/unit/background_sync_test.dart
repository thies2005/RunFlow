import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/services/background_sync.dart';

class MockDio extends Mock implements Dio {}

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;

  setUpAll(() {
    registerFallbackValue(Options());
  });

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();
  });

  group('performBackgroundSync', () {
    test('returns true when no access token', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => null);

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, true);
      verifyNever(
        () => mockDio.post(
          any(),
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      );
    });

    test('returns true when empty access token', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => '');

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, true);
      verifyNever(() => mockDio.post(any()));
    });

    test('calls sync endpoint and returns true on success', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenAnswer((_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 200,
            data: <String, dynamic>{'success': true},
          ));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, true);
      verify(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).called(1);
    });

    test('returns true on 401 auth error', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'expired_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 401,
            ),
            type: DioExceptionType.badResponse,
          ));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, false);
    });

    test('returns true on connection error (offline)', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            type: DioExceptionType.connectionError,
          ));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, false);
    });

    test('returns true on unknown error (offline fallback)', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            type: DioExceptionType.unknown,
          ));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, false);
    });

    test('returns false on server error', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 500,
            ),
            type: DioExceptionType.badResponse,
          ));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, false);
    });

    test('returns false on unexpected exception', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'valid_token');
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(Exception('unexpected'));

      final bool result = await performBackgroundSync(
        storage: mockStorage,
        dio: mockDio,
      );

      expect(result, false);
    });
  });
}
