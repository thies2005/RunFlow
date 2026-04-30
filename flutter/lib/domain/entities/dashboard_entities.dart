import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';

enum ActivityType { run, ride, virtualRide, walk, hike, swim, workout, other }

enum RaceType { fiveK, tenK, halfMarathon, marathon }

enum WorkoutType { easy, long, tempo, interval, recovery, race, other }

class AnalyticsStats {
  const AnalyticsStats({
    required this.currentWeekMileage,
    required this.effectiveVO2max,
    required this.rawVO2max,
    required this.vdotCorrectionFactor,
    required this.marathonShape,
    required this.currentVdot,
    required this.ctl,
    required this.atl,
    required this.tsb,
    required this.workloadRatio,
    required this.easyTrimp,
    required this.hrMax,
  });

  final double currentWeekMileage;
  final double effectiveVO2max;
  final double rawVO2max;
  final double vdotCorrectionFactor;
  final double marathonShape;
  final double? currentVdot;
  final double ctl;
  final double atl;
  final double tsb;
  final double workloadRatio;
  final double easyTrimp;
  final int hrMax;

  AnalyticsStats copyWith({
    double? currentWeekMileage,
    double? effectiveVO2max,
    double? rawVO2max,
    double? vdotCorrectionFactor,
    double? marathonShape,
    double? currentVdot,
    double? ctl,
    double? atl,
    double? tsb,
    double? workloadRatio,
    double? easyTrimp,
    int? hrMax,
  }) {
    return AnalyticsStats(
      currentWeekMileage: currentWeekMileage ?? this.currentWeekMileage,
      effectiveVO2max: effectiveVO2max ?? this.effectiveVO2max,
      rawVO2max: rawVO2max ?? this.rawVO2max,
      vdotCorrectionFactor: vdotCorrectionFactor ?? this.vdotCorrectionFactor,
      marathonShape: marathonShape ?? this.marathonShape,
      currentVdot: currentVdot ?? this.currentVdot,
      ctl: ctl ?? this.ctl,
      atl: atl ?? this.atl,
      tsb: tsb ?? this.tsb,
      workloadRatio: workloadRatio ?? this.workloadRatio,
      easyTrimp: easyTrimp ?? this.easyTrimp,
      hrMax: hrMax ?? this.hrMax,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AnalyticsStats &&
          runtimeType == other.runtimeType &&
          currentWeekMileage == other.currentWeekMileage &&
          effectiveVO2max == other.effectiveVO2max &&
          rawVO2max == other.rawVO2max &&
          vdotCorrectionFactor == other.vdotCorrectionFactor &&
          marathonShape == other.marathonShape &&
          currentVdot == other.currentVdot &&
          ctl == other.ctl &&
          atl == other.atl &&
          tsb == other.tsb &&
          workloadRatio == other.workloadRatio &&
          easyTrimp == other.easyTrimp &&
          hrMax == other.hrMax;

  @override
  int get hashCode => Object.hash(
        currentWeekMileage,
        effectiveVO2max,
        rawVO2max,
        vdotCorrectionFactor,
        marathonShape,
        currentVdot,
        ctl,
        atl,
        tsb,
        workloadRatio,
        easyTrimp,
        hrMax,
      );
}

class SyncStatus {
  const SyncStatus({
    required this.syncInProgress,
    required this.lastSyncAt,
    required this.totalActivities,
  });

  final bool syncInProgress;
  final DateTime? lastSyncAt;
  final int totalActivities;

  SyncStatus copyWith({
    bool? syncInProgress,
    DateTime? lastSyncAt,
    int? totalActivities,
  }) {
    return SyncStatus(
      syncInProgress: syncInProgress ?? this.syncInProgress,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      totalActivities: totalActivities ?? this.totalActivities,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SyncStatus &&
          runtimeType == other.runtimeType &&
          syncInProgress == other.syncInProgress &&
          lastSyncAt == other.lastSyncAt &&
          totalActivities == other.totalActivities;

  @override
  int get hashCode => Object.hash(
        syncInProgress,
        lastSyncAt,
        totalActivities,
      );
}

class SyncResult {
  const SyncResult({
    required this.success,
    required this.activitiesSynced,
    required this.lastSyncAt,
  });

  final bool success;
  final int activitiesSynced;
  final DateTime? lastSyncAt;

  SyncResult copyWith({
    bool? success,
    int? activitiesSynced,
    DateTime? lastSyncAt,
  }) {
    return SyncResult(
      success: success ?? this.success,
      activitiesSynced: activitiesSynced ?? this.activitiesSynced,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SyncResult &&
          runtimeType == other.runtimeType &&
          success == other.success &&
          activitiesSynced == other.activitiesSynced &&
          lastSyncAt == other.lastSyncAt;

  @override
  int get hashCode => Object.hash(
        success,
        activitiesSynced,
        lastSyncAt,
      );
}

class Activity {
  const Activity({
    required this.id,
    required this.stravaId,
    required this.type,
    required this.name,
    required this.startDate,
    required this.distance,
    required this.movingTime,
    required this.averageSpeed,
    required this.averageHr,
    required this.maxHr,
    required this.averageCadence,
    required this.hasHeartrate,
    required this.totalElevation,
    required this.trimp,
    required this.runningTss,
    required this.estimatedVdot,
    required this.trainingType,
    this.hrZone1Time = 0,
    this.hrZone2Time = 0,
    this.hrZone3Time = 0,
    this.hrZone4Time = 0,
    this.hrZone5Time = 0,
    this.streams,
    this.calories,
  });

  final String id;
  final String stravaId;
  final ActivityType type;
  final String name;
  final DateTime startDate;
  final double distance;
  final int movingTime;
  final double? averageSpeed;
  final double? averageHr;
  final int? maxHr;
  final double? averageCadence;
  final bool hasHeartrate;
  final double totalElevation;
  final double? trimp;
  final double? runningTss;
  final double? estimatedVdot;
  final String? trainingType;
  final int hrZone1Time;
  final int hrZone2Time;
  final int hrZone3Time;
  final int hrZone4Time;
  final int hrZone5Time;
  final Map<String, dynamic>? streams;
  final double? calories;

  Activity copyWith({
    String? id,
    String? stravaId,
    ActivityType? type,
    String? name,
    DateTime? startDate,
    double? distance,
    int? movingTime,
    double? averageSpeed,
    double? averageHr,
    int? maxHr,
    double? averageCadence,
    bool? hasHeartrate,
    double? totalElevation,
    double? trimp,
    double? runningTss,
    double? estimatedVdot,
    String? trainingType,
    int? hrZone1Time,
    int? hrZone2Time,
    int? hrZone3Time,
    int? hrZone4Time,
    int? hrZone5Time,
    Map<String, dynamic>? streams,
    double? calories,
  }) {
    return Activity(
      id: id ?? this.id,
      stravaId: stravaId ?? this.stravaId,
      type: type ?? this.type,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      distance: distance ?? this.distance,
      movingTime: movingTime ?? this.movingTime,
      averageSpeed: averageSpeed ?? this.averageSpeed,
      averageHr: averageHr ?? this.averageHr,
      maxHr: maxHr ?? this.maxHr,
      averageCadence: averageCadence ?? this.averageCadence,
      hasHeartrate: hasHeartrate ?? this.hasHeartrate,
      totalElevation: totalElevation ?? this.totalElevation,
      trimp: trimp ?? this.trimp,
      runningTss: runningTss ?? this.runningTss,
      estimatedVdot: estimatedVdot ?? this.estimatedVdot,
      trainingType: trainingType ?? this.trainingType,
      hrZone1Time: hrZone1Time ?? this.hrZone1Time,
      hrZone2Time: hrZone2Time ?? this.hrZone2Time,
      hrZone3Time: hrZone3Time ?? this.hrZone3Time,
      hrZone4Time: hrZone4Time ?? this.hrZone4Time,
      hrZone5Time: hrZone5Time ?? this.hrZone5Time,
      streams: streams ?? this.streams,
      calories: calories ?? this.calories,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Activity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          stravaId == other.stravaId &&
          type == other.type &&
          name == other.name &&
          startDate == other.startDate &&
          distance == other.distance &&
          movingTime == other.movingTime &&
          averageSpeed == other.averageSpeed &&
          averageHr == other.averageHr &&
          maxHr == other.maxHr &&
          averageCadence == other.averageCadence &&
          hasHeartrate == other.hasHeartrate &&
          totalElevation == other.totalElevation &&
          trimp == other.trimp &&
          runningTss == other.runningTss &&
          estimatedVdot == other.estimatedVdot &&
          trainingType == other.trainingType &&
          hrZone1Time == other.hrZone1Time &&
          hrZone2Time == other.hrZone2Time &&
          hrZone3Time == other.hrZone3Time &&
          hrZone4Time == other.hrZone4Time &&
          hrZone5Time == other.hrZone5Time &&
          streams == other.streams &&
          calories == other.calories;

  @override
  int get hashCode => Object.hashAll([
        id,
        stravaId,
        type,
        name,
        startDate,
        distance,
        movingTime,
        averageSpeed,
        averageHr,
        maxHr,
        averageCadence,
        hasHeartrate,
        totalElevation,
        trimp,
        runningTss,
        estimatedVdot,
        trainingType,
        hrZone1Time,
        hrZone2Time,
        hrZone3Time,
        hrZone4Time,
        hrZone5Time,
        streams,
        calories,
      ]);
}

class Workout {
  const Workout({
    required this.id,
    required this.goalId,
    required this.scheduledDate,
    required this.workoutType,
    required this.description,
    required this.targetDistance,
    required this.targetPace,
    required this.targetDuration,
    required this.isCompleted,
    required this.completedAt,
    required this.activityId,
  });

  final String id;
  final String goalId;
  final DateTime scheduledDate;
  final WorkoutType workoutType;
  final String description;
  final double targetDistance;
  final double targetPace;
  final int targetDuration;
  final bool isCompleted;
  final DateTime? completedAt;
  final String? activityId;

  Workout copyWith({
    String? id,
    String? goalId,
    DateTime? scheduledDate,
    WorkoutType? workoutType,
    String? description,
    double? targetDistance,
    double? targetPace,
    int? targetDuration,
    bool? isCompleted,
    DateTime? completedAt,
    String? activityId,
  }) {
    return Workout(
      id: id ?? this.id,
      goalId: goalId ?? this.goalId,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      workoutType: workoutType ?? this.workoutType,
      description: description ?? this.description,
      targetDistance: targetDistance ?? this.targetDistance,
      targetPace: targetPace ?? this.targetPace,
      targetDuration: targetDuration ?? this.targetDuration,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      activityId: activityId ?? this.activityId,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Workout &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          goalId == other.goalId &&
          scheduledDate == other.scheduledDate &&
          workoutType == other.workoutType &&
          description == other.description &&
          targetDistance == other.targetDistance &&
          targetPace == other.targetPace &&
          targetDuration == other.targetDuration &&
          isCompleted == other.isCompleted &&
          completedAt == other.completedAt &&
          activityId == other.activityId;

  @override
  int get hashCode => Object.hash(
        id,
        goalId,
        scheduledDate,
        workoutType,
        description,
        targetDistance,
        targetPace,
        targetDuration,
        isCompleted,
        completedAt,
        activityId,
      );
}

class Goal {
  const Goal({
    required this.id,
    required this.userId,
    required this.name,
    required this.raceType,
    required this.raceDate,
    required this.targetTime,
    required this.weeklyMileageGoal,
    required this.planWeeks,
    required this.runsPerWeek,
    required this.longRunDay,
    required this.workoutDay,
    required this.currentVdot,
    required this.predictedTime,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    required this.completedAt,
    required this.workouts,
  });

  final String id;
  final String userId;
  final String name;
  final RaceType raceType;
  final DateTime raceDate;
  final int? targetTime;
  final double? weeklyMileageGoal;
  final int planWeeks;
  final int runsPerWeek;
  final int longRunDay;
  final int workoutDay;
  final double? currentVdot;
  final int? predictedTime;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final List<Workout> workouts;

  Goal copyWith({
    String? id,
    String? userId,
    String? name,
    RaceType? raceType,
    DateTime? raceDate,
    int? targetTime,
    double? weeklyMileageGoal,
    int? planWeeks,
    int? runsPerWeek,
    int? longRunDay,
    int? workoutDay,
    double? currentVdot,
    int? predictedTime,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? completedAt,
    List<Workout>? workouts,
  }) {
    return Goal(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      raceType: raceType ?? this.raceType,
      raceDate: raceDate ?? this.raceDate,
      targetTime: targetTime ?? this.targetTime,
      weeklyMileageGoal: weeklyMileageGoal ?? this.weeklyMileageGoal,
      planWeeks: planWeeks ?? this.planWeeks,
      runsPerWeek: runsPerWeek ?? this.runsPerWeek,
      longRunDay: longRunDay ?? this.longRunDay,
      workoutDay: workoutDay ?? this.workoutDay,
      currentVdot: currentVdot ?? this.currentVdot,
      predictedTime: predictedTime ?? this.predictedTime,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      completedAt: completedAt ?? this.completedAt,
      workouts: workouts ?? this.workouts,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Goal &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userId == other.userId &&
          name == other.name &&
          raceType == other.raceType &&
          raceDate == other.raceDate &&
          targetTime == other.targetTime &&
          weeklyMileageGoal == other.weeklyMileageGoal &&
          planWeeks == other.planWeeks &&
          runsPerWeek == other.runsPerWeek &&
          longRunDay == other.longRunDay &&
          workoutDay == other.workoutDay &&
          currentVdot == other.currentVdot &&
          predictedTime == other.predictedTime &&
          isActive == other.isActive &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt &&
          completedAt == other.completedAt &&
          listEquals(workouts, other.workouts);

  @override
  int get hashCode => Object.hash(
        id,
        userId,
        name,
        raceType,
        raceDate,
        targetTime,
        weeklyMileageGoal,
        planWeeks,
        runsPerWeek,
        longRunDay,
        workoutDay,
        currentVdot,
        predictedTime,
        isActive,
        createdAt,
        updatedAt,
        completedAt,
        Object.hashAll(workouts),
      );
}

class DashboardResponse {
  const DashboardResponse({
    required this.stats,
    required this.recentActivities,
    required this.goals,
    required this.syncStatus,
    required this.user,
    this.todayWorkout,
  });

  final AnalyticsStats stats;
  final List<Activity> recentActivities;
  final List<Goal> goals;
  final SyncStatus syncStatus;
  final User user;
  final Workout? todayWorkout;

  DashboardResponse copyWith({
    AnalyticsStats? stats,
    List<Activity>? recentActivities,
    List<Goal>? goals,
    SyncStatus? syncStatus,
    User? user,
    Workout? todayWorkout,
  }) {
    return DashboardResponse(
      stats: stats ?? this.stats,
      recentActivities: recentActivities ?? this.recentActivities,
      goals: goals ?? this.goals,
      syncStatus: syncStatus ?? this.syncStatus,
      user: user ?? this.user,
      todayWorkout: todayWorkout ?? this.todayWorkout,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DashboardResponse &&
          runtimeType == other.runtimeType &&
          stats == other.stats &&
          listEquals(recentActivities, other.recentActivities) &&
          listEquals(goals, other.goals) &&
          syncStatus == other.syncStatus &&
          user == other.user &&
          todayWorkout == other.todayWorkout;

  @override
  int get hashCode => Object.hash(
        stats,
        Object.hashAll(recentActivities),
        Object.hashAll(goals),
        syncStatus,
        user,
        todayWorkout,
      );
}
