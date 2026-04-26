import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/services/fcm_service.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;

  setUpAll(() {
    registerFallbackValue(Options());
  });

  setUp(() {
    mockDio = MockDio();
  });

  group('registerPushToken', () {
    test('posts token to push register endpoint', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenAnswer((_) async => Response<dynamic>(
            requestOptions: RequestOptions(path: ''),
            statusCode: 200,
            data: null,
          ));

      final bool result = await registerPushToken(
        dio: mockDio,
        token: 'test_fcm_token_123',
      );

      expect(result, true);
      verify(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).called(1);
    });

    test('returns true on 404 (endpoint not ready)', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 404,
            ),
            type: DioExceptionType.badResponse,
          ));

      final bool result = await registerPushToken(
        dio: mockDio,
        token: 'test_fcm_token_123',
      );

      expect(result, true);
    });

    test('returns false on server error', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 500,
            ),
            type: DioExceptionType.badResponse,
          ));

      final bool result = await registerPushToken(
        dio: mockDio,
        token: 'test_fcm_token_123',
      );

      expect(result, false);
    });

    test('returns false on connection error', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenThrow(DioException(
            requestOptions: RequestOptions(path: ''),
            type: DioExceptionType.connectionError,
          ));

      final bool result = await registerPushToken(
        dio: mockDio,
        token: 'test_fcm_token_123',
      );

      expect(result, false);
    });

    test('returns false on unexpected exception', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenThrow(Exception('unexpected'));

      final bool result = await registerPushToken(
        dio: mockDio,
        token: 'test_fcm_token_123',
      );

      expect(result, false);
    });
  });
}
