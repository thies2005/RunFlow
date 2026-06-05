import 'dart:convert';

import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

class SyncQueueItem {
  const SyncQueueItem({
    required this.id,
    required this.entityType,
    required this.localId,
    required this.payloadJson,
    required this.retryCount,
    required this.maxRetries,
  });

  final int id;
  final String entityType;
  final String localId;
  final String payloadJson;
  final int retryCount;
  final int maxRetries;
}

class ReadinessLocalDatasource {
  ReadinessLocalDatasource({required Database db}) : _db = db;

  final Database _db;

  Future<DailyReadinessRecordModel?> getDailyRecord(String dateKey) async {
    try {
      final rows = _db.select(
        'SELECT * FROM readiness_daily_records WHERE date = ?',
        [dateKey],
      );
      if (rows.isEmpty) return null;
      return _rowToDailyRecord(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get daily record: $e');
    }
  }

  Future<void> upsertDailyRecord(DailyReadinessRecordModel record) async {
    try {
      _db.execute(
        'INSERT OR REPLACE INTO readiness_daily_records '
        '(date, rhr_json, sleep_json, load_json, subjective_json, '
        'component_scores_json, composite_score, state, confidence, '
        'reasons_json, override_json, computed_at, synced_at, max_hr, resting_hr) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          record.date,
          record.rhr != null ? jsonEncode(record.rhr!.toJson()) : null,
          record.sleep != null ? jsonEncode(record.sleep!.toJson()) : null,
          record.load != null ? jsonEncode(record.load!.toJson()) : null,
          record.subjective != null
              ? jsonEncode(record.subjective!.toJson())
              : null,
          jsonEncode(record.componentScores.map((c) => c.toJson()).toList()),
          record.compositeScore,
          record.state,
          record.confidence,
          jsonEncode(record.reasons),
          record.readinessOverride != null
              ? jsonEncode(record.readinessOverride!.toJson())
              : null,
          record.computedAt != null
              ? DateTime.tryParse(record.computedAt!)
                  ?.millisecondsSinceEpoch
              : null,
          record.syncedAt != null
              ? DateTime.tryParse(record.syncedAt!)?.millisecondsSinceEpoch
              : null,
          record.maxHr,
          record.restingHr,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to upsert daily record: $e');
    }
  }

  Future<List<DailyReadinessRecordModel>> getHistory(
    String startDate,
    String endDate,
  ) async {
    try {
      final rows = _db.select(
        'SELECT * FROM readiness_daily_records WHERE date >= ? AND date <= ? ORDER BY date',
        [startDate, endDate],
      );
      return rows.map(_rowToDailyRecord).toList();
    } catch (e) {
      throw CacheException(message: 'Failed to get history: $e');
    }
  }

  Future<ReadinessBaselineModel?> getBaseline() async {
    try {
      final rows = _db.select(
        'SELECT * FROM readiness_baselines WHERE id = 1',
      );
      if (rows.isEmpty) return null;
      return _rowToBaseline(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get baseline: $e');
    }
  }

  Future<void> upsertBaseline(ReadinessBaselineModel baseline) async {
    try {
      _db.execute(
        'INSERT OR REPLACE INTO readiness_baselines '
        '(id, rhr_median_30_day, sleep_average_28_day, last_updated) '
        'VALUES (1, ?, ?, ?)',
        [
          baseline.rhrMedian30Day,
          baseline.sleepAverage28Day,
          DateTime.tryParse(baseline.lastUpdated)?.millisecondsSinceEpoch ?? 0,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to upsert baseline: $e');
    }
  }

  Future<AdaptedWorkoutModel?> getAdaptedWorkout(
    String originalWorkoutId,
  ) async {
    try {
      final rows = _db.select(
        'SELECT * FROM adapted_workouts WHERE original_workout_id = ?',
        [originalWorkoutId],
      );
      if (rows.isEmpty) return null;
      return _rowToAdaptedWorkout(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get adapted workout: $e');
    }
  }

  Future<void> upsertAdaptedWorkout(AdaptedWorkoutModel adapted) async {
    try {
      _db.execute(
        'INSERT OR REPLACE INTO adapted_workouts '
        '(id, original_workout_id, date, original_type, adapted_type, '
        'adaptation_type, original_target_distance, adapted_target_distance, '
        'original_target_duration, adapted_target_duration, '
        'original_target_pace, adapted_target_pace, reason, readiness_score, '
        'readiness_state, is_accepted, created_at, synced_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          adapted.id,
          adapted.originalWorkoutId,
          adapted.date,
          adapted.originalType,
          adapted.adaptedType,
          adapted.adaptationType,
          adapted.originalTargetDistance,
          adapted.adaptedTargetDistance,
          adapted.originalTargetDuration,
          adapted.adaptedTargetDuration,
          adapted.originalTargetPace,
          adapted.adaptedTargetPace,
          adapted.reason,
          adapted.readinessScore,
          adapted.readinessState,
          adapted.isAccepted ? 1 : 0,
          DateTime.tryParse(adapted.createdAt)?.millisecondsSinceEpoch ?? 0,
          adapted.syncedAt != null
              ? DateTime.tryParse(adapted.syncedAt!)?.millisecondsSinceEpoch
              : null,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to upsert adapted workout: $e');
    }
  }

  Future<WeeklyReconciliationRecordModel?> getWeeklyRecord(
    String weekStartKey,
  ) async {
    try {
      final rows = _db.select(
        'SELECT * FROM weekly_reconciliation_records WHERE week_start_date = ?',
        [weekStartKey],
      );
      if (rows.isEmpty) return null;
      return _rowToWeeklyRecord(rows.first);
    } catch (e) {
      throw CacheException(message: 'Failed to get weekly record: $e');
    }
  }

  Future<void> upsertWeeklyRecord(WeeklyReconciliationRecordModel record) async {
    try {
      _db.execute(
        'INSERT OR REPLACE INTO weekly_reconciliation_records '
        '(week_start_date, planned_load, actual_load, adapted_load, '
        'deficit_percent, surplus_percent, adjustment_description, '
        'is_applied, race_weeks_remaining, requires_review, created_at, synced_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          record.weekStartDate,
          record.plannedLoad,
          record.actualLoad,
          record.adaptedLoad,
          record.deficitPercent,
          record.surplusPercent,
          record.adjustmentDescription,
          record.isApplied ? 1 : 0,
          record.raceWeeksRemaining,
          record.requiresReview ? 1 : 0,
          DateTime.tryParse(record.createdAt)?.millisecondsSinceEpoch ?? 0,
          record.syncedAt != null
              ? DateTime.tryParse(record.syncedAt!)?.millisecondsSinceEpoch
              : null,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to upsert weekly record: $e');
    }
  }

  Future<void> enqueueSync({
    required String entityType,
    required String localId,
    required Map<String, dynamic> payload,
  }) async {
    try {
      _db.execute(
        'INSERT INTO pending_sync '
        '(entity_type, local_id, payload_json, retry_count, max_retries, created_at) '
        'VALUES (?, ?, ?, 0, 5, ?)',
        [
          entityType,
          localId,
          jsonEncode(payload),
          DateTime.now().millisecondsSinceEpoch,
        ],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to enqueue sync: $e');
    }
  }

  Future<void> markSyncCompleted(int syncId) async {
    try {
      _db.execute(
        'DELETE FROM pending_sync WHERE id = ?',
        [syncId],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to mark sync completed: $e');
    }
  }

  Future<void> incrementSyncRetry(int syncId) async {
    try {
      _db.execute(
        'UPDATE pending_sync SET retry_count = retry_count + 1, last_attempt_at = ? WHERE id = ?',
        [DateTime.now().millisecondsSinceEpoch, syncId],
      );
    } catch (e) {
      throw CacheException(message: 'Failed to increment sync retry: $e');
    }
  }

  Future<List<SyncQueueItem>> getPendingReadinessSyncItems() async {
    try {
      final rows = _db.select(
        'SELECT * FROM pending_sync WHERE entity_type IN '
        "('readiness_daily_record', 'readiness_baseline', 'adapted_workout', 'weekly_reconciliation') "
        'ORDER BY created_at',
      );
      return rows.map(_rowToSyncQueueItem).toList();
    } catch (e) {
      throw CacheException(
          message: 'Failed to get pending readiness sync items: $e');
    }
  }

  Future<bool> isRecordStale(
    String dateKey, {
    Duration maxAge = const Duration(minutes: 30),
  }) async {
    try {
      final rows = _db.select(
        'SELECT computed_at FROM readiness_daily_records WHERE date = ?',
        [dateKey],
      );
      if (rows.isEmpty) return true;
      final computedAtMs = rows.first['computed_at'] as int?;
      if (computedAtMs == null) return true;
      final computedAt = DateTime.fromMillisecondsSinceEpoch(computedAtMs);
      return DateTime.now().difference(computedAt) > maxAge;
    } catch (e) {
      throw CacheException(message: 'Failed to check stale record: $e');
    }
  }

  DailyReadinessRecordModel _rowToDailyRecord(Row row) {
    RhrMetricsModel? rhr;
    final rhrJson = row['rhr_json'] as String?;
    if (rhrJson != null) {
      try {
        rhr = RhrMetricsModel.fromJson(
          jsonDecode(rhrJson) as Map<String, dynamic>,
        );
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse rhr_json: $e');
      }
    }

    SleepMetricsModel? sleep;
    final sleepJson = row['sleep_json'] as String?;
    if (sleepJson != null) {
      try {
        sleep = SleepMetricsModel.fromJson(
          jsonDecode(sleepJson) as Map<String, dynamic>,
        );
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse sleep_json: $e');
      }
    }

    LoadMetricsModel? load;
    final loadJson = row['load_json'] as String?;
    if (loadJson != null) {
      try {
        load = LoadMetricsModel.fromJson(
          jsonDecode(loadJson) as Map<String, dynamic>,
        );
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse load_json: $e');
      }
    }

    SubjectiveInputModel? subjective;
    final subjectiveJson = row['subjective_json'] as String?;
    if (subjectiveJson != null) {
      try {
        subjective = SubjectiveInputModel.fromJson(
          jsonDecode(subjectiveJson) as Map<String, dynamic>,
        );
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse subjective_json: $e');
      }
    }

    List<ComponentScoreModel> componentScores = [];
    final scoresJson = row['component_scores_json'] as String?;
    if (scoresJson != null) {
      try {
        final list = jsonDecode(scoresJson) as List;
        componentScores = list
            .map((e) =>
                ComponentScoreModel.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse component_scores_json: $e');
      }
    }

    List<String> reasons = [];
    final reasonsJson = row['reasons_json'] as String?;
    if (reasonsJson != null) {
      try {
        final list = jsonDecode(reasonsJson) as List;
        reasons = list.map((e) => e.toString()).toList();
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse reasons_json: $e');
      }
    }

    ReadinessOverrideModel? override;
    final overrideJson = row['override_json'] as String?;
    if (overrideJson != null) {
      try {
        override = ReadinessOverrideModel.fromJson(
          jsonDecode(overrideJson) as Map<String, dynamic>,
        );
      } catch (e) {
        logger.debug('ReadinessLocalDatasource: Failed to parse override_json: $e');
      }
    }

    final computedAtMs = row['computed_at'] as int?;
    final syncedAtMs = row['synced_at'] as int?;

    return DailyReadinessRecordModel(
      date: row['date'] as String,
      rhr: rhr,
      sleep: sleep,
      load: load,
      subjective: subjective,
      componentScores: componentScores,
      compositeScore: (row['composite_score'] as num).toDouble(),
      state: row['state'] as String,
      confidence: row['confidence'] as String,
      reasons: reasons,
      readinessOverride: override,
      computedAt: computedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(computedAtMs).toIso8601String()
          : null,
      syncedAt: syncedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(syncedAtMs).toIso8601String()
          : null,
      maxHr: row['max_hr'] as int?,
      restingHr: row['resting_hr'] as int?,
    );
  }

  ReadinessBaselineModel _rowToBaseline(Row row) {
    final lastUpdatedMs = row['last_updated'] as int;
    return ReadinessBaselineModel(
      rhrMedian30Day: row['rhr_median_30_day'] as double?,
      sleepAverage28Day: row['sleep_average_28_day'] as double?,
      lastUpdated:
          DateTime.fromMillisecondsSinceEpoch(lastUpdatedMs).toIso8601String(),
    );
  }

  AdaptedWorkoutModel _rowToAdaptedWorkout(Row row) {
    final createdAtMs = row['created_at'] as int;
    final syncedAtMs = row['synced_at'] as int?;
    return AdaptedWorkoutModel(
      id: row['id'] as String,
      originalWorkoutId: row['original_workout_id'] as String,
      date: row['date'] as String,
      originalType: row['original_type'] as String,
      adaptedType: row['adapted_type'] as String,
      adaptationType: row['adaptation_type'] as String,
      originalTargetDistance: (row['original_target_distance'] as num).toDouble(),
      adaptedTargetDistance: row['adapted_target_distance'] as double?,
      originalTargetDuration: row['original_target_duration'] as int,
      adaptedTargetDuration: row['adapted_target_duration'] as int?,
      originalTargetPace: (row['original_target_pace'] as num).toDouble(),
      adaptedTargetPace: row['adapted_target_pace'] as double?,
      reason: row['reason'] as String,
      readinessScore: (row['readiness_score'] as num).toDouble(),
      readinessState: row['readiness_state'] as String,
      isAccepted: (row['is_accepted'] as int) == 1,
      createdAt:
          DateTime.fromMillisecondsSinceEpoch(createdAtMs).toIso8601String(),
      syncedAt: syncedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(syncedAtMs).toIso8601String()
          : null,
    );
  }

  WeeklyReconciliationRecordModel _rowToWeeklyRecord(Row row) {
    final createdAtMs = row['created_at'] as int;
    final syncedAtMs = row['synced_at'] as int?;
    return WeeklyReconciliationRecordModel(
      weekStartDate: row['week_start_date'] as String,
      plannedLoad: (row['planned_load'] as num).toDouble(),
      actualLoad: (row['actual_load'] as num).toDouble(),
      adaptedLoad: (row['adapted_load'] as num).toDouble(),
      deficitPercent: (row['deficit_percent'] as num).toDouble(),
      surplusPercent: (row['surplus_percent'] as num).toDouble(),
      adjustmentDescription: row['adjustment_description'] as String?,
      isApplied: (row['is_applied'] as int) == 1,
      raceWeeksRemaining: row['race_weeks_remaining'] as int?,
      requiresReview: (row['requires_review'] as int) == 1,
      createdAt:
          DateTime.fromMillisecondsSinceEpoch(createdAtMs).toIso8601String(),
      syncedAt: syncedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(syncedAtMs).toIso8601String()
          : null,
    );
  }

  SyncQueueItem _rowToSyncQueueItem(Row row) {
    return SyncQueueItem(
      id: row['id'] as int,
      entityType: row['entity_type'] as String,
      localId: row['local_id'] as String,
      payloadJson: row['payload_json'] as String,
      retryCount: row['retry_count'] as int,
      maxRetries: row['max_retries'] as int,
    );
  }
}
