// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AnalyticsStats _$AnalyticsStatsFromJson(Map<String, dynamic> json) =>
    _AnalyticsStats(
      currentWeekMileage: (json['currentWeekMileage'] as num).toDouble(),
      effectiveVO2max: (json['effectiveVO2max'] as num).toDouble(),
      rawVO2max: (json['rawVO2max'] as num).toDouble(),
      vdotCorrectionFactor: (json['vdotCorrectionFactor'] as num).toDouble(),
      marathonShape: (json['marathonShape'] as num).toDouble(),
      currentVdot: (json['currentVdot'] as num?)?.toDouble(),
      ctl: (json['ctl'] as num).toDouble(),
      atl: (json['atl'] as num).toDouble(),
      tsb: (json['tsb'] as num).toDouble(),
      workloadRatio: (json['workloadRatio'] as num).toDouble(),
      easyTrimp: (json['easyTrimp'] as num).toDouble(),
      hrMax: (json['hrMax'] as num).toInt(),
    );

Map<String, dynamic> _$AnalyticsStatsToJson(_AnalyticsStats instance) =>
    <String, dynamic>{
      'currentWeekMileage': instance.currentWeekMileage,
      'effectiveVO2max': instance.effectiveVO2max,
      'rawVO2max': instance.rawVO2max,
      'vdotCorrectionFactor': instance.vdotCorrectionFactor,
      'marathonShape': instance.marathonShape,
      'currentVdot': instance.currentVdot,
      'ctl': instance.ctl,
      'atl': instance.atl,
      'tsb': instance.tsb,
      'workloadRatio': instance.workloadRatio,
      'easyTrimp': instance.easyTrimp,
      'hrMax': instance.hrMax,
    };

_SyncStatus _$SyncStatusFromJson(Map<String, dynamic> json) => _SyncStatus(
  syncInProgress: json['syncInProgress'] as bool,
  lastSyncAt: json['lastSyncAt'] == null
      ? null
      : DateTime.parse(json['lastSyncAt'] as String),
  totalActivities: (json['totalActivities'] as num).toInt(),
);

Map<String, dynamic> _$SyncStatusToJson(_SyncStatus instance) =>
    <String, dynamic>{
      'syncInProgress': instance.syncInProgress,
      'lastSyncAt': instance.lastSyncAt?.toIso8601String(),
      'totalActivities': instance.totalActivities,
    };

_SyncResult _$SyncResultFromJson(Map<String, dynamic> json) => _SyncResult(
  success: json['success'] as bool,
  activitiesSynced: (json['activitiesSynced'] as num).toInt(),
  lastSyncAt: json['lastSyncAt'] == null
      ? null
      : DateTime.parse(json['lastSyncAt'] as String),
);

Map<String, dynamic> _$SyncResultToJson(_SyncResult instance) =>
    <String, dynamic>{
      'success': instance.success,
      'activitiesSynced': instance.activitiesSynced,
      'lastSyncAt': instance.lastSyncAt?.toIso8601String(),
    };

_Activity _$ActivityFromJson(Map<String, dynamic> json) => _Activity(
  id: json['id'] as String,
  stravaId: json['stravaId'] as String,
  type: $enumDecode(_$ActivityTypeEnumMap, json['type']),
  name: json['name'] as String,
  startDate: DateTime.parse(json['startDate'] as String),
  distance: (json['distance'] as num).toDouble(),
  movingTime: (json['movingTime'] as num).toInt(),
  averageSpeed: (json['averageSpeed'] as num?)?.toDouble(),
  averageHr: (json['averageHr'] as num?)?.toDouble(),
  maxHr: (json['maxHr'] as num?)?.toInt(),
  averageCadence: (json['averageCadence'] as num?)?.toDouble(),
  hasHeartrate: json['hasHeartrate'] as bool,
  totalElevation: (json['totalElevation'] as num).toDouble(),
  trimp: (json['trimp'] as num?)?.toDouble(),
  runningTss: (json['runningTss'] as num?)?.toDouble(),
  estimatedVdot: (json['estimatedVdot'] as num?)?.toDouble(),
  trainingType: json['trainingType'] as String?,
);

Map<String, dynamic> _$ActivityToJson(_Activity instance) => <String, dynamic>{
  'id': instance.id,
  'stravaId': instance.stravaId,
  'type': _$ActivityTypeEnumMap[instance.type]!,
  'name': instance.name,
  'startDate': instance.startDate.toIso8601String(),
  'distance': instance.distance,
  'movingTime': instance.movingTime,
  'averageSpeed': instance.averageSpeed,
  'averageHr': instance.averageHr,
  'maxHr': instance.maxHr,
  'averageCadence': instance.averageCadence,
  'hasHeartrate': instance.hasHeartrate,
  'totalElevation': instance.totalElevation,
  'trimp': instance.trimp,
  'runningTss': instance.runningTss,
  'estimatedVdot': instance.estimatedVdot,
  'trainingType': instance.trainingType,
};

