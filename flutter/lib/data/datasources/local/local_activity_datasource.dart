import 'dart:convert';

import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:sqlite3/sqlite3.dart';

class PendingSyncItem {
  const PendingSyncItem({
    required this.id,
    required this.entityType,
    required this.localId,
    required this.payloadJson,
    required this.retryCount,
    required this.maxRetries,
    required this.createdAt,
    this.lastAttemptAt,
  });

  final int id;
  final String entityType;
  final String localId;
  final String payloadJson;
  final int retryCount;
  final int maxRetries;
  final DateTime createdAt;
  final DateTime? lastAttemptAt;
}

class LocalActivityDatasource {
  LocalActivityDatasource({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  static String generateLocalId() {
    return 'local_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
  }

  Future<void> saveActivity(Activity activity, String localId, {bool isSynced = false}) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final streamsJson = activity.streams != null ? jsonEncode(activity.streams) : null;
    db.execute(
      'INSERT OR REPLACE INTO activities (id, local_id, strava_id, type, name, start_date, distance, moving_time, average_speed, average_hr, max_hr, average_cadence, has_heartrate, total_elevation, trimp, running_tss, estimated_vdot, training_type, hr_zone_1_time, hr_zone_2_time, hr_zone_3_time, hr_zone_4_time, hr_zone_5_time, calories, streams_json, is_synced, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        activity.id,
        localId,
        activity.stravaId,
        activity.type.name,
        activity.name,
        activity.startDate.millisecondsSinceEpoch,
        activity.distance,
        activity.movingTime,
        activity.averageSpeed,
        activity.averageHr,
        activity.maxHr,
        activity.averageCadence,
        activity.hasHeartrate ? 1 : 0,
        activity.totalElevation,
        activity.trimp,
        activity.runningTss,
        activity.estimatedVdot,
        activity.trainingType,
        activity.hrZone1Time,
        activity.hrZone2Time,
        activity.hrZone3Time,
        activity.hrZone4Time,
        activity.hrZone5Time,
        activity.calories,
        streamsJson,
        isSynced ? 1 : 0,
        now,
        now,
      ],
    );
  }

  Future<void> upsertActivity(Activity activity, String localId, {required bool isSynced}) async {
    final db = await _db.database;
    final existing = _getByLocalIdSync(db, localId);
    if (existing != null) {
      final now = DateTime.now().millisecondsSinceEpoch;
      final streamsJson = activity.streams != null ? jsonEncode(activity.streams) : null;
      db.execute(
        'UPDATE activities SET id = ?, strava_id = ?, type = ?, name = ?, start_date = ?, distance = ?, moving_time = ?, average_speed = ?, average_hr = ?, max_hr = ?, average_cadence = ?, has_heartrate = ?, total_elevation = ?, trimp = ?, running_tss = ?, estimated_vdot = ?, training_type = ?, hr_zone_1_time = ?, hr_zone_2_time = ?, hr_zone_3_time = ?, hr_zone_4_time = ?, hr_zone_5_time = ?, calories = ?, streams_json = ?, is_synced = ?, updated_at = ? WHERE local_id = ?',
        [
          activity.id,
          activity.stravaId,
          activity.type.name,
          activity.name,
          activity.startDate.millisecondsSinceEpoch,
          activity.distance,
          activity.movingTime,
          activity.averageSpeed,
          activity.averageHr,
          activity.maxHr,
          activity.averageCadence,
          activity.hasHeartrate ? 1 : 0,
          activity.totalElevation,
          activity.trimp,
          activity.runningTss,
          activity.estimatedVdot,
          activity.trainingType,
          activity.hrZone1Time,
          activity.hrZone2Time,
          activity.hrZone3Time,
          activity.hrZone4Time,
          activity.hrZone5Time,
          activity.calories,
          streamsJson,
          isSynced ? 1 : 0,
          now,
          localId,
        ],
      );
    } else {
      await saveActivity(activity, localId, isSynced: isSynced);
    }
  }

