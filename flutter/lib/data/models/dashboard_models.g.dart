// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AnalyticsStats _$AnalyticsStatsFromJson(Map<String, dynamic> json) =>
    _AnalyticsStats(
      currentWeekMileage: _parseDouble(json['currentWeekMileage']),
      effectiveVO2max: _parseDouble(json['effectiveVO2max']),
      rawVO2max: _parseDouble(json['rawVO2max']),
      vdotCorrectionFactor: _parseDouble(json['vdotCorrectionFactor']),
      marathonShape: _parseDouble(json['marathonShape']),
      currentVdot: _parseDoubleNullable(json['currentVdot']),
      ctl: _parseDouble(json['ctl']),
      atl: _parseDouble(json['atl']),
      tsb: _parseDouble(json['tsb']),
      workloadRatio: _parseDouble(json['workloadRatio']),
      easyTrimp: _parseDouble(json['easyTrimp']),
      hrMax: json['hrMax'] == null ? 0 : _parseIntSafe(json['hrMax']),
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
  hrZone1Time: (json['hrZone1Time'] as num?)?.toInt() ?? 0,
  hrZone2Time: (json['hrZone2Time'] as num?)?.toInt() ?? 0,
  hrZone3Time: (json['hrZone3Time'] as num?)?.toInt() ?? 0,
  hrZone4Time: (json['hrZone4Time'] as num?)?.toInt() ?? 0,
  hrZone5Time: (json['hrZone5Time'] as num?)?.toInt() ?? 0,
  streams: json['streams'] as Map<String, dynamic>?,
  calories: (json['calories'] as num?)?.toDouble(),
  averageWatts: (json['averageWatts'] as num?)?.toDouble(),
  weightedAverageWatts: (json['weightedAverageWatts'] as num?)?.toDouble(),
  deviceWatts: json['deviceWatts'] as bool? ?? false,
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
  'hrZone1Time': instance.hrZone1Time,
  'hrZone2Time': instance.hrZone2Time,
  'hrZone3Time': instance.hrZone3Time,
  'hrZone4Time': instance.hrZone4Time,
  'hrZone5Time': instance.hrZone5Time,
  'streams': instance.streams,
  'calories': instance.calories,
  'averageWatts': instance.averageWatts,
  'weightedAverageWatts': instance.weightedAverageWatts,
  'deviceWatts': instance.deviceWatts,
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
  description: json['description'] as String? ?? '',
  targetDistance: (json['targetDistance'] as num?)?.toDouble() ?? 0.0,
  targetPace: (json['targetPace'] as num?)?.toDouble() ?? 0.0,
  targetDuration: (json['targetDuration'] as num?)?.toInt() ?? 0,
  isCompleted: json['isCompleted'] as bool? ?? false,
  completedAt: json['completedAt'] == null
      ? null
      : DateTime.parse(json['completedAt'] as String),
  activityId: json['activityId'] as String?,
  sport: json['sport'] as String? ?? 'RUN',
  displayDescription: json['displayDesc'] as String?,
  intensityZone: json['intensityZone'] as String?,
  phase: json['phase'] as String?,
  targetHrZone: (json['targetHrZone'] as num?)?.toInt(),
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
  'sport': instance.sport,
  'displayDesc': instance.displayDescription,
  'intensityZone': instance.intensityZone,
  'phase': instance.phase,
  'targetHrZone': instance.targetHrZone,
};

