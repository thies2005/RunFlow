import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/services/auth_service.dart';

class MockDio extends Mock implements Dio {}

class MockAuthService extends Mock implements AuthService {}

void main() {
  late MockDio mockDio;
  late MockAuthService mockAuthService;
  late AuthRepositoryImpl repository;

  setUpAll(() {
    registerFallbackValue(
      const User(id: 'fallback-user'),
    );
  });

  const testLoginResponse = {
    'accessToken': 'access_token_123',
    'refreshToken': 'refresh_token_456',
    'expiresIn': 3600,
    'tokenType': 'Bearer',
    'user': {'id': 'user-1', 'email': 'test@example.com', 'name': 'Test User'},
  };

  setUp(() {
    mockDio = MockDio();
    mockAuthService = MockAuthService();
    repository = AuthRepositoryImpl(dio: mockDio, authService: mockAuthService);
    when(() => mockAuthService.storeTokens(
          accessToken: any(named: 'accessToken'),
          refreshToken: any(named: 'refreshToken'),
        )).thenAnswer((_) async {});
    when(() => mockAuthService.storeUser(any())).thenAnswer((_) async {});
    when(() => mockAuthService.clearAll()).thenAnswer((_) async {});
  });

  group('AuthRepositoryImpl', () {
    group('loginWithStravaCode', () {
      test('success - stores tokens and returns LoginResponse', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testLoginResponse,
                ));

        final result = await repository.loginWithStravaCode('strava_code_123');

        expect(result.accessToken, 'access_token_123');
        expect(result.refreshToken, 'refresh_token_456');
        expect(result.user.id, 'user-1');

        verify(() => mockAuthService.storeTokens(
              accessToken: 'access_token_123',
              refreshToken: 'refresh_token_456',
            )).called(1);
        verify(() => mockAuthService.storeUser(any())).called(1);
      });

      test('success - sends code and optional redirectUri', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testLoginResponse,
                ));

        await repository.loginWithStravaCode('code_x', redirectUri: 'https://example.com');

        verify(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).called(1);
      });

      test('failure - throws AuthException on DioException', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.loginWithStravaCode('bad_code'),
          throwsA(isA<AuthException>()),
        );
      });

      test('failure - re-throws wrapped AppException', () async {
        const AuthException appException =
            AuthException(message: 'Custom auth error');
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              error: appException,
            ));

        expect(
          () => repository.loginWithStravaCode('code'),
          throwsA(same(appException)),
        );
      });
    });

    group('loginWithEmail', () {
      test('success - calls email login endpoint', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testLoginResponse,
                ));

        final result = await repository.loginWithEmail(
          email: 'test@example.com',
          password: 'password123',
        );

        expect(result.accessToken, 'access_token_123');
        verify(() => mockAuthService.storeTokens(
              accessToken: any(named: 'accessToken'),
              refreshToken: any(named: 'refreshToken'),
            )).called(1);
      });

      test('failure - throws AuthException on network error', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.loginWithEmail(email: 'test@test.com', password: 'pw'),
          throwsA(isA<AuthException>()),
        );
      });
    });

    group('register', () {
      test('success - stores tokens and returns LoginResponse', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: testLoginResponse,
                ));

        await repository.register(
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        );

        verify(() => mockAuthService.storeTokens(
              accessToken: any(named: 'accessToken'),
              refreshToken: any(named: 'refreshToken'),
            )).called(1);
      });

      test('failure - 409 throws AuthException with email-exists message', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              response: Response<dynamic>(
                requestOptions: RequestOptions(path: ''),
                statusCode: 409,
              ),
              type: DioExceptionType.badResponse,
            ));

        expect(
          () => repository.register(email: 'a@b.com', password: 'p', name: 'n'),
          throwsA(isA<AuthException>().having(
            (e) => e.message,
            'message',
            'An account with this email already exists.',
          )),
        );
      });
    });

    group('refreshToken', () {
      test('failure - does not clear tokens on 401', () async {
        when(() => mockAuthService.getRefreshToken())
            .thenAnswer((_) async => 'old_refresh');
        when(() => mockDio.post<Map<String, dynamic>>(
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

        expect(
          () => repository.refreshToken(),
          throwsA(isA<AuthException>()),
        );

        await Future<void>.delayed(Duration.zero);
        verifyNever(() => mockAuthService.clearAll());
      });
    });

    group('logout', () {
      test('clears all stored data', () async {
        await repository.logout();
        verify(() => mockAuthService.clearAll()).called(1);
      });
    });

    group('isLoggedIn', () {
      test('returns true when user is logged in', () async {
        when(() => mockAuthService.isLoggedIn).thenAnswer((_) async => true);
        expect(await repository.isLoggedIn(), true);
      });

      test('returns false when user is not logged in', () async {
        when(() => mockAuthService.isLoggedIn).thenAnswer((_) async => false);
        expect(await repository.isLoggedIn(), false);
      });
    });

    group('getCurrentUser', () {
      test('returns user when available', () async {
        const user = User(id: 'u1', email: 'test@test.com', name: 'Test');
        when(() => mockAuthService.getUser()).thenAnswer((_) async => user);
        final result = await repository.getCurrentUser();
        expect(result?.id, 'u1');
      });

      test('returns null when no user', () async {
        when(() => mockAuthService.getUser()).thenAnswer((_) async => null);
        final result = await repository.getCurrentUser();
        expect(result, isNull);
      });
    });

    group('forgotPassword', () {
      test('success - sends email to forgot-password endpoint', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: null,
                ));

        await repository.forgotPassword('test@example.com');
        verify(() => mockDio.post(any(), data: any(named: 'data'))).called(1);
      });

      test('failure - throws AuthException', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.forgotPassword('test@example.com'),
          throwsA(isA<AuthException>()),
        );
      });
    });

    group('restoreSession', () {
      test('throws AuthException when no stored refresh token', () async {
        when(() => mockAuthService.getAccessToken())
            .thenAnswer((_) async => null);
        when(() => mockAuthService.getRefreshToken())
            .thenAnswer((_) async => null);
        when(() => mockAuthService.getUser())
            .thenAnswer((_) async => null);

        expect(
          () => repository.restoreSession(),
          throwsA(isA<AuthException>()),
        );
      });
    });
  });
}
