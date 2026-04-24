import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';

void main() {
  group('unwrapPayload', () {
    test('returns nested payload when envelope exists', () {
      final payload = unwrapPayload(
        {
          'user': {'id': 'u1', 'name': 'Runner'},
        },
        const ['user'],
      );

      expect(payload['id'], 'u1');
      expect(payload['name'], 'Runner');
    });

    test('returns original payload when envelope does not exist', () {
      final payload = unwrapPayload(
        {'id': 'g1', 'name': 'Goal'},
        const ['goal'],
      );

      expect(payload['id'], 'g1');
      expect(payload['name'], 'Goal');
    });
  });
}
