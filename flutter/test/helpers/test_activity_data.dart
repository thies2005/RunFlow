import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

class TestActivityData {
  TestActivityData._();

  static Activity createActivity({
    String id = 'act1',
    String stravaId = '12345',
    ActivityType type = ActivityType.run,
    String name = 'Morning Run',
    DateTime? startDate,
    double distance = 8500.0,
    int movingTime = 2700,
    double? averageSpeed = 3.15,
    double? averageHr = 145.0,
    int? maxHr = 175,
    double? averageCadence = 180.0,
    bool hasHeartrate = true,
    double totalElevation = 120.0,
    double? trimp = 85.0,
    double? runningTss = 75.0,
    double? estimatedVdot = 51.2,
    String? trainingType = 'EASY',
  }) {
    return Activity(
      id: id,
      stravaId: stravaId,
      type: type,
      name: name,
      startDate: startDate ?? DateTime(2024, 6, 15, 7, 30),
      distance: distance,
      movingTime: movingTime,
      averageSpeed: averageSpeed,
      averageHr: averageHr,
      maxHr: maxHr,
      averageCadence: averageCadence,
      hasHeartrate: hasHeartrate,
      totalElevation: totalElevation,
      trimp: trimp,
      runningTss: runningTss,
      estimatedVdot: estimatedVdot,
      trainingType: trainingType,
    );
  }

  static ActivitiesResponse createResponse({
    List<Activity>? activities,
    int total = 1,
    int limit = 50,
    int offset = 0,
    bool hasMore = false,
  }) {
    return ActivitiesResponse(
      activities: activities ??
          [
            createActivity(),
          ],
      total: total,
      limit: limit,
      offset: offset,
      hasMore: hasMore,
    );
  }
}
