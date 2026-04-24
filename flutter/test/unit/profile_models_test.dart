import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';

void main() {
  group('UserProfile', () {
    test('parses uppercase sex and extended profile fields', () {
      final profile = UserProfile.fromJson({
        'id': 'user1',
        'sex': 'FEMALE',
        'birthDate': '1990-01-15T00:00:00.000Z',
        'hrZone5Max': 180,
        'hrZone6Max': 190,
        'thresholdHeartRate': 172,
        'thresholdPace': 250,
        'createdAt': '2024-01-01T00:00:00.000Z',
      });

      expect(profile.sex, Sex.female);
      expect(profile.hrZone5Max, 180);
      expect(profile.hrZone6Max, 190);
      expect(profile.thresholdHeartRate, 172);
      expect(profile.thresholdPace, 250);
      expect(profile.createdAt, isNotNull);
    });
  });

  group('UpdateProfileRequest', () {
    test('serializes sex uppercase and birth date as date only', () {
      final request = UpdateProfileRequest(
        sex: Sex.male,
        birthDate: DateTime.utc(1990, 1, 15, 12),
      );

      final json = request.toJson();

      expect(json['sex'], 'MALE');
      expect(json['birthDate'], '1990-01-15');
    });
  });
}
