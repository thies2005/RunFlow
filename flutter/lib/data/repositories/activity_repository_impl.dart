import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/ai_feedback_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';

class ActivityRepositoryImpl implements ActivityRepository {
  ActivityRepositoryImpl({
    required this.dio,
    required this.localDatasource,
  });

  final Dio dio;
  final LocalActivityDatasource localDatasource;

  @override
  Future<domain.ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    domain.ActivityType? type,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'limit': limit,
        'offset': offset,
      };
      if (type != null) {
        queryParameters['type'] = type.name.toUpperCase();
      }
      final response = await dio.get(
        ApiConstants.activitiesPath,
        queryParameters: queryParameters,
      );
      final result = ActivitiesResponse.fromJson(
        response.data as Map<String, dynamic>,
      ).toDomain();

      await localDatasource.upsertServerActivities(result.activities);

      final localOnlyActivities = await localDatasource.getUnsyncedActivities();
      if (localOnlyActivities.isNotEmpty) {
        final merged = [...localOnlyActivities, ...result.activities]
          ..sort((a, b) => b.startDate.compareTo(a.startDate));
        return domain.ActivitiesResponse(
          activities: merged,
          total: result.total + localOnlyActivities.length,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        );
      }

      return result;
    } on DioException catch (e) {
      if (e.error is OfflineException) {
        return _listFromLocal(limit: limit, offset: offset, type: type);
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activities.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Activity> getActivity(String id) async {
    try {
      final response = await dio.get('${ApiConstants.activitiesPath}/$id');
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(payload).toDomain();
    } on DioException catch (e) {
      if (e.error is OfflineException) {
        final local = await localDatasource.getActivityById(id);
        if (local != null) return local;
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Activity> updateActivity(String id, {String? name, domain.ActivityType? type, String? trainingType}) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (type != null) body['type'] = type.name.toUpperCase();
    if (trainingType != null) body['trainingType'] = trainingType;

    try {
      final response = await dio.put(
        '${ApiConstants.activitiesPath}/$id',
        data: body,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(payload).toDomain();
    } on DioException catch (e) {
      if (e.error is OfflineException) {
        final updates = <String, dynamic>{};
        if (name != null) updates['name'] = name;
        if (type != null) updates['type'] = type.name;
        if (trainingType != null) updates['training_type'] = trainingType;
        await localDatasource.updateActivityLocally(id, updates);
        await localDatasource.enqueueSync('activity_update', id, {
          'activityId': id,
          ...body,
        });
        final local = await localDatasource.getActivityById(id);
        if (local != null) return local;
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Activity> createActivity(domain.RecordedWorkout workout) async {
    final localId = LocalActivityDatasource.generateLocalId();

    final localActivity = domain.Activity(
      id: localId,
      stravaId: '',
      type: _activityTypeFromString(workout.activityType),
      name: workout.name,
      startDate: workout.startTime,
      distance: workout.distanceMeters,
      movingTime: workout.durationSeconds,
      averageSpeed: workout.averageSpeed,
      averageHr: workout.averageHr,
      maxHr: workout.maxHr,
      averageCadence: workout.averageCadence,
      hasHeartrate: workout.hasHeartrate,
      totalElevation: workout.totalElevation ?? 0.0,
      trimp: null,
      runningTss: null,
      estimatedVdot: null,
      trainingType: null,
      streams: _buildStreamsMap(workout),
    );

    await localDatasource.saveActivity(localActivity, localId, isSynced: false);

    final apiPayload = _buildCreatePayload(workout);

    try {
      final response = await dio.post(
        ApiConstants.activitiesPath,
        data: apiPayload,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      final serverActivity = Activity.fromJson(payload).toDomain();
      await localDatasource.markActivitySynced(localId, serverActivity.id, serverActivity);
      return serverActivity;
    } on DioException catch (e) {
      if (e.error is OfflineException) {
        await localDatasource.enqueueSync('activity_create', localId, apiPayload);
        return localActivity;
      }
      await localDatasource.enqueueSync('activity_create', localId, apiPayload);
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.Activity> createManualActivity({
    required String name,
    required DateTime date,
    required String type,
    required double distance,
    required int duration,
    double? hr,
  }) async {
    final localId = LocalActivityDatasource.generateLocalId();

    final localActivity = domain.Activity(
      id: localId,
      stravaId: '',
      type: _activityTypeFromString(type),
      name: name,
      startDate: date,
      distance: distance * 1000,
      movingTime: duration * 60,
      averageSpeed: null,
      averageHr: hr,
      maxHr: null,
      averageCadence: null,
      hasHeartrate: hr != null,
      totalElevation: 0.0,
      trimp: null,
      runningTss: null,
      estimatedVdot: null,
      trainingType: null,
    );

    await localDatasource.saveActivity(localActivity, localId, isSynced: false);

    final apiPayload = <String, dynamic>{
      'name': name,
      'type': type,
      'startDate': date.toIso8601String(),
      'distance': distance * 1000,
      'movingTime': duration * 60,
      'elapsedTime': duration * 60,
      'averageHr': hr,
      'hasHeartrate': hr != null ? true : null,
    }..removeWhere((_, value) => value == null);

    try {
      final response = await dio.post(
        ApiConstants.activitiesPath,
        data: apiPayload,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      final serverActivity = Activity.fromJson(payload).toDomain();
      await localDatasource.markActivitySynced(localId, serverActivity.id, serverActivity);
      return serverActivity;
    } on DioException catch (e) {
      if (e.error is OfflineException) {
        await localDatasource.enqueueSync('manual_activity_create', localId, apiPayload);
        return localActivity;
      }
      await localDatasource.enqueueSync('manual_activity_create', localId, apiPayload);
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.AiActivityFeedback> getAiFeedback(String activityId) async {
    try {
      final response = await dio.get(
        '/ai/activity-feedback',
        queryParameters: {'activityId': activityId},
      );
      return AiActivityFeedback.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['feedback'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load AI feedback.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.AiActivityFeedback> generateAiFeedback(String activityId) async {
    try {
      final response = await dio.post(
        '/ai/activity-feedback',
        data: {'activityId': activityId, 'regenerate': true},
      );
      return AiActivityFeedback.fromJson(
        unwrapPayload(
          response.data as Map<String, dynamic>,
          const ['feedback'],
        ),
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to generate AI feedback.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<domain.ActivitiesResponse> _listFromLocal({
    int limit = 50,
    int offset = 0,
    domain.ActivityType? type,
  }) async {
    final activities = await localDatasource.getLocalActivities(limit: limit, offset: offset);
    final filtered = type != null
        ? activities.where((a) => a.type == type).toList()
        : activities;
    return domain.ActivitiesResponse(
      activities: filtered,
      total: filtered.length,
      limit: limit,
      offset: offset,
      hasMore: false,
    );
  }

  domain.ActivityType _activityTypeFromString(String type) {
    return domain.ActivityType.values.firstWhere(
      (e) => e.name.toUpperCase() == type.toUpperCase(),
      orElse: () => domain.ActivityType.other,
    );
  }

  Map<String, dynamic>? _buildStreamsMap(domain.RecordedWorkout workout) {
    if (workout.gpsPoints.isEmpty && workout.hrSamples.isEmpty) return null;

    final List<double>? timeStream = workout.gpsPoints.isNotEmpty
        ? List.generate(
            workout.gpsPoints.length,
            (int i) => workout.gpsPoints[i].timestamp
                .difference(workout.startTime)
                .inSeconds
                .toDouble(),
          )
        : null;

    final List<List<double>>? latlngStream = workout.gpsPoints.isNotEmpty
        ? workout.gpsPoints
            .map((p) => <double>[p.latitude, p.longitude])
            .toList()
        : null;

    final List<double>? altitudeStream = workout.gpsPoints
            .any((p) => p.altitude != null)
        ? workout.gpsPoints
            .map((p) => p.altitude ?? 0.0)
            .toList()
        : null;

    final List<double>? hrStream = workout.hrSamples.isNotEmpty
        ? workout.hrSamples.map((h) => h.heartRate.toDouble()).toList()
        : null;

    final List<double>? velocityStream = workout.gpsPoints.isNotEmpty
        ? workout.gpsPoints.map((p) => p.speed).toList()
        : null;

    final streams = <String, dynamic>{
      'time': timeStream,
      'latlng': latlngStream,
      'altitude': altitudeStream,
      'velocity_smooth': velocityStream,
      'heartrate': hrStream,
    }..removeWhere((_, value) => value == null);

    return streams.isEmpty ? null : streams;
  }

  Map<String, dynamic> _buildCreatePayload(domain.RecordedWorkout workout) {
    final List<double>? timeStream = workout.gpsPoints.isNotEmpty
        ? List.generate(
            workout.gpsPoints.length,
            (int i) => workout.gpsPoints[i].timestamp
                .difference(workout.startTime)
                .inSeconds
                .toDouble(),
          )
        : null;

    final List<List<double>>? latlngStream = workout.gpsPoints.isNotEmpty
        ? workout.gpsPoints
            .map((p) => <double>[p.latitude, p.longitude])
            .toList()
        : null;

    final List<double>? altitudeStream = workout.gpsPoints
            .any((p) => p.altitude != null)
        ? workout.gpsPoints
            .map((p) => p.altitude ?? 0.0)
            .toList()
        : null;

    final List<double>? hrStream = workout.hrSamples.isNotEmpty
        ? workout.hrSamples.map((h) => h.heartRate.toDouble()).toList()
        : null;

    final List<double>? velocityStream = workout.gpsPoints.isNotEmpty
        ? workout.gpsPoints.map((p) => p.speed).toList()
        : null;

    final List<double>? cadenceStream = workout.gpsPoints.isNotEmpty
        ? workout.gpsPoints
            .where((p) => p.speed > 0)
            .map((p) => (p.speed * 2.5).clamp(0.0, 250.0).toDouble())
            .toList()
        : null;

    final streams = <String, dynamic>{
      'time': timeStream,
      'latlng': latlngStream,
      'altitude': altitudeStream,
      'velocity_smooth': velocityStream,
      'heartrate': hrStream,
      'cadence': cadenceStream,
    }..removeWhere((_, value) => value == null);

    return <String, dynamic>{
      'name': workout.name,
      'type': workout.activityType,
      'startDate': workout.startTime.toIso8601String(),
      'distance': workout.distanceMeters,
      'movingTime': workout.durationSeconds,
      'elapsedTime': workout.durationSeconds,
      if (workout.averageSpeed != null) 'averageSpeed': workout.averageSpeed,
      if (workout.maxSpeed != null) 'maxSpeed': workout.maxSpeed,
      if (workout.averageHr != null) 'averageHr': workout.averageHr,
      if (workout.maxHr != null) 'maxHr': workout.maxHr,
      if (workout.averageCadence != null)
        'averageCadence': workout.averageCadence,
      'hasHeartrate': workout.hasHeartrate,
      if (workout.totalElevation != null) 'totalElevation': workout.totalElevation,
      if (streams.isNotEmpty) 'streams': streams,
    };
  }
}
