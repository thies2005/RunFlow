import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:workmanager/workmanager.dart';

Future<bool> performBackgroundSync({
  required FlutterSecureStorage storage,
  required Dio dio,
}) async {
  try {
    final accessToken = await storage.read(key: 'access_token');
    if (accessToken == null || accessToken.isEmpty) return true;

    await dio.post(
      '${ApiConstants.fullApiUrl}${ApiConstants.syncPath}',
      data: {},
      options: Options(
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      ),
    );
    return true;
  } on DioException catch (e) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return true;
    if (statusCode != null && statusCode >= 500) return false;
    return true;
  } catch (_) {
    return false;
  }
}

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == 'backgroundSync') {
      const storage = FlutterSecureStorage();
      final dio = Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
      ));
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
      debugPrint('[BackgroundSyncService] Initialize failed: $e');
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
      debugPrint('[BackgroundSyncService] Register periodic sync failed: $e');
    }
  }

  static Future<void> cancel() async {
    if (!_initialized) return;

    try {
      await Workmanager().cancelByUniqueName('runflow-background-sync');
    } catch (e) {
      debugPrint('[BackgroundSyncService] Cancel failed: $e');
    }
  }
}
