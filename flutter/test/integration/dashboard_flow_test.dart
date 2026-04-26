import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/repositories/dashboard_repository_impl.dart';

void main() {
  group('Dashboard flow integration', () {
    late Dio dio;
    late DashboardRepositoryImpl repository;

    final testDashboard = DashboardResponse(
      stats: const AnalyticsStats(
        currentWeekMileage: 42.5,
        effectiveVO2max: 52.3,
        rawVO2max: 51.0,
        vdotCorrectionFactor: 1.02,
        marathonShape: 6.5,
        currentVdot: 52.1,
        ctl: 45.0,
        atl: 30.0,
        tsb: 15.0,
        workloadRatio: 1.2,
        easyTrimp: 100.0,
        hrMax: 190,
      ),
      recentActivities: [
        Activity(
          id: 'act1',
          stravaId: '12345',
          type: ActivityType.run,
          name: 'Morning Run',
          startDate: DateTime(2024, 6, 15, 7, 30),
          distance: 8500.0,
          movingTime: 2700,
          averageSpeed: 3.15,
          averageHr: 145.0,
          maxHr: 175,
          averageCadence: 180.0,
          hasHeartrate: true,
          totalElevation: 120.0,
          trimp: null,
          runningTss: null,
          estimatedVdot: null,
          trainingType: null,
        ),
      ],
      goals: [],
      syncStatus: SyncStatus(
        syncInProgress: false,
        lastSyncAt: DateTime(2024, 6, 15),
        totalActivities: 42,
      ),
      user: const User(id: 'u1', email: 'test@test.com', name: 'Test'),
    );

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: ApiConstants.fullApiUrl));
      repository = DashboardRepositoryImpl(dio: dio);
    });

    test('fetch caches dashboard data', () async {
      dio.httpClientAdapter = _DashboardSuccessAdapter(testDashboard);

      final result = await repository.fetchDashboard();
      expect(result.stats.marathonShape, 6.5);
    });

    test('offline fallback returns cached data', () async {
      dio.httpClientAdapter = _DashboardSuccessAdapter(testDashboard);
      await repository.fetchDashboard();

      dio.httpClientAdapter = _NetworkErrorAdapter();

      final result = await repository.fetchDashboard();
      expect(result.stats.marathonShape, 6.5);
      expect(result.recentActivities.length, 1);
    });

    test('re-fetch updates cache with new data', () async {
      dio.httpClientAdapter = _DashboardSuccessAdapter(testDashboard);
      final first = await repository.fetchDashboard();
      expect(first.stats.marathonShape, 6.5);

      final updatedDashboard = testDashboard.copyWith(
        stats: testDashboard.stats.copyWith(marathonShape: 99.0),
      );
      dio.httpClientAdapter = _DashboardSuccessAdapter(updatedDashboard);

      final second = await repository.fetchDashboard();
      expect(second.stats.marathonShape, 99.0);
    });

    test('first fetch with network error and no cache throws', () async {
      dio.httpClientAdapter = _NetworkErrorAdapter();

      expect(
        () => repository.fetchDashboard(),
        throwsA(isA<Exception>()),
      );
    });

    test('triggerSync returns SyncResult', () async {
      dio.httpClientAdapter = _SyncSuccessAdapter();

      final result = await repository.triggerSync();
      expect(result.success, true);
      expect(result.activitiesSynced, 5);
    });
  });
}

class _DashboardSuccessAdapter implements HttpClientAdapter {
  _DashboardSuccessAdapter(this.dashboard);

  final DashboardResponse dashboard;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'dashboard': dashboard.toJson()}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _NetworkErrorAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException(
      requestOptions: options,
      type: DioExceptionType.connectionError,
    );
  }
}

class _SyncSuccessAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'syncResult': {
          'success': true,
          'activitiesSynced': 5,
          'lastSyncAt': '2024-06-15T12:00:00Z',
        },
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
