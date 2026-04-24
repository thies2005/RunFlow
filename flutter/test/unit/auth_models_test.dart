import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';

void main() {
  group('LoginRequest', () {
    test('serializes to JSON', () {
      const request = LoginRequest(code: 'test_auth_code');
      final json = request.toJson();

      expect(json['code'], 'test_auth_code');
    });

    test('deserializes from JSON', () {
      final json = {'code': 'test_auth_code'};
      final request = LoginRequest.fromJson(json);

      expect(request.code, 'test_auth_code');
    });

    test('round-trip serialization', () {
      const original = LoginRequest(code: 'round_trip_code');
      final json = original.toJson();
      final restored = LoginRequest.fromJson(json);

      expect(restored.code, original.code);
      expect(restored, original);
    });
  });

  group('LoginResponse', () {
    const testUser = User(
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    );

    final testJson = {
      'accessToken': 'access_token_123',
      'refreshToken': 'refresh_token_456',
      'expiresIn': 3600,
      'tokenType': 'Bearer',
      'user': {
        'id': 'user123',
        'email': 'test@example.com',
        'name': 'Test User',
      },
    };

    test('deserializes from JSON', () {
      final response = LoginResponse.fromJson(testJson);

      expect(response.accessToken, 'access_token_123');
      expect(response.refreshToken, 'refresh_token_456');
      expect(response.expiresIn, 3600);
      expect(response.tokenType, 'Bearer');
      expect(response.user.id, 'user123');
      expect(response.user.email, 'test@example.com');
      expect(response.user.name, 'Test User');
    });

    test('serializes to JSON', () {
      const response = LoginResponse(
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: testUser,
      );
      final json = response.toJson();

      expect(json['accessToken'], 'access_token_123');
      expect(json['refreshToken'], 'refresh_token_456');
      expect(json['expiresIn'], 3600);
      expect(json['user'], isA<User>());
      expect((json['user'] as User).id, 'user123');
    });

    test('round-trip serialization', () {
      final original = LoginResponse.fromJson(testJson);
      final serialized = jsonEncode(original.toJson());
      final restored = LoginResponse.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.accessToken, original.accessToken);
      expect(restored.refreshToken, original.refreshToken);
      expect(restored.expiresIn, original.expiresIn);
      expect(restored.user.id, original.user.id);
      expect(restored, original);
    });
  });

  group('User', () {
    test('handles all nullable fields as null', () {
      final json = {'id': 'user1'};
      final user = User.fromJson(json);

      expect(user.id, 'user1');
      expect(user.email, isNull);
      expect(user.name, isNull);
      expect(user.image, isNull);
      expect(user.sex, isNull);
      expect(user.birthDate, isNull);
      expect(user.hrMax, isNull);
      expect(user.hrRest, isNull);
      expect(user.weight, isNull);
      expect(user.height, isNull);
      expect(user.vdotCorrectionFactor, isNull);
      expect(user.lastSyncAt, isNull);
    });

    test('handles all fields populated', () {
      final json = {
        'id': 'user1',
        'email': 'test@example.com',
        'name': 'Test User',
        'image': 'https://example.com/avatar.jpg',
        'sex': 'male',
        'birthDate': '1990-01-15T00:00:00.000',
        'hrMax': 190,
        'hrRest': 60,
        'weight': 75.5,
        'height': 180.0,
        'vdotCorrectionFactor': 1.02,
        'lastSyncAt': '2024-01-01T12:00:00.000',
      };
      final user = User.fromJson(json);

      expect(user.id, 'user1');
      expect(user.email, 'test@example.com');
      expect(user.name, 'Test User');
      expect(user.image, 'https://example.com/avatar.jpg');
      expect(user.sex, Sex.male);
      expect(user.birthDate, isNotNull);
      expect(user.hrMax, 190);
      expect(user.hrRest, 60);
      expect(user.weight, 75.5);
      expect(user.height, 180.0);
      expect(user.vdotCorrectionFactor, 1.02);
      expect(user.lastSyncAt, isNotNull);
    });

    test('accepts uppercase sex values and serializes uppercase', () {
      final user = User.fromJson({
        'id': 'user1',
        'sex': 'MALE',
      });

      expect(user.sex, Sex.male);
      expect(user.toJson()['sex'], 'MALE');
    });

    test('round-trip serialization preserves all fields', () {
      final json = {
        'id': 'user1',
        'email': 'test@example.com',
        'name': 'Test',
        'sex': 'female',
        'hrMax': 185,
      };
      final original = User.fromJson(json);
      final serialized = original.toJson();
      final restored = User.fromJson(
        Map<String, dynamic>.from(serialized),
      );

      expect(restored.id, original.id);
      expect(restored.email, original.email);
      expect(restored.name, original.name);
      expect(restored.sex, original.sex);
      expect(restored.hrMax, original.hrMax);
    });
  });

  group('RefreshRequest', () {
    test('round-trip serialization', () {
      const original = RefreshRequest(refreshToken: 'refresh_123');
      final json = original.toJson();
      final restored = RefreshRequest.fromJson(json);

      expect(restored.refreshToken, 'refresh_123');
      expect(restored, original);
    });
  });

  group('RefreshResponse', () {
    test('round-trip serialization', () {
      final json = {
        'accessToken': 'new_access',
        'refreshToken': 'new_refresh',
      };
      final original = RefreshResponse.fromJson(json);
      final serialized = original.toJson();
      final restored = RefreshResponse.fromJson(
        Map<String, dynamic>.from(serialized),
      );

      expect(restored.accessToken, 'new_access');
      expect(restored.refreshToken, 'new_refresh');
      expect(restored, original);
    });
  });

  group('ApiError', () {
    test('deserializes from JSON', () {
      final json = {
        'error': 'Unauthorized',
        'timestamp': '2024-01-01T00:00:00.000Z',
        'code': 'UNAUTHORIZED',
        'path': '/api/mobile/v1/dashboard',
      };
      final apiError = ApiError.fromJson(json);

      expect(apiError.error, 'Unauthorized');
      expect(apiError.code, 'UNAUTHORIZED');
      expect(apiError.path, '/api/mobile/v1/dashboard');
      expect(apiError.timestamp, isNotNull);
    });

    test('handles nullable optional fields', () {
      final json = {
        'error': 'Server error',
        'timestamp': '2024-01-01T00:00:00.000Z',
      };
      final apiError = ApiError.fromJson(json);

      expect(apiError.error, 'Server error');
      expect(apiError.code, isNull);
      expect(apiError.details, isNull);
      expect(apiError.path, isNull);
    });
  });
}
