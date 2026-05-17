import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/constants/cache_keys.dart';

import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/analytics_repository.dart';

class AnalyticsRepositoryImpl implements AnalyticsRepository {
  AnalyticsRepositoryImpl({required this.dio, required this.cacheDatasource});

  final Dio dio;
  final CacheDatasource cacheDatasource;

  @override
  Future<domain.AnalyticsStats> getStats() async {
    return _cacheFirst<domain.AnalyticsStats>(
      cacheKey: CacheKeys.analyticsStats,
      fetch: _fetchStatsFromApi,
      decode: (json) => AnalyticsStats.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      ).toDomain(),
      encode: (stats) => jsonEncode(stats.toData().toJson()),
      maxAge: const Duration(minutes: 30),
    );
  }

  Future<domain.AnalyticsStats> _fetchStatsFromApi() async {
    final response = await dio.get(ApiConstants.analyticsStatsPath);
    return AnalyticsStats.fromJson(
      unwrapPayload(
        response.data as Map<String, dynamic>,
        const ['analyticsStats', 'stats'],
      ),
    ).toDomain();
  }

  @override
  Future<List<domain.FitnessHistory>> getHistory({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final days = endDate.difference(startDate).inDays;
    final cacheKey = _historyCacheKey(days);
    return _cacheFirst<List<domain.FitnessHistory>>(
      cacheKey: cacheKey,
      fetch: () => _fetchHistoryFromApi(startDate: startDate, endDate: endDate),
      decode: (json) {
        final list = jsonDecode(json) as List;
        return list.map((e) {
          final m = e as Map<String, dynamic>;
          final metricsMap = m['metrics'] as Map<String, dynamic>;
          return domain.FitnessHistory(
            date: DateTime.parse(m['date'] as String),
            metrics: domain.FitnessHistoryMetrics(
              ctl: (metricsMap['ctl'] as num).toDouble(),
              atl: (metricsMap['atl'] as num).toDouble(),
              tsb: (metricsMap['tsb'] as num).toDouble(),
              ctlRunning: (metricsMap['ctlRunning'] as num?)?.toDouble() ?? 0.0,
            ),
          );
        }).toList();
      },
      encode: (history) => jsonEncode(history.map((h) {
        return {
          'date': h.date.toIso8601String(),
          'metrics': {
            'ctl': h.metrics.ctl,
            'atl': h.metrics.atl,
            'tsb': h.metrics.tsb,
            'ctlRunning': h.metrics.ctlRunning,
          },
        };
      }).toList()),
      maxAge: const Duration(hours: 1),
    );
  }

  Future<List<domain.FitnessHistory>> _fetchHistoryFromApi({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final response = await dio.get(
      ApiConstants.analyticsHistoryPath,
      queryParameters: {
        'startDate': startDate.toUtc().toIso8601String(),
        'endDate': endDate.toUtc().toIso8601String(),
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) return [];

    final ctlList = (data['ctl'] as List?) ?? [];
    final atlList = (data['atl'] as List?) ?? [];
    final tsbList = (data['tsb'] as List?) ?? [];

    final atlByDate = <String, double>{};
    for (final item in atlList) {
      final m = item as Map<String, dynamic>;
      atlByDate[m['date'] as String] = (m['value'] as num?)?.toDouble() ?? 0.0;
    }

    final tsbByDate = <String, double>{};
    for (final item in tsbList) {
      final m = item as Map<String, dynamic>;
      tsbByDate[m['date'] as String] = (m['value'] as num?)?.toDouble() ?? 0.0;
    }

    final result = <domain.FitnessHistory>[];
    for (final item in ctlList) {
      final m = item as Map<String, dynamic>;
      final dateStr = m['date'] as String;
      final ctlVal = (m['value'] as num?)?.toDouble() ?? 0.0;
      result.add(domain.FitnessHistory(
        date: DateTime.parse(dateStr),
        metrics: domain.FitnessHistoryMetrics(
          ctl: ctlVal,
          atl: atlByDate[dateStr] ?? 0.0,
          tsb: tsbByDate[dateStr] ?? 0.0,
          ctlRunning: 0.0,
        ),
      ));
    }

    return result;
  }

  String _historyCacheKey(int days) {
    if (days <= 30) return CacheKeys.analyticsHistory30;
    if (days <= 60) return CacheKeys.analyticsHistory60;
    if (days <= 90) return CacheKeys.analyticsHistory90;
    return CacheKeys.analyticsHistory365;
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
    } catch (e) {
      debugPrint('AnalyticsRepository: Background cache refresh failed for $key: $e');
    }
  }
}
