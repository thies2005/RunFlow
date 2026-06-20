import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;

class OfflineSyncService {
  OfflineSyncService({required this.localDatasource, required this.dio});

  final LocalActivityDatasource localDatasource;
  final Dio dio;

  Future<int> flushPendingSync() async {
    final items = await localDatasource.getPendingSyncItems();
    if (items.isEmpty) return 0;

    int synced = 0;
    for (final item in items) {
      if (item.retryCount >= item.maxRetries) {
        // Permanently failed: retain as a dead-letter record (do NOT delete)
        // so the data is recoverable and surfaced, rather than silently lost.
        logger.warning(
          '[OfflineSyncService] Skipping permanently-failed '
          '${item.entityType} item ${item.id} (exceeded ${item.maxRetries} retries; retained)',
        );
        continue;
      }

      try {
        final payload = jsonDecode(item.payloadJson) as Map<String, dynamic>;
        domain.Activity? enrichedActivity;

        switch (item.entityType) {
          case 'activity_create':
          case 'manual_activity_create':
            final response = await dio.post(
              ApiConstants.activitiesPath,
              data: payload,
            );
            final activityPayload = unwrapPayload(
              Map<String, dynamic>.from(response.data as Map),
              const ['activity'],
            );
            enrichedActivity = Activity.fromJson(activityPayload).toDomain();
            await localDatasource.markActivitySynced(
              item.localId,
              enrichedActivity.id,
              enrichedActivity,
            );
            break;

          case 'activity_update':
            final activityId = payload['activityId'] as String;
            final updatePayload = Map<String, dynamic>.from(payload)
              ..remove('activityId');
            await dio.put(
              '${ApiConstants.activitiesPath}/$activityId',
              data: updatePayload,
            );
            break;
        }

        await localDatasource.markSyncCompleted(item.id);
        synced++;
      } catch (e) {
        logger.warning('[OfflineSyncService] Failed to sync ${item.entityType}: $e');
        await localDatasource.incrementSyncRetry(item.id);
      }
    }
    return synced;
  }
}
