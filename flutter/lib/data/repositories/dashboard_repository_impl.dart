import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/dashboard_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  DashboardRepositoryImpl({required this.dio});

  final Dio dio;
  domain.DashboardResponse? _cachedDashboard;

  static const _cacheKey = 'dashboard_cache';

  @override
  Future<domain.DashboardResponse> fetchDashboard() async {
    try {
      final response = await dio.get(ApiConstants.dashboardPath);
      final result = DashboardResponse.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['dashboard'],
        ),
      ).toDomain();
      _cachedDashboard = result;
      _persistCache(result);
      return result;
    } on DioException catch (e) {
      if (_cachedDashboard != null) return _cachedDashboard!;
      final restored = await _restoreCache();
      if (restored != null) return restored;
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load dashboard.',
              statusCode: e.response?.statusCode,
            );
    }
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
      return SyncStatus.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncStatus', 'sync'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get sync status.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<void> _persistCache(domain.DashboardResponse dashboard) async {
    try {
      final data = DashboardResponse(
        stats: dashboard.stats.toData(),
        recentActivities: dashboard.recentActivities.map((a) => a.toData()).toList(),
        goals: dashboard.goals.map((g) => g.toData()).toList(),
        syncStatus: dashboard.syncStatus.toData(),
        user: dashboard.user.toData(),
        todayWorkout: dashboard.todayWorkout?.toData(),
      );
      final json = data.toJson();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(json));
    } catch (_) {}
  }

  Future<domain.DashboardResponse?> _restoreCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_cacheKey);
      if (cached == null) return null;
      final json = jsonDecode(cached) as Map<String, dynamic>;
      final result = DashboardResponse.fromJson(json).toDomain();
      _cachedDashboard = result;
      return result;
    } catch (_) {
      return null;
    }
  }
}
