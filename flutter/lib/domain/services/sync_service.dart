import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

abstract class SyncService {
  Future<void> triggerSync();
  Future<DateTime?> getLastSyncTime();
  Future<bool> isSyncing();
}

class SyncServiceImpl implements SyncService {
  SyncServiceImpl({required Dio dio}) : _dio = dio;

  final Dio _dio;
  bool _isSyncing = false;

  @override
  Future<void> triggerSync() async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      await _dio.post(ApiConstants.syncPath);
    } finally {
      _isSyncing = false;
    }
  }

  @override
  Future<DateTime?> getLastSyncTime() async {
    try {
      final response = await _dio.get(ApiConstants.syncPath);
      final status = SyncStatus.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncStatus', 'sync'],
        ),
      );
      return status.lastSyncAt;
    } catch (e) {
      logger.debug('SyncService: Failed to get last sync time: $e');
      return null;
    }
  }

  @override
  Future<bool> isSyncing() async => _isSyncing;
}
