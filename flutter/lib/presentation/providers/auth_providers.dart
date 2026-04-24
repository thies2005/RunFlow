import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/data/interceptors/auth_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/error_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/refresh_interceptor.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/services/auth_service.dart';
import 'package:runflow_flutter/services/auth_service_impl.dart';

part 'auth_providers.g.dart';

@Riverpod(keepAlive: true)
AuthService authServiceImpl(Ref ref) {
  return AuthServiceImpl();
}

@Riverpod(keepAlive: true)
DioClient dioClient(Ref ref) {
  final authService = ref.watch(authServiceImplProvider);
  final dio = Dio();

  final client = DioClient(dio: dio);

  dio.interceptors.addAll([
    AuthInterceptor(authService: authService),
    RefreshInterceptor(authService: authService, dio: dio),
    ErrorInterceptor(),
  ]);

  return client;
}

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final authService = ref.watch(authServiceImplProvider);
  return AuthRepositoryImpl(
    dio: client.dio,
    authService: authService,
  );
}

@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  @override
  Future<User?> build() async {
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.restoreSession();
      return repo.getCurrentUser();
    } catch (_) {
      return null;
    }
  }

  Future<void> loginWithStravaCode(String code, {String? redirectUri}) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(authRepositoryProvider);
      final response = await repo.loginWithStravaCode(code, redirectUri: redirectUri);
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> loginWithEmail({
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(authRepositoryProvider);
      final response = await repo.loginWithEmail(
        email: email,
        password: password,
      );
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logout() async {
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.logout();
    } finally {
      state = const AsyncValue.data(null);
    }
  }
}

@Riverpod(keepAlive: true)
User? currentUser(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState is AsyncData<User?> ? authState.value : null;
}
