import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<domain.UserProfile> getProfile() async {
    try {
      final response = await dio.get(ApiConstants.userProfilePath);
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['user'],
      );
      return UserProfile.fromJson(
        payload,
      ).toDomain();
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
  Future<domain.UserProfile> updateProfile(domain.UpdateProfileRequest request) async {
    try {
      final response = await dio.put(
        ApiConstants.userProfilePath,
        data: request.toData().toJson(),
      );
      final payload = unwrapPayload(
        Map<String, dynamic>.from(response.data as Map),
        const ['user'],
      );
      return UserProfile.fromJson(
        payload,
      ).toDomain();
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to update profile.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.ApiKeyInfo> getApiKeyInfo() async {
    try {
      final response = await dio.get(ApiConstants.apiKeyPath);
      final data = response.data as Map<String, dynamic>;
      if (!(data['hasKey'] as bool? ?? false)) {
        return const domain.ApiKeyInfo(hasKey: false);
      }
      return domain.ApiKeyInfo(
        hasKey: true,
        keyPrefix: data['keyPrefix'] as String?,
        name: data['name'] as String?,
        createdAt: data['createdAt'] != null
            ? DateTime.tryParse(data['createdAt'].toString())
            : null,
        lastUsedAt: data['lastUsedAt'] != null
            ? DateTime.tryParse(data['lastUsedAt'].toString())
            : null,
        expiresAt: data['expiresAt'] != null
            ? DateTime.tryParse(data['expiresAt'].toString())
            : null,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to get API key info.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<domain.GeneratedApiKey> generateApiKey({String name = 'My API Key'}) async {
    try {
      final response = await dio.post(
        ApiConstants.apiKeyPath,
        data: {'name': name},
      );
      final data = response.data as Map<String, dynamic>;
      return domain.GeneratedApiKey(
        apiKey: data['apiKey'] as String,
        keyPrefix: data['keyPrefix'] as String? ?? '',
        name: data['name'] as String? ?? name,
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to generate API key.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> revokeApiKey() async {
    try {
      await dio.delete(ApiConstants.apiKeyPath);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to revoke API key.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
