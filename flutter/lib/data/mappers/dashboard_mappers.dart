import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/mappers/auth_mappers.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart' as domain;

extension ActivityTypeMapper on ActivityType {
  domain.ActivityType toDomain() => domain.ActivityType.values[index];
}

extension DomainActivityTypeMapper on domain.ActivityType {
  ActivityType toData() => ActivityType.values[index];
}

extension RaceTypeMapper on RaceType {
  domain.RaceType toDomain() => domain.RaceType.values[index];
}

extension DomainRaceTypeMapper on domain.RaceType {
  RaceType toData() => RaceType.values[index];
}

extension WorkoutTypeMapper on WorkoutType {
  domain.WorkoutType toDomain() => domain.WorkoutType.values[index];
}

extension DomainWorkoutTypeMapper on domain.WorkoutType {
  WorkoutType toData() => WorkoutType.values[index];
}

extension AnalyticsStatsMapper on AnalyticsStats {
  domain.AnalyticsStats toDomain() => domain.AnalyticsStats(
        currentWeekMileage: currentWeekMileage,
        effectiveVO2max: effectiveVO2max,
        rawVO2max: rawVO2max,
        vdotCorrectionFactor: vdotCorrectionFactor,
        marathonShape: marathonShape,
        currentVdot: currentVdot,
        ctl: ctl,
        atl: atl,
        tsb: tsb,
        workloadRatio: workloadRatio,
        easyTrimp: easyTrimp,
        hrMax: hrMax,
      );
}

extension DomainAnalyticsStatsMapper on domain.AnalyticsStats {
  AnalyticsStats toData() => AnalyticsStats(
        currentWeekMileage: currentWeekMileage,
        effectiveVO2max: effectiveVO2max,
        rawVO2max: rawVO2max,
        vdotCorrectionFactor: vdotCorrectionFactor,
        marathonShape: marathonShape,
        currentVdot: currentVdot,
        ctl: ctl,
        atl: atl,
        tsb: tsb,
        workloadRatio: workloadRatio,
        easyTrimp: easyTrimp,
        hrMax: hrMax,
      );
}

extension SyncStatusMapper on SyncStatus {
  domain.SyncStatus toDomain() => domain.SyncStatus(
        syncInProgress: syncInProgress,
        lastSyncAt: lastSyncAt,
        totalActivities: totalActivities,
      );
}

extension DomainSyncStatusMapper on domain.SyncStatus {
  SyncStatus toData() => SyncStatus(
        syncInProgress: syncInProgress,
        lastSyncAt: lastSyncAt,
        totalActivities: totalActivities,
      );
}

extension SyncResultMapper on SyncResult {
  domain.SyncResult toDomain() => domain.SyncResult(
        success: success,
        activitiesSynced: activitiesSynced,
        lastSyncAt: lastSyncAt,
      );
}

extension DomainSyncResultMapper on domain.SyncResult {
  SyncResult toData() => SyncResult(
        success: success,
        activitiesSynced: activitiesSynced,
        lastSyncAt: lastSyncAt,
      );
}

extension ActivityMapper on Activity {
  domain.Activity toDomain() => domain.Activity(
        id: id,
        stravaId: stravaId,
        type: type.toDomain(),
        name: name,
        startDate: startDate,
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
        hrZone1Time: hrZone1Time,
        hrZone2Time: hrZone2Time,
        hrZone3Time: hrZone3Time,
        hrZone4Time: hrZone4Time,
        hrZone5Time: hrZone5Time,
        streams: streams,
        calories: calories,
      );
}

extension DomainActivityMapper on domain.Activity {
  Activity toData() => Activity(
        id: id,
        stravaId: stravaId,
        type: type.toData(),
        name: name,
        startDate: startDate,
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
        hrZone1Time: hrZone1Time,
        hrZone2Time: hrZone2Time,
        hrZone3Time: hrZone3Time,
        hrZone4Time: hrZone4Time,
        hrZone5Time: hrZone5Time,
        streams: streams,
        calories: calories,
      );
}

extension WorkoutMapper on Workout {
  domain.Workout toDomain() => domain.Workout(
        id: id,
        goalId: goalId,
        scheduledDate: scheduledDate,
        workoutType: workoutType.toDomain(),
        description: description,
        targetDistance: targetDistance,
        targetPace: targetPace,
        targetDuration: targetDuration,
        isCompleted: isCompleted,
        completedAt: completedAt,
        activityId: activityId,
      );
}

extension DomainWorkoutMapper on domain.Workout {
  Workout toData() => Workout(
        id: id,
        goalId: goalId,
        scheduledDate: scheduledDate,
        workoutType: workoutType.toData(),
        description: description,
        targetDistance: targetDistance,
        targetPace: targetPace,
        targetDuration: targetDuration,
        isCompleted: isCompleted,
        completedAt: completedAt,
        activityId: activityId,
      );
}

extension GoalMapper on Goal {
  domain.Goal toDomain() => domain.Goal(
        id: id,
        userId: userId,
        name: name,
        raceType: raceType.toDomain(),
        raceDate: raceDate,
        targetTime: targetTime,
        weeklyMileageGoal: weeklyMileageGoal,
        planWeeks: planWeeks,
        runsPerWeek: runsPerWeek,
        longRunDay: longRunDay,
        workoutDay: workoutDay,
        currentVdot: currentVdot,
        predictedTime: predictedTime,
        isActive: isActive,
        createdAt: createdAt,
        updatedAt: updatedAt,
        completedAt: completedAt,
        workouts: workouts.map((w) => w.toDomain()).toList(),
        backyardLoopDistM: backyardLoopDistM,
        targetLaps: targetLaps,
      );
}

extension DomainGoalMapper on domain.Goal {
  Goal toData() => Goal(
        id: id,
        userId: userId,
        name: name,
        raceType: raceType.toData(),
        raceDate: raceDate,
        targetTime: targetTime,
        weeklyMileageGoal: weeklyMileageGoal,
        planWeeks: planWeeks,
        runsPerWeek: runsPerWeek,
        longRunDay: longRunDay,
        workoutDay: workoutDay,
        currentVdot: currentVdot,
        predictedTime: predictedTime,
        isActive: isActive,
        createdAt: createdAt,
        updatedAt: updatedAt,
        completedAt: completedAt,
        workouts: workouts.map((w) => w.toData()).toList(),
        backyardLoopDistM: backyardLoopDistM,
        targetLaps: targetLaps,
      );
}

extension DashboardResponseMapper on DashboardResponse {
  domain.DashboardResponse toDomain() => domain.DashboardResponse(
        stats: stats.toDomain(),
        recentActivities: recentActivities.map((a) => a.toDomain()).toList(),
        goals: goals.map((g) => g.toDomain()).toList(),
        syncStatus: syncStatus.toDomain(),
        user: user.toDomain(),
        todayWorkout: todayWorkout?.toDomain(),
      );
}

extension DomainDashboardResponseMapper on domain.DashboardResponse {
  DashboardResponse toData() => DashboardResponse(
        stats: stats.toData(),
        recentActivities: recentActivities.map((a) => a.toData()).toList(),
        goals: goals.map((g) => g.toData()).toList(),
        syncStatus: syncStatus.toData(),
        user: user.toData(),
        todayWorkout: todayWorkout?.toData(),
      );
}
