import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/domain/entities/consent_entities.dart';
import 'package:runflow_flutter/domain/repositories/consent_repository.dart';

class ConsentRepositoryImpl implements ConsentRepository {
  ConsentRepositoryImpl({required this.dio});

  final Dio dio;

  @override
  Future<ConsentStatus> checkConsent() async {
    try {
      final response = await dio.get(ApiConstants.consentCheckPath);
      final data = response.data as Map<String, dynamic>;
      return ConsentStatus(
        needsReconsent: data['needsReconsent'] as bool? ?? false,
        missingPolicies: (data['missingPolicies'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to check consent status.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> grantConsents(List<String> consentTypes) async {
    try {
      final consents = consentTypes
          .map((type) => {'consentType': type, 'action': 'GRANTED'})
          .toList();
      await dio.post(
        ApiConstants.consentPath,
        data: {'consents': consents},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to grant consents.',
              statusCode: e.response?.statusCode,
            );
    }
  }

  @override
  Future<void> withdrawConsent(String consentType) async {
    try {
      await dio.post(
        ApiConstants.consentPath,
        data: {'consentType': consentType, 'action': 'WITHDRAWN'},
      );
    } on DioException catch (e) {
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to withdraw consent.',
              statusCode: e.response?.statusCode,
            );
    }
  }
}
