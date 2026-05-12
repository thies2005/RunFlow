import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';

void main() {
  late TrimpService service;

  setUp(() {
    service = const TrimpService();
  });

  group('computeSessionTrimp', () {
    test('null averageHr returns 0', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 1800,
        averageHr: null,
        maxHr: 190,
        restingHr: 50,
      );
      expect(trimp, 0);
    });

    test('known HR reserve calculation with male exponent', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
      );
      final hrReserve = (150 - 50) / (190 - 50);
      expect(hrReserve, closeTo(0.7143, 0.001));
      final expected = 60.0 * hrReserve * 0.64 * exp(1.92 * hrReserve);
      expect(trimp, closeTo(expected, 0.01));
    });

    test('known HR reserve calculation with female exponent', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
        sex: 'female',
      );
      final hrReserve = (150 - 50) / (190 - 50);
      final expected = 60.0 * hrReserve * 0.64 * exp(1.67 * hrReserve);
      expect(trimp, closeTo(expected, 0.01));
    });

    test('female exponent differs from male', () {
      final male = service.computeSessionTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
        sex: 'male',
      );
      final female = service.computeSessionTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
        sex: 'female',
      );
      expect(male, isNot(closeTo(female, 0.01)));
    });

    test('HR reserve clamped to 0 when averageHr < restingHr', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 1800,
        averageHr: 40,
        maxHr: 190,
        restingHr: 50,
      );
      expect(trimp, closeTo(0, 0.01));
    });

    test('HR reserve clamped to 1 when averageHr > maxHr', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 1800,
        averageHr: 200,
        maxHr: 190,
        restingHr: 50,
      );
      final expected = 30.0 * 1.0 * 0.64 * exp(1.92 * 1.0);
      expect(trimp, closeTo(expected, 0.01));
    });

    test('zero duration returns 0', () {
      final trimp = service.computeSessionTrimp(
        durationSeconds: 0,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
      );
      expect(trimp, closeTo(0, 0.01));
    });
  });

  group('computeSessionTypeFallback', () {
    test('easy workout uses multiplier 1.0', () {
      final trimp = service.computeSessionTypeFallback(
        durationSeconds: 3600,
        workoutType: 'easy',
        config: null,
      );
      expect(trimp, closeTo(60 * 1.0 * 0.8, 0.01));
    });

    test('interval workout uses multiplier 1.8', () {
      final trimp = service.computeSessionTypeFallback(
        durationSeconds: 3600,
        workoutType: 'interval',
        config: null,
      );
      expect(trimp, closeTo(60 * 1.8 * 0.8, 0.01));
    });

    test('unknown workout type uses default multiplier 1.0', () {
      final trimp = service.computeSessionTypeFallback(
        durationSeconds: 3600,
        workoutType: 'unknown_type',
        config: null,
      );
      expect(trimp, closeTo(60 * 1.0 * 0.8, 0.01));
    });

    test('custom config multipliers are used', () {
      final customConfig = const TrimpConfig(
        sessionTypeMultipliers: {'custom': 2.5},
      );
      final trimp = service.computeSessionTypeFallback(
        durationSeconds: 3600,
        workoutType: 'custom',
        config: customConfig,
      );
      expect(trimp, closeTo(60 * 2.5 * 0.8, 0.01));
    });
  });

  group('computeTrimp', () {
    test('with averageHr uses heartRateReserve strategy', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: 50,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: 55,
      );
      expect(result.strategy, TrimpStrategy.heartRateReserve);
      expect(result.maxHrUsed, 190);
      expect(result.restingHrUsed, 50);
      expect(result.trimp, greaterThan(0));
    });

    test('without averageHr uses sessionTypeFallback strategy', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: null,
        maxHr: 190,
        restingHr: 50,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: 55,
      );
      expect(result.strategy, TrimpStrategy.sessionTypeFallback);
      expect(result.maxHrUsed, 190);
      expect(result.restingHrUsed, 50);
    });

    test('uses fallback maxHr when maxHr is null', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: null,
        restingHr: 50,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: 55,
      );
      expect(result.maxHrUsed, 185);
      expect(result.strategy, TrimpStrategy.heartRateReserve);
    });

    test('uses fallback restingHr when restingHr is null', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: null,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: 55,
      );
      expect(result.restingHrUsed, 55);
      expect(result.strategy, TrimpStrategy.heartRateReserve);
    });

    test('both maxHr unavailable returns unavailable strategy', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: null,
        restingHr: 50,
        workoutType: 'easy',
        fallbackMaxHr: null,
        fallbackRestingHr: 55,
      );
      expect(result.strategy, TrimpStrategy.unavailable);
      expect(result.trimp, 0);
    });

    test('both restingHr unavailable returns unavailable strategy', () {
      final result = service.computeTrimp(
        durationSeconds: 3600,
        averageHr: 150,
        maxHr: 190,
        restingHr: null,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: null,
      );
      expect(result.strategy, TrimpStrategy.unavailable);
      expect(result.trimp, 0);
    });

    test('HR reserve clamped when using computeTrimp', () {
      final result = service.computeTrimp(
        durationSeconds: 1800,
        averageHr: 40,
        maxHr: 190,
        restingHr: 50,
        workoutType: 'easy',
        fallbackMaxHr: 185,
        fallbackRestingHr: 55,
      );
      expect(result.trimp, closeTo(0, 0.01));
    });
  });

  group('computeAtl', () {
    test('empty list returns 0', () {
      expect(service.computeAtl([]), 0);
    });

    test('single value computes correctly', () {
      final values = [100.0];
      final atl = service.computeAtl(values);
      final factor = 1 / 7.0;
      expect(atl, closeTo(0 * (1 - factor) + 100 * factor, 0.01));
    });

    test('7-day decay matches expected formula', () {
      final values = List.generate(7, (_) => 100.0);
      final atl = service.computeAtl(values);
      final factor = 1 / 7.0;
      double expected = 0;
      for (final trimp in values) {
        expected = expected * (1 - factor) + trimp * factor;
      }
      expect(atl, closeTo(expected, 0.01));
    });

    test('custom decay config', () {
      final customConfig = const TrimpConfig(atlDecayDays: 5);
      final values = List.generate(10, (_) => 100.0);
      final atl = service.computeAtl(values, config: customConfig);
      final factor = 1 / 5.0;
      double expected = 0;
      for (final trimp in values) {
        expected = expected * (1 - factor) + trimp * factor;
      }
      expect(atl, closeTo(expected, 0.01));
    });

    test('varying values produce smooth average', () {
      final values = [50.0, 100.0, 150.0, 100.0, 50.0];
      final atl = service.computeAtl(values);
      expect(atl, greaterThan(0));
      expect(atl, lessThan(150));
    });
  });

  group('computeCtl', () {
    test('empty list returns 0', () {
      expect(service.computeCtl([]), 0);
    });

    test('42-day decay is slower than ATL', () {
      final values = List.generate(10, (_) => 100.0);
      final atl = service.computeAtl(values);
      final ctl = service.computeCtl(values);
      expect(ctl, lessThan(atl));
    });

    test('single value computes correctly', () {
      final values = [100.0];
      final ctl = service.computeCtl(values);
      final factor = 1 / 42.0;
      expect(ctl, closeTo(100 * factor, 0.01));
    });

    test('custom ctl decay config', () {
      final customConfig = const TrimpConfig(ctlDecayDays: 21);
      final values = List.generate(10, (_) => 100.0);
      final ctl = service.computeCtl(values, config: customConfig);
      final factor = 1 / 21.0;
      double expected = 0;
      for (final trimp in values) {
        expected = expected * (1 - factor) + trimp * factor;
      }
      expect(ctl, closeTo(expected, 0.01));
    });
  });

  group('computeTsb', () {
    test('positive TSB = fresh', () {
      final tsb = service.computeTsb(50, 30);
      expect(tsb, 20);
    });

    test('negative TSB = fatigued', () {
      final tsb = service.computeTsb(30, 50);
      expect(tsb, -20);
    });

    test('zero values', () {
      final tsb = service.computeTsb(0, 0);
      expect(tsb, 0);
    });

    test('TSB = CTL - ATL', () {
      final ctl = 60.5;
      final atl = 45.3;
      expect(service.computeTsb(ctl, atl), closeTo(15.2, 0.01));
    });
  });

  group('TrimpResult', () {
    test('holds all fields', () {
      const result = TrimpResult(
        trimp: 42.5,
        strategy: TrimpStrategy.heartRateReserve,
        maxHrUsed: 190,
        restingHrUsed: 50,
      );
      expect(result.trimp, 42.5);
      expect(result.strategy, TrimpStrategy.heartRateReserve);
      expect(result.maxHrUsed, 190);
      expect(result.restingHrUsed, 50);
    });

    test('optional fields can be null', () {
      const result = TrimpResult(
        trimp: 0,
        strategy: TrimpStrategy.unavailable,
      );
      expect(result.maxHrUsed, isNull);
      expect(result.restingHrUsed, isNull);
    });
  });
}
