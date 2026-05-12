import 'package:dio/dio.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';
import 'package:runflow_flutter/data/interceptors/auth_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/error_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/refresh_interceptor.dart';
import 'package:runflow_flutter/data/interceptors/retry_interceptor.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/services/activity_cache_sync_service.dart';
import 'package:runflow_flutter/services/auth_service_impl.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';
import 'package:runflow_flutter/services/offline_sync_service.dart';
import 'package:runflow_flutter/services/readiness_orchestrator.dart';
import 'package:runflow_flutter/services/readiness_sync_service.dart';
import 'package:workmanager/workmanager.dart';

String _dateKey(DateTime dt) {
  return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
}

Future<bool> performBackgroundSync({
  required FlutterSecureStorage storage,
  required Dio dio,
}) async {
  try {
    final accessToken = await storage.read(key: 'access_token');
    if (accessToken == null || accessToken.isEmpty) return true;

    final localDs = LocalActivityDatasource(database: AppDatabase.instance);

    try {
      final offlineSync = OfflineSyncService(localDatasource: localDs, dio: dio);
      await offlineSync.flushPendingSync();
    } catch (e) {
      logger.warning('[BackgroundSync] Failed to flush pending activities: $e');
    }

    try {
      final cacheDatasource = CacheDatasource(database: AppDatabase.instance);
      final cacheSync = ActivityCacheSyncService(
        dio: dio,
        localDatasource: localDs,
        cacheDatasource: cacheDatasource,
      );
      await cacheSync.syncAllActivitiesToLocal();
    } catch (e) {
      logger.warning('[BackgroundSync] Activity cache sync failed: $e');
    }

    try {
      final readinessDb = AppDatabase.instance;
      await readinessDb.initialize();
      final readinessLocal = ReadinessLocalDatasource(db: await readinessDb.database);
      final readinessSync = ReadinessSyncService(localDatasource: readinessLocal, dio: dio);
      await readinessSync.flushPendingSync();

      final todayKey = _dateKey(DateTime.now());
      final isStale = await readinessLocal.isRecordStale(todayKey);
      if (isStale) {
        final healthConnect = HealthConnectServiceImpl(health: Health());
        const scoringService = ReadinessScoringService();
        const trimpService = TrimpService();
        final orchestrator = ReadinessOrchestrator(
          healthConnect: healthConnect,
          scoringService: scoringService,
          trimpService: trimpService,
        );
        try {
          final inputs = await orchestrator.collectInputs(maxHr: null, restingHr: null, age: null);
          final result = await orchestrator.computeReadiness(inputs: inputs);
          final record = DailyReadinessRecordModel(
            date: todayKey,
            compositeScore: result.compositeScore,
            state: result.state.name,
            confidence: result.confidence.name,
            componentScores: result.componentScores
                .map((c) => ComponentScoreModel(
                      component: c.component.name,
                      score: c.score,
                      isAvailable: c.isAvailable,
                      reason: c.reason,
                    ))
                .toList(),
            reasons: result.reasons,
            computedAt: DateTime.now().toIso8601String(),
          );
          await readinessLocal.upsertDailyRecord(record);
          await readinessLocal.enqueueSync(
            entityType: 'readiness_daily_record',
            localId: todayKey,
            payload: record.toJson(),
          );
        } catch (e) {
          logger.warning('[BackgroundSync] Readiness computation failed: $e');
        }
      }
    } catch (e) {
      logger.warning('[BackgroundSync] Readiness sync failed: $e');
    }

    await dio.post(
      ApiConstants.syncPath,
      data: {},
    );
    return true;
  } on DioException catch (e) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return true;
    if (statusCode != null && statusCode >= 500) return false;
    return false;
  } catch (_) {
    return false;
  }
}

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == 'backgroundSync') {
      const storage = FlutterSecureStorage();
      final authService = AuthServiceImpl(storage: storage);
      final dio = Dio(BaseOptions(
        baseUrl: ApiConstants.fullApiUrl,
        connectTimeout: ApiConstants.connectTimeout,
        sendTimeout: const Duration(seconds: 30),
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ));

      dio.interceptors.addAll([
        AuthInterceptor(authService: authService),
        RefreshInterceptor(authService: authService, dio: dio),
        RetryInterceptor(dio: dio),
        ErrorInterceptor(),
      ]);

      return performBackgroundSync(storage: storage, dio: dio);
    }
    return true;
  });
}

class BackgroundSyncService {
  BackgroundSyncService._();

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Workmanager().initialize(callbackDispatcher);
      _initialized = true;
    } catch (e) {
      logger.error('[BackgroundSyncService] Initialize failed: $e');
    }
  }

  static Future<void> registerPeriodicSync() async {
    if (!_initialized) return;

    try {
      await Workmanager().registerPeriodicTask(
        'runflow-background-sync',
        'backgroundSync',
        frequency: const Duration(minutes: 30),
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      );
    } catch (e) {
      logger.error('[BackgroundSyncService] Register periodic sync failed: $e');
    }
  }

  static Future<void> cancel() async {
    if (!_initialized) return;

    try {
      await Workmanager().cancelByUniqueName('runflow-background-sync');
    } catch (e) {
      logger.error('[BackgroundSyncService] Cancel failed: $e');
    }
  }
}
