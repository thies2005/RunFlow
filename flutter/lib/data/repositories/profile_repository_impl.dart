import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<UserProfile> getProfile() async {
    try {
      final response = await dio.get(ApiConstants.userProfilePath);
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['user'],
      );
      return UserProfile.fromJson(
        payload,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load profile.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<UserProfile> updateProfile(UpdateProfileRequest request) async {
    try {
      final response = await dio.put(
        ApiConstants.userProfilePath,
        data: request.toJson(),
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['user'],
      );
      return UserProfile.fromJson(
        payload,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update profile.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
