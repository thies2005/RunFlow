import 'dart:math';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/datasources/local/strength_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';

class WorkoutMergeService {
  WorkoutMergeService({
    required this.strengthDatasource,
    required this.activityDatasource,
  });

  final StrengthLocalDatasource strengthDatasource;
  final LocalActivityDatasource activityDatasource;

  /// Given a newly synced Activity, check if any strength_sessions
  /// overlap by >50% of the shorter workout's duration.
  /// If so, enrich the strength session with HR/calorie data from the Activity,
  /// set linked_activity_id, and mark the Activity as linked.
  Future<void> checkAndMergeOverlappingWorkouts(Activity syncedActivity) async {
    final activityStart = syncedActivity.startDate;
    final activityEnd = activityStart.add(Duration(seconds: syncedActivity.movingTime));

    final sessions = await strengthDatasource.getAllSessions();
    for (final session in sessions) {
      if (session.linkedActivityId != null) continue; // Already merged

      final sessionStart = session.startTime;
      final sessionEnd = session.endTime;

      final double ratio = _overlapRatio(activityStart, activityEnd, sessionStart, sessionEnd);
      if (ratio >= 0.5) {
        await strengthDatasource.linkActivityToSession(
          session.id,
          syncedActivity.id,
          syncedActivity.averageHr ?? 0.0,
          syncedActivity.maxHr ?? 0,
          syncedActivity.calories ?? 0.0,
        );
        break; // A synced activity is merged with at most one strength session
      }
    }
  }

  /// Given a completed StrengthSession, check if any existing Activities
  /// overlap by >50% and merge if found.
  Future<void> mergeExistingActivitiesForSession(StrengthSession session) async {
    if (session.linkedActivityId != null) return; // Already merged

    final sessionStart = session.startTime;
    final sessionEnd = session.endTime;

    final activities = await activityDatasource.getLocalActivities(limit: 100, excludeLinked: true);
    for (final activity in activities) {
      if (activity.type != ActivityType.strength) continue;

      final activityStart = activity.startDate;
      final activityEnd = activityStart.add(Duration(seconds: activity.movingTime));

      final double ratio = _overlapRatio(activityStart, activityEnd, sessionStart, sessionEnd);
      if (ratio >= 0.5) {
        await strengthDatasource.linkActivityToSession(
          session.id,
          activity.id,
          activity.averageHr ?? 0.0,
          activity.maxHr ?? 0,
          activity.calories ?? 0.0,
        );
        break; // Link at most one activity
      }
    }
  }

  /// Calculate time overlap ratio between two time ranges.
  /// Returns 0.0–1.0. Merge if >= 0.5.
  double _overlapRatio(DateTime s1Start, DateTime s1End, DateTime s2Start, DateTime s2End) {
    final startMax = s1Start.isAfter(s2Start) ? s1Start : s2Start;
    final endMin = s1End.isBefore(s2End) ? s1End : s2End;

    if (endMin.isBefore(startMax)) return 0.0;

    final overlapSeconds = endMin.difference(startMax).inSeconds;
    final s1Duration = s1End.difference(s1Start).inSeconds;
    final s2Duration = s2End.difference(s2Start).inSeconds;

    final minDuration = min(s1Duration, s2Duration);
    if (minDuration <= 0) return 0.0;

    return overlapSeconds / minDuration;
  }
}
