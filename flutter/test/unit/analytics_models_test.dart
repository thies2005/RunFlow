import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/analytics_models.dart';

void main() {
  group('FitnessHistoryMetrics', () {
    test('deserializes from JSON', () {
      final json = {
        'ctl': 45.0,
        'atl': 30.0,
        'tsb': 15.0,
        'ctlRunning': 42.0,
      };
      final metrics = FitnessHistoryMetrics.fromJson(json);

      expect(metrics.ctl, 45.0);
      expect(metrics.atl, 30.0);
      expect(metrics.tsb, 15.0);
      expect(metrics.ctlRunning, 42.0);
    });

    test('round-trip serialization', () {
      final json = {
        'ctl': 50.0,
        'atl': 35.0,
        'tsb': 15.0,
        'ctlRunning': 48.0,
      };
      final original = FitnessHistoryMetrics.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = FitnessHistoryMetrics.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.ctl, original.ctl);
      expect(restored.atl, original.atl);
      expect(restored.tsb, original.tsb);
      expect(restored.ctlRunning, original.ctlRunning);
    });
  });

  group('FitnessHistory', () {
    test('deserializes from JSON', () {
      final json = {
        'date': '2024-06-15T00:00:00.000Z',
        'metrics': {
          'ctl': 45.0,
          'atl': 30.0,
          'tsb': 15.0,
          'ctlRunning': 42.0,
        },
      };
      final history = FitnessHistory.fromJson(json);

      expect(history.date, DateTime.utc(2024, 6, 15));
      expect(history.metrics.ctl, 45.0);
      expect(history.metrics.atl, 30.0);
      expect(history.metrics.tsb, 15.0);
    });

    test('round-trip serialization', () {
      final json = {
        'date': '2024-06-15T00:00:00.000Z',
        'metrics': {
          'ctl': 45.0,
          'atl': 30.0,
          'tsb': 15.0,
          'ctlRunning': 42.0,
        },
      };
      final original = FitnessHistory.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = FitnessHistory.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.date, original.date);
      expect(restored.metrics.ctl, original.metrics.ctl);
      expect(restored.metrics.atl, original.metrics.atl);
      expect(restored.metrics.tsb, original.metrics.tsb);
    });

    test('handles list deserialization', () {
      final jsonList = [
        {
          'date': '2024-06-15T00:00:00.000Z',
          'metrics': {
            'ctl': 45.0,
            'atl': 30.0,
            'tsb': 15.0,
            'ctlRunning': 42.0,
          },
        },
        {
          'date': '2024-06-14T00:00:00.000Z',
          'metrics': {
            'ctl': 44.0,
            'atl': 31.0,
            'tsb': 13.0,
            'ctlRunning': 41.0,
          },
        },
      ];
      final list = jsonList
          .map((e) => FitnessHistory.fromJson(e as Map<String, dynamic>))
          .toList();

      expect(list.length, 2);
      expect(list[0].metrics.ctl, 45.0);
      expect(list[1].metrics.ctl, 44.0);
    });
  });
}
