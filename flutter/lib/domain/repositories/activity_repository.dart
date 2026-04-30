import 'package:runflow_flutter/domain/entities/activity_entities.dart';
import 'package:runflow_flutter/domain/entities/ai_feedback_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';

abstract class ActivityRepository {
  Future<ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    ActivityType? type,
  });

  Future<Activity> getActivity(String id);

  Future<Activity> updateActivity(String id, {String? name, ActivityType? type, String? trainingType});

  Future<Activity> createActivity(RecordedWorkout workout);

  Future<Activity> createManualActivity({
    required String name,
    required DateTime date,
    required String type,
    required double distance,
    required int duration,
    double? hr,
  });

  Future<AiActivityFeedback> getAiFeedback(String activityId);

  Future<AiActivityFeedback> generateAiFeedback(String activityId);
}
