import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';

class WeeklyReconciliationService {
  WeeklyReconciliationRecord? reconcile({
    required DateTime weekStartDate,
    required double plannedLoad,
    required double actualLoad,
    required double adaptedLoad,
    required int? raceWeeksRemaining,
  }) {
    if (raceWeeksRemaining != null && raceWeeksRemaining <= 0) return null;

    final deficitPercent = plannedLoad > 0
        ? ((plannedLoad - actualLoad) / plannedLoad) * 100
        : 0.0;
    final surplusPercent =
        actualLoad > plannedLoad && plannedLoad > 0
            ? ((actualLoad - plannedLoad) / plannedLoad) * 100
            : 0.0;

    bool isApplied = false;
    bool requiresReview = false;
    String? adjustmentDescription;

    if (deficitPercent > 35) {
      isApplied = false;
      requiresReview = true;
      adjustmentDescription =
          'Significant deficit (>35%) detected. Manual review required to adjust training plan.';
    } else if (deficitPercent > 20) {
      isApplied = false;
      requiresReview = true;
      adjustmentDescription =
          'Moderate deficit (20-35%) detected. Volume should be distributed across two easy days.';
    } else if (deficitPercent >= 10) {
      isApplied = raceWeeksRemaining == null || raceWeeksRemaining > 4;
      requiresReview =
          raceWeeksRemaining != null && raceWeeksRemaining <= 4;
      adjustmentDescription =
          'Mild deficit (10-20%) detected. Add 5-10% volume to one easy day.';
    } else if (deficitPercent > 0) {
      isApplied = true;
      requiresReview = false;
      adjustmentDescription =
          'Minimal deficit (<10%). Training on track, no adjustment needed.';
    } else {
      if (surplusPercent > 25) {
        isApplied = false;
        requiresReview = true;
        adjustmentDescription =
            'High surplus (>25%) detected. Risk of overreaching. Manual review required.';
      } else if (surplusPercent > 15) {
        isApplied = false;
        requiresReview = true;
        adjustmentDescription =
            'Surplus (>15%) detected. Possible overreaching risk. Review recommended.';
      } else {
        isApplied = true;
        requiresReview = false;
        adjustmentDescription = surplusPercent > 0
            ? 'Slight surplus. Within acceptable range.'
            : 'Training load on target. No adjustment needed.';
      }
    }

    if (raceWeeksRemaining != null && raceWeeksRemaining <= 2) {
      isApplied = false;
      requiresReview = true;
    }

    return WeeklyReconciliationRecord(
      weekStartDate: weekStartDate,
      plannedLoad: plannedLoad,
      actualLoad: actualLoad,
      adaptedLoad: adaptedLoad,
      deficitPercent: deficitPercent,
      surplusPercent: surplusPercent,
      adjustmentDescription: adjustmentDescription,
      isApplied: isApplied,
      raceWeeksRemaining: raceWeeksRemaining,
      requiresReview: requiresReview,
      createdAt: DateTime.now(),
      syncedAt: null,
    );
  }
}
