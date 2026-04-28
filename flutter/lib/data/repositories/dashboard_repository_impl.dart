import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/repositories/dashboard_repository.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  DashboardRepositoryImpl({required this.dio});

  final Dio dio;
  DashboardResponse? _cachedDashboard;
  DateTime? _cachedAt;

  static const _cacheTtl = Duration(minutes: 5);

  @override
  bool get isCacheStale {
    if (_cachedDashboard == null || _cachedAt == null) return true;
    return DateTime.now().difference(_cachedAt!) > _cacheTtl;
  }

  @override
  Future<DashboardResponse> fetchDashboard() async {
    try {
      final response = await dio.get(ApiConstants.dashboardPath);
      final result = DashboardResponse.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['dashboard'],
        ),
      );
      _cachedDashboard = result;
      _cachedAt = DateTime.now();
      return result;
    } on DioException catch (e) {
      if (_cachedDashboard != null) return _cachedDashboard!;
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load dashboard.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<SyncResult> triggerSync() async {
    try {
      final response = await dio.post(ApiConstants.syncPath);
      return SyncResult.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncResult', 'sync'],
        ),
      );
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
  Future<SyncStatus> getSyncStatus() async {
    try {
      final response = await dio.get(ApiConstants.syncPath);
      return SyncStatus.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['syncStatus', 'sync'],
        ),
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get sync status.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
