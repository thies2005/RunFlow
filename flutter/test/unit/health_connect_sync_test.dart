import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';

void main() {
  group('HealthConnectServiceImpl', () {
    test('convertHealthDataPointToActivity is a static method', () {
      expect(HealthConnectServiceImpl.convertHealthDataPointToActivity, isA<Function>());
    });
  });
}
