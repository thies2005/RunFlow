import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

abstract class ActivityRepository {
  Future<ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    ActivityType? type,
  });

  Future<Activity> getActivity(String id);
}
