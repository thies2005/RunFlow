import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/datasources/remote/readiness_remote_datasource.dart';
import 'package:runflow_flutter/data/mappers/readiness_mappers.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/repositories/readiness_repository.dart';

class ReadinessRepositoryImpl implements ReadinessRepository {
  ReadinessRepositoryImpl({
    required this.localDatasource,
    required this.remoteDatasource,
  });

  final ReadinessLocalDatasource localDatasource;
  final ReadinessRemoteDatasource remoteDatasource;

  String _dateKey(DateTime date) {
    final utc = date.toUtc();
    return '${utc.year.toString().padLeft(4, '0')}-${utc.month.toString().padLeft(2, '0')}-${utc.day.toString().padLeft(2, '0')}';
  }

  @override
  Future<DailyReadinessRecord?> getDailyRecord(DateTime date) async {
    final key = _dateKey(date);
    final model = await localDatasource.getDailyRecord(key);
    return model?.toDomain();
  }

  @override
  Future<DailyReadinessRecord> saveDailyRecord(
    DailyReadinessRecord record,
  ) async {
    final model = record.toData();
    await localDatasource.upsertDailyRecord(model);

    try {
      final synced = await remoteDatasource.upsertDailyRecord(model);
      final updated = synced.copyWith(syncedAt: DateTime.now().toIso8601String());
      await localDatasource.upsertDailyRecord(updated);
      return updated.toDomain();
    } on DioException catch (_) {
      await localDatasource.enqueueSync(
        entityType: 'readiness_daily_record',
        localId: model.date,
        payload: model.toJson(),
      );
      return record;
    }
  }

  @override
  Future<DailyReadinessRecord> updateOverride(
    DateTime date,
    ReadinessOverride override,
  ) async {
    final key = _dateKey(date);
    final existing = await localDatasource.getDailyRecord(key);
    if (existing == null) {
      throw const CacheException(message: 'No daily record found for override.');
    }

    final updated = existing.copyWith(readinessOverride: override.toData());
    await localDatasource.upsertDailyRecord(updated);

    try {
      await remoteDatasource.patchOverride(key, override.toData().toJson());
      final synced = updated.copyWith(syncedAt: DateTime.now().toIso8601String());
      await localDatasource.upsertDailyRecord(synced);
      return synced.toDomain();
    } on DioException catch (_) {
      await localDatasource.enqueueSync(
        entityType: 'readiness_daily_record',
        localId: key,
        payload: updated.toJson(),
      );
      return updated.toDomain();
    }
  }

  @override
  Future<List<DailyReadinessRecord>> getHistory(
    DateTime start,
    DateTime end,
  ) async {
    final models = await localDatasource.getHistory(
      _dateKey(start),
      _dateKey(end),
    );
    return models.map((m) => m.toDomain()).toList();
  }

  @override
  Future<ReadinessBaseline?> getBaseline() async {
    final model = await localDatasource.getBaseline();
    return model?.toDomain();
  }

  @override
  Future<ReadinessBaseline> saveBaseline(ReadinessBaseline baseline) async {
    final model = baseline.toData();
    await localDatasource.upsertBaseline(model);

    try {
      final synced = await remoteDatasource.upsertBaseline(model);
      final updated = synced.copyWith(
        lastUpdated: DateTime.now().toIso8601String(),
      );
      await localDatasource.upsertBaseline(updated);
      return updated.toDomain();
    } on DioException catch (_) {
      await localDatasource.enqueueSync(
        entityType: 'readiness_baseline',
        localId: 'baseline',
        payload: model.toJson(),
      );
      return baseline;
    }
  }

  @override
  Future<AdaptedWorkout?> getAdaptedWorkout(String originalWorkoutId) async {
    final model =
        await localDatasource.getAdaptedWorkout(originalWorkoutId);
    return model?.toDomain();
  }

  @override
  Future<AdaptedWorkout> saveAdaptedWorkout(AdaptedWorkout adapted) async {
    final model = adapted.toData();
    await localDatasource.upsertAdaptedWorkout(model);

    try {
      final synced = await remoteDatasource.upsertAdaptedWorkout(model);
      final updated = synced.copyWith(
        syncedAt: DateTime.now().toIso8601String(),
      );
      await localDatasource.upsertAdaptedWorkout(updated);
      return updated.toDomain();
    } on DioException catch (_) {
      await localDatasource.enqueueSync(
        entityType: 'adapted_workout',
        localId: model.id,
        payload: model.toJson(),
      );
      return adapted;
    }
  }

  @override
  Future<WeeklyReconciliationRecord?> getWeeklyRecord(
    DateTime weekStartDate,
  ) async {
    final key = _dateKey(weekStartDate);
    final model = await localDatasource.getWeeklyRecord(key);
    return model?.toDomain();
  }

  @override
  Future<WeeklyReconciliationRecord> saveWeeklyRecord(
    WeeklyReconciliationRecord record,
  ) async {
    final model = record.toData();
    await localDatasource.upsertWeeklyRecord(model);

    try {
      final synced = await remoteDatasource.upsertWeeklyRecord(model);
      final updated = synced.copyWith(
        syncedAt: DateTime.now().toIso8601String(),
      );
      await localDatasource.upsertWeeklyRecord(updated);
      return updated.toDomain();
    } on DioException catch (_) {
      await localDatasource.enqueueSync(
        entityType: 'weekly_reconciliation',
        localId: model.weekStartDate,
        payload: model.toJson(),
      );
      return record;
    }
  }

  @override
  Future<void> syncPendingRecords() async {
    final items = await localDatasource.getPendingReadinessSyncItems();
    if (items.isEmpty) return;

    for (final item in items) {
      if (item.retryCount >= item.maxRetries) {
        await localDatasource.markSyncCompleted(item.id);
        continue;
      }

      try {
        switch (item.entityType) {
          case 'readiness_daily_record':
            final record = DailyReadinessRecordModel.fromJson(
              _parsePayload(item.payloadJson),
            );
            await remoteDatasource.upsertDailyRecord(record);
            break;
          case 'readiness_baseline':
            final baseline = ReadinessBaselineModel.fromJson(
              _parsePayload(item.payloadJson),
            );
            await remoteDatasource.upsertBaseline(baseline);
            break;
          case 'adapted_workout':
            final adapted = AdaptedWorkoutModel.fromJson(
              _parsePayload(item.payloadJson),
            );
            await remoteDatasource.upsertAdaptedWorkout(adapted);
            break;
          case 'weekly_reconciliation':
            final weekly = WeeklyReconciliationRecordModel.fromJson(
              _parsePayload(item.payloadJson),
            );
            await remoteDatasource.upsertWeeklyRecord(weekly);
            break;
        }
        await localDatasource.markSyncCompleted(item.id);
      } catch (_) {
        await localDatasource.incrementSyncRetry(item.id);
      }
    }
  }

  Map<String, dynamic> _parsePayload(String payload) {
    return Map<String, dynamic>.from(jsonDecode(payload) as Map);
  }
}