const _$ActivityTypeEnumMap = {
  ActivityType.run: 'RUN',
  ActivityType.ride: 'RIDE',
  ActivityType.virtualRide: 'VIRTUAL_RIDE',
  ActivityType.walk: 'WALK',
  ActivityType.hike: 'HIKE',
  ActivityType.swim: 'SWIM',
  ActivityType.workout: 'WORKOUT',
  ActivityType.other: 'OTHER',
};

_Workout _$WorkoutFromJson(Map<String, dynamic> json) => _Workout(
  id: json['id'] as String,
  goalId: json['goalId'] as String,
  scheduledDate: DateTime.parse(json['scheduledDate'] as String),
  workoutType: workoutTypeFromJson(json['workoutType']),
  description: json['description'] as String,
  targetDistance: (json['targetDistance'] as num).toDouble(),
  targetPace: (json['targetPace'] as num).toDouble(),
  targetDuration: (json['targetDuration'] as num).toInt(),
  isCompleted: json['isCompleted'] as bool,
  completedAt: json['completedAt'] == null
      ? null
      : DateTime.parse(json['completedAt'] as String),
  activityId: json['activityId'] as String?,
);

Map<String, dynamic> _$WorkoutToJson(_Workout instance) => <String, dynamic>{
  'id': instance.id,
  'goalId': instance.goalId,
  'scheduledDate': instance.scheduledDate.toIso8601String(),
  'workoutType': workoutTypeToJson(instance.workoutType),
  'description': instance.description,
  'targetDistance': instance.targetDistance,
  'targetPace': instance.targetPace,
  'targetDuration': instance.targetDuration,
  'isCompleted': instance.isCompleted,
  'completedAt': instance.completedAt?.toIso8601String(),
  'activityId': instance.activityId,
};

_Goal _$GoalFromJson(Map<String, dynamic> json) => _Goal(
  id: json['id'] as String,
  userId: json['userId'] as String,
  name: json['name'] as String,
  raceType: $enumDecode(_$RaceTypeEnumMap, json['raceType']),
  raceDate: DateTime.parse(json['raceDate'] as String),
  targetTime: (json['targetTime'] as num?)?.toInt(),
  weeklyMileageGoal: (json['weeklyMileageGoal'] as num?)?.toDouble(),
  planWeeks: (json['planWeeks'] as num).toInt(),
  runsPerWeek: (json['runsPerWeek'] as num).toInt(),
  longRunDay: (json['longRunDay'] as num).toInt(),
  workoutDay: (json['workoutDay'] as num).toInt(),
  currentVdot: (json['currentVdot'] as num?)?.toDouble(),
  predictedTime: (json['predictedTime'] as num?)?.toInt(),
  isActive: json['isActive'] as bool,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
  completedAt: json['completedAt'] == null
      ? null
      : DateTime.parse(json['completedAt'] as String),
  workouts: (json['workouts'] as List<dynamic>)
      .map((e) => Workout.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$GoalToJson(_Goal instance) => <String, dynamic>{
  'id': instance.id,
  'userId': instance.userId,
  'name': instance.name,
  'raceType': _$RaceTypeEnumMap[instance.raceType]!,
  'raceDate': instance.raceDate.toIso8601String(),
  'targetTime': instance.targetTime,
  'weeklyMileageGoal': instance.weeklyMileageGoal,
  'planWeeks': instance.planWeeks,
  'runsPerWeek': instance.runsPerWeek,
  'longRunDay': instance.longRunDay,
  'workoutDay': instance.workoutDay,
  'currentVdot': instance.currentVdot,
  'predictedTime': instance.predictedTime,
  'isActive': instance.isActive,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
  'completedAt': instance.completedAt?.toIso8601String(),
  'workouts': instance.workouts,
};

const _$RaceTypeEnumMap = {
  RaceType.fiveK: 'FIVE_K',
  RaceType.tenK: 'TEN_K',
  RaceType.halfMarathon: 'HALF_MARATHON',
  RaceType.marathon: 'MARATHON',
};

_DashboardResponse _$DashboardResponseFromJson(Map<String, dynamic> json) =>
    _DashboardResponse(
      stats: AnalyticsStats.fromJson(json['stats'] as Map<String, dynamic>),
      recentActivities: (json['recentActivities'] as List<dynamic>)
          .map((e) => Activity.fromJson(e as Map<String, dynamic>))
          .toList(),
      goals: (json['goals'] as List<dynamic>)
          .map((e) => Goal.fromJson(e as Map<String, dynamic>))
          .toList(),
      syncStatus: SyncStatus.fromJson(
        json['syncStatus'] as Map<String, dynamic>,
      ),
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$DashboardResponseToJson(_DashboardResponse instance) =>
    <String, dynamic>{
      'stats': instance.stats,
      'recentActivities': instance.recentActivities,
      'goals': instance.goals,
      'syncStatus': instance.syncStatus,
      'user': instance.user,
    };
