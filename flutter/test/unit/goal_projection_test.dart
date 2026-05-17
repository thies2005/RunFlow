import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/goal_projection.dart';

void main() {
  group('calculateProgressionCoefficient', () {
    test('0 weeks returns 1.0 (no time to improve)', () {
      expect(calculateProgressionCoefficient(0, 4, 40), 1.0);
    });

    test('12 weeks, 4 runs/week, 40 km/week is between 1.05 and 1.15', () {
      final coeff = calculateProgressionCoefficient(12, 4, 40);
      expect(coeff, greaterThanOrEqualTo(1.05));
      expect(coeff, lessThanOrEqualTo(1.15));
    });

    test('24 weeks with high training load does not exceed 1.15', () {
      final coeff = calculateProgressionCoefficient(24, 6, 100);
      expect(coeff, lessThanOrEqualTo(1.15));
    });

    test('extreme inputs are capped at 1.15', () {
      final coeff = calculateProgressionCoefficient(52, 7, 120);
      expect(coeff, equals(1.15));
    });

    test('0 runs/week returns 1.0 (no training = no improvement)', () {
      expect(calculateProgressionCoefficient(12, 0, 40), 1.0);
    });

    test('coefficient is always at least 1.0', () {
      final coeff = calculateProgressionCoefficient(1, 1, 10);
      expect(coeff, greaterThanOrEqualTo(1.0));
    });

    test('higher duration produces higher coefficient', () {
      final short = calculateProgressionCoefficient(8, 4, 40);
      final long = calculateProgressionCoefficient(20, 4, 40);
      expect(long, greaterThan(short));
    });

    test('higher frequency produces higher coefficient', () {
      final low = calculateProgressionCoefficient(12, 2, 40);
      final high = calculateProgressionCoefficient(12, 6, 40);
      expect(high, greaterThan(low));
    });

    test('higher volume produces higher coefficient', () {
      final low = calculateProgressionCoefficient(12, 4, 20);
      final high = calculateProgressionCoefficient(12, 4, 80);
      expect(high, greaterThan(low));
    });
  });
}
