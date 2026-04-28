import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/ai_feedback_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/recording_models.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';

class ActivityRepositoryImpl implements ActivityRepository {
  ActivityRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    ActivityType? type,
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
      return ActivitiesResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activities.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<Activity> getActivity(String id) async {
    try {
      final response = await dio.get('${ApiConstants.activitiesPath}/$id');
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(
        payload,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<Activity> updateActivity(String id, {String? name, ActivityType? type, String? trainingType}) async {
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (type != null) body['type'] = type.name.toUpperCase();
      if (trainingType != null) body['trainingType'] = trainingType;

      final response = await dio.put(
        '${ApiConstants.activitiesPath}/$id',
        data: body,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(payload);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<Activity> createActivity(RecordedWorkout workout) async {
    try {
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
              .map((GpsPoint p) => <double>[p.latitude, p.longitude])
              .toList()
          : null;

      final List<double>? altitudeStream = workout.gpsPoints
              .any((GpsPoint p) => p.altitude != null)
          ? workout.gpsPoints
              .map((GpsPoint p) => p.altitude ?? 0.0)
              .toList()
          : null;

      final List<double>? hrStream = workout.hrSamples.isNotEmpty
          ? workout.hrSamples.map((HrSample h) => h.heartRate.toDouble()).toList()
          : null;

      final List<double>? velocityStream = workout.gpsPoints.isNotEmpty
          ? workout.gpsPoints.map((GpsPoint p) => p.speed).toList()
          : null;

      final List<double>? cadenceStream = workout.gpsPoints.isNotEmpty
          ? workout.gpsPoints
              .where((GpsPoint p) => p.speed > 0)
              .map((GpsPoint p) => (p.speed * 2.5).clamp(0.0, 250.0).toDouble())
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

      final body = <String, dynamic>{
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

      final response = await dio.post(
        ApiConstants.activitiesPath,
        data: body,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(payload);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<Activity> createManualActivity({
    required String name,
    required DateTime date,
    required String type,
    required double distance,
    required int duration,
    double? hr,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name,
        'type': type,
        'startDate': date.toIso8601String(),
        'distance': distance * 1000,
        'movingTime': duration * 60,
        'elapsedTime': duration * 60,
        'averageHr': hr,
        'hasHeartrate': hr != null ? true : null,
      }..removeWhere((_, value) => value == null);
      final response = await dio.post(
        ApiConstants.activitiesPath,
        data: body,
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['activity'],
      );
      return Activity.fromJson(payload);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create activity.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<AiActivityFeedback> getAiFeedback(String activityId) async {
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
      );
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
  Future<AiActivityFeedback> generateAiFeedback(String activityId) async {
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
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to generate AI feedback.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
