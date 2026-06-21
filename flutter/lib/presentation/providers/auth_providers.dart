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
import 'package:runflow_flutter/presentation/providers/chat_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';
import 'package:runflow_flutter/domain/services/auth_service.dart';
import 'package:runflow_flutter/data/services/auth_service_impl.dart';
import 'package:runflow_flutter/data/services/background_sync.dart';
import 'package:runflow_flutter/data/services/fcm_service.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

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

final connectivityInterceptorProvider = Provider<Interceptor>((ref) {
  return ConnectivityInterceptor();
});

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
    ref.watch(connectivityInterceptorProvider),
    deduplicationInterceptor,
    AuthInterceptor(authService: authService),
    RefreshInterceptor(
      authService: authService,
      dio: dio,
      onSessionExpired: () {
        ref.read(authStateProvider.notifier).forceLogout();
      },
    ),
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
    } catch (e) {
      logger.debug('AuthState: Failed to restore session: $e');
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
      await _tearDownSession(serverLogout: true);
    } finally {
      state = const AsyncValue.data(null);
    }
  }

  void forceLogout() {
    // Session expired server-side (401 on refresh). We cannot hit the logout
    // endpoint with an invalid token, so set the unauthenticated state
    // immediately and run the same local teardown as logout.
    state = const AsyncValue.data(null);
    _tearDownSession(serverLogout: false);
  }

  Future<void> _tearDownSession({required bool serverLogout}) async {
    final repo = ref.read(authRepositoryProvider);

    // Stop background work and active services first.
    await BackgroundSyncService.cancel();
    ref.invalidate(fcmServiceProvider);
    ref.read(healthSyncServiceProvider).stopAutoSync();
    ref.invalidate(healthSyncServiceProvider);
    ref.invalidate(chatSessionsProvider);

    final recordingService = ref.read(recordingServiceProvider);
    recordingService.discardRecording();
    await recordingService.disconnectHeartRateMonitor();
    ref.read(deduplicationInterceptorProvider).close();

    // Invalidate server-side session (skipped on forceLogout: token is invalid).
    if (serverLogout) {
      await repo.logout();
    } else {
      repo.clearLocalSession();
    }

    // Clear all local user-scoped SQLite data so nothing leaks to the next
    // account that logs in on the same device.
    try {
      await AppDatabase.instance.clearUserData();
    } catch (e) {
      logger.warning('logout: failed to clear local user data: $e');
    }

    // Invalidate keepAlive repository/cache providers that hold in-memory or
    // SQLite-backed user data so stale state from the previous account does
    // not resurface.
    ref.invalidate(chatRepositoryProvider);
    ref.invalidate(dashboardRepositoryProvider);
    ref.invalidate(activityRepositoryProvider);
    ref.invalidate(localActivityDatasourceProvider);
    ref.invalidate(profileRepositoryProvider);
    ref.invalidate(goalRepositoryProvider);
    ref.invalidate(analyticsRepositoryProvider);
    ref.invalidate(healthApiRepositoryProvider);
    ref.invalidate(readinessRepositoryProvider);
    ref.invalidate(cacheDatasourceProvider);

    AppDatabase.instance.close();
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
