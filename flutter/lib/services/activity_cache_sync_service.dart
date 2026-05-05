import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/constants/cache_keys.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';

class ActivityCacheSyncService {
  ActivityCacheSyncService({
    required this.dio,
    required this.localDatasource,
    required this.cacheDatasource,
  });

  final Dio dio;
  final LocalActivityDatasource localDatasource;
  final CacheDatasource cacheDatasource;

  Future<int> syncAllActivitiesToLocal({
    bool force = false,
    int limit = 100,
    int maxPages = 100,
  }) async {
    if (!force && !await _shouldRunFullActivitySync()) return 0;

    int offset = 0;
    bool hasMore = true;
    var pageCount = 0;
    var syncedCount = 0;
    final seenServerIds = <String>{};

    while (hasMore && pageCount < maxPages) {
      try {
        final response = await dio.get(
          ApiConstants.activitiesPath,
          queryParameters: {'limit': limit, 'offset': offset},
        );
        final result = ActivitiesResponse.fromJson(
          response.data as Map<String, dynamic>,
        ).toDomain();

        await localDatasource.upsertServerActivities(result.activities);
        for (final a in result.activities) {
          seenServerIds.add(a.id);
        }
        syncedCount += result.activities.length;
        hasMore = result.hasMore;
        offset += result.activities.length;
        pageCount++;
        if (result.activities.length < limit) break;
      } catch (e) {
        logger.warning('[ActivityCacheSync] Failed at page $pageCount: $e');
        break;
      }
    }

    final completedFullSync = !hasMore && pageCount < maxPages;
    await _markFullActivitySyncComplete(syncedCount);

    if (completedFullSync && seenServerIds.isNotEmpty) {
      await localDatasource.pruneSyncedActivitiesMissingFromServer(seenServerIds);
    }

    return syncedCount;
  }

  Future<bool> _shouldRunFullActivitySync() async {
    final cached = await cacheDatasource.get(CacheKeys.fullActivitySyncMeta);
    if (cached == null) return true;
    return cacheDatasource.isExpired(cached, const Duration(hours: 6));
  }

  Future<void> _markFullActivitySyncComplete(int count) async {
    await cacheDatasource.set(
      CacheKeys.fullActivitySyncMeta,
      jsonEncode({'lastSyncCount': count}),
    );
  }
}
