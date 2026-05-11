import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/constants/cache_keys.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/dashboard_repository.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  DashboardRepositoryImpl({required this.dio, required this.cacheDatasource});

  final Dio dio;
  final CacheDatasource cacheDatasource;

  @override
  Future<domain.DashboardResponse> fetchDashboard() async {
    return _cacheFirst<domain.DashboardResponse>(
      cacheKey: CacheKeys.dashboard,
      fetch: _fetchDashboardFromApi,
      decode: (json) {
        final map = jsonDecode(json) as Map<String, dynamic>;
        return DashboardResponse.fromJson(map).toDomain();
      },
      encode: (dashboard) {
        final data = DashboardResponse(
          stats: dashboard.stats.toData(),
          recentActivities: dashboard.recentActivities.map((a) => a.toData()).toList(),
          goals: dashboard.goals.map((g) => g.toData()).toList(),
          syncStatus: dashboard.syncStatus.toData(),
          user: dashboard.user.toData(),
          todayWorkout: dashboard.todayWorkout?.toData(),
        );
        return jsonEncode(data.toJson());
      },
      maxAge: const Duration(minutes: 15),
    );
  }

  Future<domain.DashboardResponse> _fetchDashboardFromApi() async {
    final response = await dio.get(ApiConstants.dashboardPath);
    return DashboardResponse.fromJson(
      unwrapPayload(
        response.data as Map<String, dynamic>,
        const ['dashboard'],
      ),
    ).toDomain();
  }

  @override
  Future<domain.SyncResult> triggerSync() async {
    try {
      final response = await dio.post(ApiConstants.syncPath);
      return SyncResult.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncResult', 'sync'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        return const domain.SyncResult(
          success: true,
          activitiesSynced: 0,
          lastSyncAt: null,
        );
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Sync failed.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.SyncStatus> getSyncStatus() async {
    try {
      final response = await dio.get(ApiConstants.syncPath);
      final result = SyncStatus.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncStatus', 'sync'],
        ),
      ).toDomain();
      await cacheDatasource.set(
        CacheKeys.syncStatus,
        jsonEncode(result.toData().toJson()),
      );
      return result;
    } on DioException catch (e) {
      final cached = await cacheDatasource.get(CacheKeys.syncStatus);
      if (cached != null) {
        try {
          return SyncStatus.fromJson(
            jsonDecode(cached.data) as Map<String, dynamic>,
          ).toDomain();
        } catch (_) {}
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get sync status.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<T> _cacheFirst<T>({
    required String cacheKey,
    required Future<T> Function() fetch,
    required T Function(String) decode,
    required String Function(T) encode,
    Duration maxAge = const Duration(minutes: 15),
  }) async {
    final cached = await cacheDatasource.get(cacheKey);
    if (cached != null && !cacheDatasource.isExpired(cached, maxAge)) {
      unawaited(_refreshInBackground(cacheKey, fetch, encode));
      return decode(cached.data);
    }

    try {
      final result = await fetch();
      await cacheDatasource.set(cacheKey, encode(result));
      return result;
    } on DioException catch (_) {
      if (cached != null) return decode(cached.data);
      rethrow;
    }
  }

  Future<void> _refreshInBackground<T>(
    String key,
    Future<T> Function() fetch,
    String Function(T) encode,
  ) async {
    try {
      final result = await fetch();
      await cacheDatasource.set(key, encode(result));
    } catch (_) {}
  }
}
