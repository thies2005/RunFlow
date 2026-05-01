import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/data/interceptors/auth_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/connectivity_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/deduplication_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/error_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/refresh_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/retry_interceptor.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/data/repositories/auth_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/services/auth_service.dart';
import 'package:runflow_flutter/services/auth_service_impl.dart';
import 'package:runflow_flutter/services/background_sync.dart';
import 'package:runflow_flutter/services/fcm_service.dart';

part 'auth_providers.g.dart';

final fcmServiceProvider = Provider<FcmService>((ref) {
  final dio = ref.watch(dioClientProvider).dio;
  final service = FcmService(dio: dio);
  ref.onDispose(() {
    service.dispose();
  });
  return service;
});

@Riverpod(keepAlive: true)
AuthService authServiceImpl(Ref ref) {
  return AuthServiceImpl();
}

final deduplicationInterceptorProvider =
    Provider<DeduplicationInterceptor>((ref) {
  final interceptor = DeduplicationInterceptor();
  ref.onDispose(() {
    interceptor.close();
  });
  return interceptor;
});

@Riverpod(keepAlive: true)
DioClient dioClient(Ref ref) {
  final authService = ref.watch(authServiceImplProvider);
  final deduplicationInterceptor = ref.watch(deduplicationInterceptorProvider);
  final dio = Dio();

  final client = DioClient(dio: dio);

  dio.interceptors.addAll([
    ConnectivityInterceptor(),
    deduplicationInterceptor,
    AuthInterceptor(authService: authService),
    RefreshInterceptor(authService: authService, dio: dio),
    RetryInterceptor(dio: dio),
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
      ref.read(healthSyncServiceProvider).startAutoSync();
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
      ref.read(healthSyncServiceProvider).startAutoSync();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logout() async {
    try {
      await BackgroundSyncService.cancel();
      ref.invalidate(fcmServiceProvider);
      ref.read(healthSyncServiceProvider).stopAutoSync();
      ref.invalidate(healthSyncServiceProvider);
      final recordingService = ref.read(recordingServiceProvider);
      recordingService.discardRecording();
      await recordingService.disconnectHeartRateMonitor();
      ref.read(deduplicationInterceptorProvider).close();
      final repo = ref.read(authRepositoryProvider);
      await repo.logout();
      AppDatabase.instance.close();
    } finally {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.register(
        email: email,
        password: password,
        name: name,
      );
      final user = await repo.getCurrentUser();
      state = AsyncValue.data(user);
      ref.read(healthSyncServiceProvider).startAutoSync();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> forgotPassword(String email) async {
    final repo = ref.read(authRepositoryProvider);
    await repo.forgotPassword(email);
  }
}

@Riverpod(keepAlive: true)
User? currentUser(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState is AsyncData<User?> ? authState.value : null;
}