  Future<void> markActivitySynced(String localId, String serverId, Activity? enrichedActivity) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    if (enrichedActivity != null) {
      String? streamsJson = enrichedActivity.streams != null ? jsonEncode(enrichedActivity.streams) : null;
      if (streamsJson == null) {
        final existing = db.select('SELECT streams_json FROM activities WHERE local_id = ?', [localId]);
        if (existing.isNotEmpty) {
          streamsJson = existing.first['streams_json'] as String?;
        }
      }
      db.execute(
        'UPDATE activities SET id = ?, strava_id = ?, type = ?, name = ?, distance = ?, moving_time = ?, average_speed = ?, average_hr = ?, max_hr = ?, average_cadence = ?, has_heartrate = ?, total_elevation = ?, trimp = ?, running_tss = ?, estimated_vdot = ?, training_type = ?, hr_zone_1_time = ?, hr_zone_2_time = ?, hr_zone_3_time = ?, hr_zone_4_time = ?, hr_zone_5_time = ?, calories = ?, streams_json = ?, is_synced = 1, updated_at = ? WHERE local_id = ?',
        [
          serverId,
          enrichedActivity.stravaId,
          enrichedActivity.type.name,
          enrichedActivity.name,
          enrichedActivity.distance,
          enrichedActivity.movingTime,
          enrichedActivity.averageSpeed,
          enrichedActivity.averageHr,
          enrichedActivity.maxHr,
          enrichedActivity.averageCadence,
          enrichedActivity.hasHeartrate ? 1 : 0,
          enrichedActivity.totalElevation,
          enrichedActivity.trimp,
          enrichedActivity.runningTss,
          enrichedActivity.estimatedVdot,
          enrichedActivity.trainingType,
          enrichedActivity.hrZone1Time,
          enrichedActivity.hrZone2Time,
          enrichedActivity.hrZone3Time,
          enrichedActivity.hrZone4Time,
          enrichedActivity.hrZone5Time,
          enrichedActivity.calories,
          streamsJson,
          now,
          localId,
        ],
      );
    } else {
      db.execute(
        'UPDATE activities SET id = ?, is_synced = 1, updated_at = ? WHERE local_id = ?',
        [serverId, now, localId],
      );
    }
  }

  Future<List<Activity>> getLocalActivities({int limit = 50, int offset = 0, bool excludeLinked = true}) async {
    final db = await _db.database;
    final query = excludeLinked
        ? 'SELECT * FROM activities WHERE is_linked_to_strength = 0 ORDER BY start_date DESC LIMIT ? OFFSET ?'
        : 'SELECT * FROM activities ORDER BY start_date DESC LIMIT ? OFFSET ?';
    final rows = db.select(
      query,
      [limit, offset],
    );
    return rows.map(_rowToActivity).toList();
  }

  Future<List<Activity>> getUnsyncedActivities() async {
    final db = await _db.database;
    final rows = db.select(
      'SELECT * FROM activities WHERE is_synced = 0 AND is_linked_to_strength = 0 ORDER BY start_date DESC',
    );
    return rows.map(_rowToActivity).toList();
  }

  Future<Activity?> getActivityById(String id) async {
    final db = await _db.database;
    final rows = db.select('SELECT * FROM activities WHERE id = ?', [id]);
    if (rows.isEmpty) return null;
    return _rowToActivity(rows.first);
  }

  Future<Activity?> getActivityByLocalId(String localId) async {
    final db = await _db.database;
    final rows = db.select('SELECT * FROM activities WHERE local_id = ?', [localId]);
    if (rows.isEmpty) return null;
    return _rowToActivity(rows.first);
  }

  Future<void> updateActivityLocally(String id, Map<String, dynamic> updates) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    final setClauses = <String>[];
    final args = <Object?>[];
    updates.forEach((key, value) {
      setClauses.add('$key = ?');
      args.add(value);
    });
    setClauses.add('updated_at = ?');
    args.add(now);
    args.add(id);
    db.execute('UPDATE activities SET ${setClauses.join(', ')} WHERE id = ?', args);
  }

  Future<void> deleteActivity(String id) async {
    final db = await _db.database;
    db.execute('DELETE FROM activities WHERE id = ?', [id]);
    db.execute('DELETE FROM pending_sync WHERE local_id = ?', [id]);
  }

  Future<void> enqueueSync(String entityType, String localId, Map<String, dynamic> payload) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    db.execute(
      'INSERT INTO pending_sync (entity_type, local_id, payload_json, retry_count, max_retries, created_at, last_attempt_at) VALUES (?, ?, ?, 0, 5, ?, NULL)',
      [entityType, localId, jsonEncode(payload), now],
    );
  }

  Future<List<PendingSyncItem>> getPendingSyncItems() async {
    final db = await _db.database;
    final rows = db.select('SELECT * FROM pending_sync ORDER BY created_at ASC');
    return rows.map(_rowToPendingSyncItem).toList();
  }

  Future<void> markSyncCompleted(int pendingId) async {
    final db = await _db.database;
    db.execute('DELETE FROM pending_sync WHERE id = ?', [pendingId]);
  }

  Future<void> incrementSyncRetry(int pendingId) async {
    final db = await _db.database;
    final now = DateTime.now().millisecondsSinceEpoch;
    db.execute(
      'UPDATE pending_sync SET retry_count = retry_count + 1, last_attempt_at = ? WHERE id = ?',
      [now, pendingId],
    );
  }

  Future<void> removeFailedSync(int pendingId) async {
    final db = await _db.database;
    db.execute('DELETE FROM pending_sync WHERE id = ?', [pendingId]);
  }

  Future<int> getPendingSyncCount() async {
    final db = await _db.database;
    final rows = db.select('SELECT COUNT(*) as count FROM pending_sync');
    return rows.first['count'] as int;
  }

  Future<void> upsertServerActivities(List<Activity> activities) async {
    final db = await _db.database;
    for (final activity in activities) {
      final existing = db.select(
        'SELECT local_id, streams_json FROM activities WHERE id = ?',
        [activity.id],
      );
      final now = DateTime.now().millisecondsSinceEpoch;
      final streamsJson = activity.streams != null
          ? jsonEncode(activity.streams)
          : (existing.isNotEmpty ? existing.first['streams_json'] as String? : null);
      if (existing.isNotEmpty) {
        db.execute(
          'UPDATE activities SET strava_id = ?, type = ?, name = ?, start_date = ?, distance = ?, moving_time = ?, average_speed = ?, average_hr = ?, max_hr = ?, average_cadence = ?, has_heartrate = ?, total_elevation = ?, trimp = ?, running_tss = ?, estimated_vdot = ?, training_type = ?, hr_zone_1_time = ?, hr_zone_2_time = ?, hr_zone_3_time = ?, hr_zone_4_time = ?, hr_zone_5_time = ?, calories = ?, streams_json = ?, is_synced = 1, updated_at = ? WHERE id = ?',
          [
            activity.stravaId,
            activity.type.name,
            activity.name,
            activity.startDate.millisecondsSinceEpoch,
            activity.distance,
            activity.movingTime,
            activity.averageSpeed,
            activity.averageHr,
            activity.maxHr,
            activity.averageCadence,
            activity.hasHeartrate ? 1 : 0,
            activity.totalElevation,
            activity.trimp,
            activity.runningTss,
            activity.estimatedVdot,
            activity.trainingType,
            activity.hrZone1Time,
            activity.hrZone2Time,
            activity.hrZone3Time,
            activity.hrZone4Time,
            activity.hrZone5Time,
            activity.calories,
            streamsJson,
            now,
            activity.id,
          ],
        );
      } else {
        db.execute(
          'INSERT OR REPLACE INTO activities (id, local_id, strava_id, type, name, start_date, distance, moving_time, average_speed, average_hr, max_hr, average_cadence, has_heartrate, total_elevation, trimp, running_tss, estimated_vdot, training_type, hr_zone_1_time, hr_zone_2_time, hr_zone_3_time, hr_zone_4_time, hr_zone_5_time, calories, streams_json, is_synced, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            activity.id,
            activity.id,
            activity.stravaId,
            activity.type.name,
            activity.name,
            activity.startDate.millisecondsSinceEpoch,
            activity.distance,
            activity.movingTime,
            activity.averageSpeed,
            activity.averageHr,
            activity.maxHr,
            activity.averageCadence,
            activity.hasHeartrate ? 1 : 0,
            activity.totalElevation,
            activity.trimp,
            activity.runningTss,
            activity.estimatedVdot,
            activity.trainingType,
            activity.hrZone1Time,
            activity.hrZone2Time,
            activity.hrZone3Time,
            activity.hrZone4Time,
            activity.hrZone5Time,
            activity.calories,
            streamsJson,
            1,
            now,
            now,
          ],
        );
      }
    }
  }

  Future<List<Activity>> getLocalActivitiesWithRoutes({DateTime? since}) async {
    final db = await _db.database;
    final where = since != null
        ? 'WHERE streams_json IS NOT NULL AND is_linked_to_strength = 0 AND start_date >= ?'
        : 'WHERE streams_json IS NOT NULL AND is_linked_to_strength = 0';
    final args = since != null ? [since.millisecondsSinceEpoch] : <Object?>[];
    final rows = db.select(
      'SELECT * FROM activities $where ORDER BY start_date DESC',
      args,
    );
    return rows.map(_rowToActivity).toList();
  }

  Future<void> pruneSyncedActivitiesMissingFromServer(Set<String> serverIds) async {
    final db = await _db.database;
    final rows = db.select(
      'SELECT id FROM activities WHERE is_synced = 1',
    );
    for (final row in rows) {
      final id = row['id'] as String;
      if (!serverIds.contains(id)) {
        db.execute('DELETE FROM activities WHERE id = ? AND is_synced = 1', [id]);
      }
    }
  }

  Row? _getByLocalIdSync(Database db, String localId) {
    final rows = db.select('SELECT local_id FROM activities WHERE local_id = ?', [localId]);
    return rows.isEmpty ? null : rows.first;
  }

  Activity _rowToActivity(Row row) {
    final streamsJson = row['streams_json'] as String?;
    final Map<String, dynamic>? streams = streamsJson != null
        ? jsonDecode(streamsJson) as Map<String, dynamic>
        : null;
    return Activity(
      id: row['id'] as String,
      stravaId: (row['strava_id'] as String?) ?? '',
      type: ActivityType.values.firstWhere(
        (e) => e.name == (row['type'] as String),
        orElse: () => ActivityType.other,
      ),
      name: (row['name'] as String?) ?? '',
      startDate: DateTime.fromMillisecondsSinceEpoch(row['start_date'] as int),
      distance: (row['distance'] as num).toDouble(),
      movingTime: (row['moving_time'] as num).toInt(),
      averageSpeed: row['average_speed'] != null ? (row['average_speed'] as num).toDouble() : null,
      averageHr: row['average_hr'] != null ? (row['average_hr'] as num).toDouble() : null,
      maxHr: row['max_hr'] != null ? (row['max_hr'] as num).toInt() : null,
      averageCadence: row['average_cadence'] != null ? (row['average_cadence'] as num).toDouble() : null,
      hasHeartrate: (row['has_heartrate'] as int) == 1,
      totalElevation: (row['total_elevation'] as num).toDouble(),
      trimp: row['trimp'] != null ? (row['trimp'] as num).toDouble() : null,
      runningTss: row['running_tss'] != null ? (row['running_tss'] as num).toDouble() : null,
      estimatedVdot: row['estimated_vdot'] != null ? (row['estimated_vdot'] as num).toDouble() : null,
      trainingType: row['training_type'] as String?,
      hrZone1Time: (row['hr_zone_1_time'] as num?)?.toInt() ?? 0,
      hrZone2Time: (row['hr_zone_2_time'] as num?)?.toInt() ?? 0,
      hrZone3Time: (row['hr_zone_3_time'] as num?)?.toInt() ?? 0,
      hrZone4Time: (row['hr_zone_4_time'] as num?)?.toInt() ?? 0,
      hrZone5Time: (row['hr_zone_5_time'] as num?)?.toInt() ?? 0,
      streams: streams,
      calories: row['calories'] != null ? (row['calories'] as num).toDouble() : null,
    );
  }

  PendingSyncItem _rowToPendingSyncItem(Row row) {
    return PendingSyncItem(
      id: row['id'] as int,
      entityType: row['entity_type'] as String,
      localId: row['local_id'] as String,
      payloadJson: row['payload_json'] as String,
      retryCount: row['retry_count'] as int,
      maxRetries: row['max_retries'] as int,
      createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int),
      lastAttemptAt: row['last_attempt_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch(row['last_attempt_at'] as int)
          : null,
    );
  }
}