_Goal _$GoalFromJson(Map<String, dynamic> json) => _Goal(
  id: json['id'] as String,
  userId: json['userId'] as String? ?? '',
  name: json['name'] as String,
  raceType: $enumDecodeNullable(_$RaceTypeEnumMap, json['raceType']),
  raceDate: json['raceDate'] == null
      ? null
      : DateTime.parse(json['raceDate'] as String),
  targetTime: (json['targetTime'] as num?)?.toInt(),
  weeklyMileageGoal: (json['weeklyMileageGoal'] as num?)?.toDouble(),
  planWeeks: (json['planWeeks'] as num?)?.toInt() ?? 12,
  runsPerWeek: (json['runsPerWeek'] as num?)?.toInt() ?? 4,
  longRunDay: (json['longRunDay'] as num?)?.toInt() ?? 0,
  workoutDay: (json['workoutDay'] as num?)?.toInt() ?? 3,
  currentVdot: (json['currentVdot'] as num?)?.toDouble(),
  predictedTime: (json['predictedTime'] as num?)?.toInt(),
  isActive: json['isActive'] as bool? ?? true,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
  completedAt: json['completedAt'] == null
      ? null
      : DateTime.parse(json['completedAt'] as String),
  workouts:
      (json['workouts'] as List<dynamic>?)
          ?.map((e) => Workout.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  backyardLoopDistM: (json['backyardLoopDistM'] as num?)?.toDouble(),
  targetLaps: (json['targetLaps'] as num?)?.toInt(),
  sport: json['sport'] as String? ?? 'RUN',
  planSource: json['planSource'] as String? ?? 'standard',
  ridesPerWeek: (json['ridesPerWeek'] as num?)?.toInt() ?? 0,
  swimsPerWeek: (json['swimsPerWeek'] as num?)?.toInt() ?? 0,
  strengthPerWeek: (json['strengthPerWeek'] as num?)?.toInt() ?? 0,
  taperWeeks: (json['taperWeeks'] as num?)?.toInt() ?? 2,
  peakWeeks: (json['peakWeeks'] as num?)?.toInt() ?? 4,
  buildWeeks: (json['buildWeeks'] as num?)?.toInt() ?? 4,
  restDays:
      (json['restDays'] as List<dynamic>?)
          ?.map((e) => (e as num).toInt())
          .toList() ??
      const [],
);

Map<String, dynamic> _$GoalToJson(_Goal instance) => <String, dynamic>{
  'id': instance.id,
  'userId': instance.userId,
  'name': instance.name,
  'raceType': _$RaceTypeEnumMap[instance.raceType],
  'raceDate': instance.raceDate?.toIso8601String(),
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
  'backyardLoopDistM': instance.backyardLoopDistM,
  'targetLaps': instance.targetLaps,
  'sport': instance.sport,
  'planSource': instance.planSource,
  'ridesPerWeek': instance.ridesPerWeek,
  'swimsPerWeek': instance.swimsPerWeek,
  'strengthPerWeek': instance.strengthPerWeek,
  'taperWeeks': instance.taperWeeks,
  'peakWeeks': instance.peakWeeks,
  'buildWeeks': instance.buildWeeks,
  'restDays': instance.restDays,
};

const _$RaceTypeEnumMap = {
  RaceType.fiveK: 'FIVE_K',
  RaceType.tenK: 'TEN_K',
  RaceType.halfMarathon: 'HALF_MARATHON',
  RaceType.marathon: 'MARATHON',
  RaceType.fiftyK: 'FIFTY_K',
  RaceType.fiftyMile: 'FIFTY_MILE',
  RaceType.hundredK: 'HUNDRED_K',
  RaceType.hundredMile: 'HUNDRED_MILE',
  RaceType.twelveHour: 'TWELVE_HOUR',
  RaceType.twentyFourHour: 'TWENTY_FOUR_HOUR',
  RaceType.backyardUltra: 'BACKYARD_ULTRA',
  RaceType.customDistance: 'CUSTOM_DISTANCE',
  RaceType.sprintTri: 'SPRINT_TRI',
  RaceType.olympicTri: 'OLYMPIC_TRI',
  RaceType.halfIronman: 'HALF_IRONMAN',
  RaceType.fullIronman: 'FULL_IRONMAN',
  RaceType.customTri: 'CUSTOM_TRI',
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
      todayWorkout: json['todayWorkout'] == null
          ? null
          : Workout.fromJson(json['todayWorkout'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$DashboardResponseToJson(_DashboardResponse instance) =>
    <String, dynamic>{
      'stats': instance.stats,
      'recentActivities': instance.recentActivities,
      'goals': instance.goals,
      'syncStatus': instance.syncStatus,
      'user': instance.user,
      'todayWorkout': instance.todayWorkout,
    };
