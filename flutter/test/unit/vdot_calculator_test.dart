import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/vdot_calculator.dart';

void main() {
  group('calculateHRZonesFromLTHR', () {
    test('returns empty list for zero LTHR', () {
      expect(calculateHRZonesFromLTHR(0), isEmpty);
    });

    test('returns empty list for negative LTHR', () {
      expect(calculateHRZonesFromLTHR(-10), isEmpty);
    });

    test('returns 7 zones for valid LTHR', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones.length, 7);
    });

    test('zone labels are correct', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[0].label, 'Z1 Recovery');
      expect(zones[1].label, 'Z2 Aerobic');
      expect(zones[2].label, 'Z3 Tempo');
      expect(zones[3].label, 'Z4 Threshold');
      expect(zones[4].label, 'Z5 VO2max');
      expect(zones[5].label, 'Z6 Anaerobic');
      expect(zones[6].label, 'Z7 Neuromuscular');
    });

    test('Z1 max is 75% of LTHR', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[0].max, (170 * 0.75).round());
    });

    test('Z4 max equals LTHR', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[3].max, 170);
    });

    test('zones are continuous — Z[n].max + 1 == Z[n+1].min', () {
      final zones = calculateHRZonesFromLTHR(170);
      for (int i = 0; i < zones.length - 1; i++) {
        expect(zones[i].max + 1, zones[i + 1].min,
            reason: 'Gap between ${zones[i].label} and ${zones[i + 1].label}');
      }
    });

    test('Z1 min is 0', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[0].min, 0);
    });

    test('Z7 max is 999', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[6].max, 999);
    });

    test('Z5 min is LTHR + 1', () {
      final zones = calculateHRZonesFromLTHR(170);
      expect(zones[4].min, 171);
    });

    test('all zone max values are greater than min values', () {
      final zones = calculateHRZonesFromLTHR(170);
      for (final z in zones) {
        expect(z.max, greaterThan(z.min), reason: z.label);
      }
    });

    test('zones are ordered by min value', () {
      final zones = calculateHRZonesFromLTHR(170);
      for (int i = 1; i < zones.length; i++) {
        expect(zones[i].min, greaterThan(zones[i - 1].min));
      }
    });

    test('works with typical athlete LTHR values', () {
      for (final lthr in [150, 160, 170, 180, 190]) {
        final zones = calculateHRZonesFromLTHR(lthr);
        expect(zones.length, 7, reason: 'LTHR=$lthr');
        expect(zones[3].max, lthr, reason: 'Z4 max should equal LTHR=$lthr');
      }
    });

    test('boundary percentages for LTHR=200', () {
      final zones = calculateHRZonesFromLTHR(200);
      expect(zones[0].max, 150); // 75%
      expect(zones[1].max, 174); // 87%
      expect(zones[2].max, 188); // 94%
      expect(zones[3].max, 200); // 100%
      expect(zones[4].max, 210); // 105%
      expect(zones[5].max, 220); // 110%
    });
  });

  group('calculateDefaultMaxLongRunKm', () {
    test('returns at least 6 for any input', () {
      final result = calculateDefaultMaxLongRunKm('marathon', 0);
      expect(result, greaterThanOrEqualTo(6));
    });

    test('returns 6 for very low mileage', () {
      expect(calculateDefaultMaxLongRunKm('fiveK', 5), 6);
    });

    test('5K caps at 18', () {
      expect(calculateDefaultMaxLongRunKm('fiveK', 100), 18);
    });

    test('marathon caps at 32', () {
      expect(calculateDefaultMaxLongRunKm('marathon', 100), 32);
    });

    test('scales with weekly mileage', () {
      final low = calculateDefaultMaxLongRunKm('marathon', 30);
      final high = calculateDefaultMaxLongRunKm('marathon', 60);
      expect(high, greaterThan(low));
    });
  });
}
