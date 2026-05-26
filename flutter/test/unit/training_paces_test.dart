import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';

void main() {
  group('calculateTrainingPaces', () {
    test('returns TrainingPaces for valid VDOT', () {
      final paces = calculateTrainingPaces(50);
      expect(paces.easyMin, greaterThan(0));
      expect(paces.easyMax, greaterThan(0));
      expect(paces.marathon, greaterThan(0));
      expect(paces.threshold, greaterThan(0));
      expect(paces.interval, greaterThan(0));
      expect(paces.repetition, greaterThan(0));
    });

    test('easy pace range is ordered: easyMin <= easyMax', () {
      final paces = calculateTrainingPaces(50);
      expect(paces.easyMin, lessThanOrEqualTo(paces.easyMax));
    });

    test('all paces are ordered fastest to slowest', () {
      final paces = calculateTrainingPaces(50);
      expect(paces.repetition, lessThanOrEqualTo(paces.interval));
      expect(paces.interval, lessThanOrEqualTo(paces.threshold));
      expect(paces.threshold, lessThanOrEqualTo(paces.easyMin));
      expect(paces.easyMin, lessThanOrEqualTo(paces.marathon));
      expect(paces.marathon, lessThanOrEqualTo(paces.easyMax));
    });

    test('higher VDOT produces faster (lower) threshold pace', () {
      final slower = calculateTrainingPaces(40);
      final faster = calculateTrainingPaces(60);
      expect(faster.threshold, lessThan(slower.threshold));
    });

    test('higher VDOT produces faster (lower) interval pace', () {
      final slower = calculateTrainingPaces(40);
      final faster = calculateTrainingPaces(60);
      expect(faster.interval, lessThan(slower.interval));
    });

    test('VDOT 50 threshold pace is reasonable (~4:30-5:00/km)', () {
      final paces = calculateTrainingPaces(50);
      expect(paces.threshold, greaterThanOrEqualTo(250));
      expect(paces.threshold, lessThanOrEqualTo(320));
    });

    test('VDOT 50 easy pace is reasonable (~4:35-6:00/km)', () {
      final paces = calculateTrainingPaces(50);
      expect(paces.easyMin, greaterThanOrEqualTo(270));
      expect(paces.easyMax, lessThanOrEqualTo(360));
    });

    test('VDOT 30 produces sensible paces', () {
      final paces = calculateTrainingPaces(30);
      expect(paces.threshold, greaterThan(0));
      expect(paces.interval, greaterThan(0));
    });

    test('VDOT 70 produces sensible paces', () {
      final paces = calculateTrainingPaces(70);
      expect(paces.threshold, greaterThan(0));
      expect(paces.interval, greaterThan(0));
      expect(paces.threshold, lessThanOrEqualTo(paces.easyMin));
    });

    test('produces no zero or negative paces for reasonable VDOT range', () {
      for (double vdot = 20; vdot <= 80; vdot += 5) {
        final paces = calculateTrainingPaces(vdot);
        expect(paces.easyMin, greaterThan(0), reason: 'VDOT=$vdot easyMin');
        expect(paces.easyMax, greaterThan(0), reason: 'VDOT=$vdot easyMax');
        expect(paces.marathon, greaterThan(0), reason: 'VDOT=$vdot marathon');
        expect(paces.threshold, greaterThan(0), reason: 'VDOT=$vdot threshold');
        expect(paces.interval, greaterThan(0), reason: 'VDOT=$vdot interval');
        expect(paces.repetition, greaterThan(0), reason: 'VDOT=$vdot repetition');
      }
    });
  });

  group('velocityAtPercentVO2max', () {
    test('returns positive velocity for valid VDOT and percentage', () {
      final v = velocityAtPercentVO2max(50, 0.88);
      expect(v, greaterThan(0));
    });

    test('higher percentage produces higher velocity', () {
      final low = velocityAtPercentVO2max(50, 0.65);
      final high = velocityAtPercentVO2max(50, 1.0);
      expect(high, greaterThan(low));
    });

    test('higher VDOT produces higher velocity at same percentage', () {
      final low = velocityAtPercentVO2max(40, 0.88);
      final high = velocityAtPercentVO2max(60, 0.88);
      expect(high, greaterThan(low));
    });
  });
}
