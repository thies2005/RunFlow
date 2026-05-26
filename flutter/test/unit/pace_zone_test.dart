import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/pace_zone.dart';

void main() {
  group('PaceZoneResult.evaluate', () {
    test('returns noTarget when targetPace is zero', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 300,
        targetPaceSecondsPerKm: 0,
      );
      expect(result.status, PaceZoneStatus.noTarget);
    });

    test('returns noTarget when currentPace is zero', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 0,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.noTarget);
    });

    test('returns noTarget when both are zero', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 0,
        targetPaceSecondsPerKm: 0,
      );
      expect(result.status, PaceZoneStatus.noTarget);
    });

    test('returns inZone when current equals target exactly', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 300,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.inZone);
    });

    test('returns inZone when within 10% tolerance', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 315,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.inZone);
    });

    test('returns inZone when within tolerance on fast side', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 285,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.inZone);
    });

    test('returns tooSlow when more than 10% slower', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 340,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.tooSlow);
    });

    test('returns tooFast when more than 10% faster', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 260,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.tooFast);
    });

    test('exact tolerance boundary is inZone (upper)', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 330,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.inZone);
    });

    test('exact tolerance boundary is inZone (lower)', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 270,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.inZone);
    });

    test('just outside upper tolerance is tooSlow', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 331,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.tooSlow);
    });

    test('just outside lower tolerance is tooFast', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 269,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.status, PaceZoneStatus.tooFast);
    });

    test('delta is current - target', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 315,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.deltaSecondsPerKm, 15);
    });

    test('negative delta means faster than target', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 280,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.deltaSecondsPerKm, -20);
    });

    test('tolerance is 10% of target by default', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 300,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.toleranceSecondsPerKm, closeTo(30, 0.01));
    });

    test('custom tolerance percent works', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 300,
        targetPaceSecondsPerKm: 300,
        tolerancePercent: 0.15,
      );
      expect(result.toleranceSecondsPerKm, closeTo(45, 0.01));
    });

    test('preserves current and target pace in result', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 310,
        targetPaceSecondsPerKm: 300,
      );
      expect(result.currentPaceSecondsPerKm, 310);
      expect(result.targetPaceSecondsPerKm, 300);
    });

    test('noTarget result has zero tolerance and delta', () {
      final result = PaceZoneResult.evaluate(
        currentPaceSecondsPerKm: 300,
        targetPaceSecondsPerKm: 0,
      );
      expect(result.toleranceSecondsPerKm, 0);
      expect(result.deltaSecondsPerKm, 0);
    });
  });

  group('PaceZoneStatus', () {
    test('has all expected values', () {
      expect(PaceZoneStatus.values,
          containsAll([PaceZoneStatus.tooFast, PaceZoneStatus.inZone, PaceZoneStatus.tooSlow, PaceZoneStatus.noTarget]));
    });
  });
}
