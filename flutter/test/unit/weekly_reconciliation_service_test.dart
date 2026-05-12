import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/services/readiness/weekly_reconciliation_service.dart';

void main() {
  late WeeklyReconciliationService service;

  setUp(() {
    service = WeeklyReconciliationService();
  });

  group('race week protection', () {
    test('returns null when raceWeeksRemaining is 0', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 80,
        adaptedLoad: 80,
        raceWeeksRemaining: 0,
      );
      expect(result, isNull);
    });

    test('returns null when raceWeeksRemaining is negative', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 80,
        adaptedLoad: 80,
        raceWeeksRemaining: -1,
      );
      expect(result, isNull);
    });
  });

  group('deficit buckets', () {
    test('minimal deficit (<10%) is applied without review', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 95,
        adaptedLoad: 95,
        raceWeeksRemaining: 10,
      );
      expect(result, isNotNull);
      expect(result!.deficitPercent, closeTo(5.0, 0.01));
      expect(result.surplusPercent, 0);
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('minimal deficit at 9.9% is applied without review', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 90.1,
        adaptedLoad: 90.1,
        raceWeeksRemaining: 10,
      );
      expect(result!.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('mild deficit (10-20%) is applied when raceWeeksRemaining > 4', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: 8,
      );
      expect(result!.deficitPercent, closeTo(15.0, 0.01));
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('mild deficit at exactly 10% triggers mild bucket', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 90,
        adaptedLoad: 90,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, closeTo(10.0, 0.01));
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('mild deficit flags review when raceWeeksRemaining <= 4', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: 3,
      );
      expect(result!.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('mild deficit flags review when raceWeeksRemaining is 4', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: 4,
      );
      expect(result!.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('moderate deficit (20-35%) flags review', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 75,
        adaptedLoad: 75,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, closeTo(25.0, 0.01));
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('deficit at exactly 35% falls in 20-35 bucket', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 65,
        adaptedLoad: 65,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, closeTo(35.0, 0.01));
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('significant deficit (>35%) flags manual review', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 50,
        adaptedLoad: 50,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, closeTo(50.0, 0.01));
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });
  });

  group('surplus detection', () {
    test('surplus >15% flags overreaching risk', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 118,
        adaptedLoad: 118,
        raceWeeksRemaining: 10,
      );
      expect(result!.surplusPercent, closeTo(18.0, 0.01));
      expect(result.deficitPercent, lessThanOrEqualTo(0));
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('surplus >25% flags high overreaching risk', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 130,
        adaptedLoad: 130,
        raceWeeksRemaining: 10,
      );
      expect(result!.surplusPercent, closeTo(30.0, 0.01));
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('surplus <=15% is within acceptable range', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 110,
        adaptedLoad: 110,
        raceWeeksRemaining: 10,
      );
      expect(result!.surplusPercent, closeTo(10.0, 0.01));
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });
  });

  group('race awareness', () {
    test('raceWeeksRemaining = 2 always flags review even with small deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 99,
        adaptedLoad: 99,
        raceWeeksRemaining: 2,
      );
      expect(result!.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('raceWeeksRemaining = 1 always flags review', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 1,
      );
      expect(result!.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('raceWeeksRemaining = 2 overrides auto-apply for mild deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: 2,
      );
      expect(result!.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('raceWeeksRemaining = 3 does not trigger near-race override', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 95,
        adaptedLoad: 95,
        raceWeeksRemaining: 3,
      );
      expect(result!.isApplied, true);
      expect(result.requiresReview, false);
    });
  });

  group('exact match and no-change paths', () {
    test('exact match produces no deficit or surplus', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, 0);
      expect(result.surplusPercent, 0);
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });
  });

  group('edge cases', () {
    test('plannedLoad = 0 produces zero deficit and surplus', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 0,
        actualLoad: 50,
        adaptedLoad: 50,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, 0);
      expect(result.surplusPercent, 0);
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('actualLoad = 0 with plannedLoad > 0 produces 100% deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 0,
        adaptedLoad: 0,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, 100);
      expect(result.isApplied, false);
      expect(result.requiresReview, true);
    });

    test('both loads zero is treated as on target', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 0,
        actualLoad: 0,
        adaptedLoad: 0,
        raceWeeksRemaining: 10,
      );
      expect(result!.deficitPercent, 0);
      expect(result.surplusPercent, 0);
      expect(result.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('null raceWeeksRemaining does not trigger race protection', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 95,
        adaptedLoad: 95,
        raceWeeksRemaining: null,
      );
      expect(result!.isApplied, true);
      expect(result.requiresReview, false);
    });

    test('null raceWeeksRemaining with mild deficit auto-applies', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: null,
      );
      expect(result!.isApplied, true);
      expect(result.requiresReview, false);
    });
  });

  group('adjustmentDescription', () {
    test('is meaningful for significant deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 50,
        adaptedLoad: 50,
        raceWeeksRemaining: 10,
      );
      expect(result!.adjustmentDescription, isNotNull);
      expect(result.adjustmentDescription!.isNotEmpty, true);
      expect(result.adjustmentDescription, contains('35%'));
    });

    test('is meaningful for moderate deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 75,
        adaptedLoad: 75,
        raceWeeksRemaining: 10,
      );
      expect(result!.adjustmentDescription, isNotNull);
      expect(result.adjustmentDescription!.isNotEmpty, true);
    });

    test('is meaningful for mild deficit', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 85,
        adaptedLoad: 85,
        raceWeeksRemaining: 10,
      );
      expect(result!.adjustmentDescription, isNotNull);
      expect(result.adjustmentDescription, contains('10'));
    });

    test('is meaningful for on-target week', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 10,
      );
      expect(result!.adjustmentDescription, isNotNull);
      expect(result.adjustmentDescription, contains('target'));
    });

    test('is meaningful for high surplus', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 130,
        adaptedLoad: 130,
        raceWeeksRemaining: 10,
      );
      expect(result!.adjustmentDescription, isNotNull);
      expect(result.adjustmentDescription, contains('overreaching'));
    });
  });

  group('record fields', () {
    test('stores all load values correctly', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 90,
        adaptedLoad: 85,
        raceWeeksRemaining: 10,
      );
      expect(result!.plannedLoad, 100);
      expect(result.actualLoad, 90);
      expect(result.adaptedLoad, 85);
    });

    test('stores weekStartDate', () {
      final date = DateTime(2026, 5, 11);
      final result = service.reconcile(
        weekStartDate: date,
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 10,
      );
      expect(result!.weekStartDate, date);
    });

    test('stores raceWeeksRemaining', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 8,
      );
      expect(result!.raceWeeksRemaining, 8);
    });

    test('sets createdAt to current time', () {
      final before = DateTime.now();
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 10,
      );
      final after = DateTime.now();
      expect(
        result!.createdAt.isAfter(before.subtract(const Duration(seconds: 1))),
        true,
      );
      expect(
        result.createdAt.isBefore(after.add(const Duration(seconds: 1))),
        true,
      );
    });

    test('sets syncedAt to null', () {
      final result = service.reconcile(
        weekStartDate: DateTime(2026, 5, 11),
        plannedLoad: 100,
        actualLoad: 100,
        adaptedLoad: 100,
        raceWeeksRemaining: 10,
      );
      expect(result!.syncedAt, isNull);
    });
  });
}
