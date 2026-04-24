import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/vdot.dart';

void main() {
  group('calculateVdot', () {
    test('returns 0 for zero time', () {
      expect(calculateVdot(5000, 0), 0);
    });

    test('returns 0 for zero distance', () {
      expect(calculateVdot(0, 20), 0);
    });

    test('5K in 20 minutes produces valid VDOT', () {
      final vdot = calculateVdot(5000, 20);
      expect(vdot, greaterThan(45));
      expect(vdot, lessThan(55));
    });

    test('marathon in 3 hours produces valid VDOT', () {
      final vdot = calculateVdot(42195, 180);
      expect(vdot, greaterThan(48));
      expect(vdot, lessThan(58));
    });

    test('10K in 40 minutes produces valid VDOT', () {
      final vdot = calculateVdot(10000, 40);
      expect(vdot, greaterThan(48));
      expect(vdot, lessThan(56));
    });

    test('5K in 15 minutes produces high VDOT', () {
      final vdot = calculateVdot(5000, 15);
      expect(vdot, greaterThan(65));
      expect(vdot, lessThan(75));
    });

    test('slower run produces lower VDOT than faster', () {
      final faster = calculateVdot(5000, 20);
      final slower = calculateVdot(5000, 25);
      expect(faster, greaterThan(slower));
    });

    test('longer distance at same pace yields higher VDOT', () {
      final fiveK = calculateVdot(5000, 20);
      final tenK = calculateVdot(10000, 40);
      expect(tenK, greaterThan(fiveK));
    });
  });

  group('tsbStatus', () {
    test('returns Peaked for tsb >= 25', () {
      expect(tsbStatus(25), 'Peaked');
      expect(tsbStatus(30), 'Peaked');
    });

    test('returns Fresh for 5 <= tsb < 25', () {
      expect(tsbStatus(5), 'Fresh');
      expect(tsbStatus(24.9), 'Fresh');
    });

    test('returns Neutral for -10 <= tsb < 5', () {
      expect(tsbStatus(0), 'Neutral');
      expect(tsbStatus(-10), 'Neutral');
    });

    test('returns Fatigued for -30 <= tsb < -10', () {
      expect(tsbStatus(-15), 'Fatigued');
      expect(tsbStatus(-30), 'Fatigued');
    });

    test('returns Very Fatigued for tsb < -30', () {
      expect(tsbStatus(-31), 'Very Fatigued');
      expect(tsbStatus(-50), 'Very Fatigued');
    });
  });

  group('racePrediction', () {
    test('returns 0 for zero VDOT', () {
      expect(racePrediction(0, 5000), 0);
    });

    test('returns positive time for valid VDOT', () {
      final time = racePrediction(50, 5000);
      expect(time, greaterThan(0));
    });

    test('5K prediction time is reasonable', () {
      final time = racePrediction(50, 5000);
      expect(time, greaterThan(10));
      expect(time, lessThan(120));
    });

    test('10K prediction is longer than 5K for same VDOT', () {
      final fiveK = racePrediction(50, 5000);
      final tenK = racePrediction(50, 10000);
      expect(tenK, greaterThan(fiveK));
    });

    test('marathon prediction is longer than half marathon', () {
      final hm = racePrediction(50, 21097.5);
      final marathon = racePrediction(50, 42195);
      expect(marathon, greaterThan(hm));
    });

    test('higher VDOT produces faster predictions', () {
      final slower = racePrediction(40, 10000);
      final faster = racePrediction(55, 10000);
      expect(faster, lessThan(slower));
    });
  });

  group('estimateTime', () {
    test('returns positive value for valid inputs', () {
      final time = estimateTime(50, 5000);
      expect(time, greaterThan(0));
    });
  });
}
