import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';

class ReadinessSyncService {
  ReadinessSyncService({required this.localDatasource, required this.dio});

  final ReadinessLocalDatasource localDatasource;
  final Dio dio;

  Future<int> flushPendingSync() async {
    final items = await localDatasource.getPendingReadinessSyncItems();
    if (items.isEmpty) return 0;

    int synced = 0;
    for (final item in items) {
      if (item.retryCount >= item.maxRetries) {
        await localDatasource.markSyncCompleted(item.id);
        continue;
      }

      try {
        final payload =
            jsonDecode(item.payloadJson) as Map<String, dynamic>;

        switch (item.entityType) {
          case 'readiness_daily_record':
            final record = DailyReadinessRecordModel.fromJson(payload);
            await dio.post(
              ApiConstants.readinessDailyPath,
              data: record.toJson(),
            );
            break;

          case 'readiness_baseline':
            final baseline = ReadinessBaselineModel.fromJson(payload);
            await dio.put(
              ApiConstants.readinessBaselinePath,
              data: baseline.toJson(),
            );
            break;

          case 'adapted_workout':
            final adapted = AdaptedWorkoutModel.fromJson(payload);
            await dio.post(
              '${ApiConstants.readinessDailyPath}/adapted-workout',
              data: adapted.toJson(),
            );
            break;

          case 'weekly_reconciliation':
            final weekly = WeeklyReconciliationRecordModel.fromJson(payload);
            await dio.post(
              ApiConstants.readinessWeeklyPath,
              data: weekly.toJson(),
            );
            break;
        }

        await localDatasource.markSyncCompleted(item.id);
        synced++;
      } catch (e) {
        logger.warning(
          '[ReadinessSyncService] Failed to sync ${item.entityType}: $e',
        );
        await localDatasource.incrementSyncRetry(item.id);
      }
    }
    return synced;
  }
}
