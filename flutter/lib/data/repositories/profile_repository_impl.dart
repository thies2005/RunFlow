import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/constants/cache_keys.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl({required this.dio, required this.cacheDatasource});

  final Dio dio;
  final CacheDatasource cacheDatasource;

  @override
  Future<domain.UserProfile> getProfile() async {
    return _cacheFirst<domain.UserProfile>(
      cacheKey: CacheKeys.userProfile,
      fetch: _fetchProfileFromApi,
      decode: (json) => UserProfile.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      ).toDomain(),
      encode: (profile) => jsonEncode(profile.toData().toJson()),
      maxAge: const Duration(hours: 1),
    );
  }

  Future<domain.UserProfile> _fetchProfileFromApi() async {
    final response = await dio.get(ApiConstants.userProfilePath);
    final payload = unwrapPayload(
      Map<String, dynamic>.from(response.data as Map),
      const ['user'],
    );
    return UserProfile.fromJson(payload).toDomain();
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
      final result = UserProfile.fromJson(payload).toDomain();
      await cacheDatasource.set(
        CacheKeys.userProfile,
        jsonEncode(result.toData().toJson()),
      );
      return result;
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

  @override
  Future<void> deleteAccount() async {
    try {
      await dio.delete(ApiConstants.userDeleteUrl);
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to delete account.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  Future<T> _cacheFirst<T>({
    required String cacheKey,
    required Future<T> Function() fetch,
    required T Function(String) decode,
    required String Function(T) encode,
    Duration maxAge = const Duration(minutes: 15),
  }) async {
    final cached = await cacheDatasource.get(cacheKey);
    if (cached != null && !cacheDatasource.isExpired(cached, maxAge)) {
      unawaited(_refreshInBackground(cacheKey, fetch, encode));
      return decode(cached.data);
    }

    try {
      final result = await fetch();
      await cacheDatasource.set(cacheKey, encode(result));
      return result;
    } on DioException catch (e, stack) {
      logger.debug('Exception: $e\n$stack');
      if (cached != null) return decode(cached.data);
      rethrow;
    }
  }

  Future<void> _refreshInBackground<T>(
    String key,
    Future<T> Function() fetch,
    String Function(T) encode,
  ) async {
    try {
      final result = await fetch();
      await cacheDatasource.set(key, encode(result));
    } catch (e) {
      logger.debug('ProfileRepository: Background cache refresh failed for $key: $e');
    }
  }
}
