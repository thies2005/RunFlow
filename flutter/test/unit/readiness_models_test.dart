import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';

void main() {
  group('RhrMetricsModel', () {
    test('round-trip serialization', () {
      const model = RhrMetricsModel(
        todayRhr: 52.0,
        baselineRhr: 55.0,
        rhrDelta: -3.0,
        trendDirection: -1,
      );
      final json = jsonEncode(model.toJson());
      final restored = RhrMetricsModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.todayRhr, 52.0);
      expect(restored.baselineRhr, 55.0);
      expect(restored.rhrDelta, -3.0);
      expect(restored.trendDirection, -1);
    });

    test('handles null optional fields', () {
      const model = RhrMetricsModel();
      final json = model.toJson();
      final restored = RhrMetricsModel.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.todayRhr, isNull);
      expect(restored.baselineRhr, isNull);
      expect(restored.rhrDelta, isNull);
      expect(restored.trendDirection, isNull);
    });
  });

  group('SleepMetricsModel', () {
    test('round-trip serialization', () {
      const model = SleepMetricsModel(
        totalDurationMinutes: 420.0,
        deepMinutes: 60.0,
        remMinutes: 90.0,
        lightMinutes: 180.0,
        deepPercent: 14.3,
        remPercent: 21.4,
        sleepEfficiency: 92.0,
      );
      final json = jsonEncode(model.toJson());
      final restored = SleepMetricsModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.totalDurationMinutes, 420.0);
      expect(restored.deepMinutes, 60.0);
      expect(restored.remMinutes, 90.0);
      expect(restored.sleepEfficiency, 92.0);
    });

    test('handles null optional fields', () {
      const model = SleepMetricsModel();
      final json = model.toJson();
      final restored = SleepMetricsModel.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.totalDurationMinutes, isNull);
      expect(restored.deepMinutes, isNull);
    });
  });

  group('LoadMetricsModel', () {
    test('round-trip serialization', () {
      const model = LoadMetricsModel(
        todayTrimp: 85.0,
        atl: 45.0,
        ctl: 55.0,
        tsb: 10.0,
        workloadRatio: 1.2,
        trimpStrategy: 'heartRateReserve',
        sevenDayTrimpTotal: 320.0,
      );
      final json = jsonEncode(model.toJson());
      final restored = LoadMetricsModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.todayTrimp, 85.0);
      expect(restored.atl, 45.0);
      expect(restored.trimpStrategy, 'heartRateReserve');
      expect(restored.sevenDayTrimpTotal, 320.0);
    });
  });

  group('SubjectiveInputModel', () {
    test('round-trip serialization with date string', () {
      const model = SubjectiveInputModel(
        exhaustionLevel: 3,
        muscleSoreness: 2,
        stressLevel: 1,
        note: 'Feeling okay',
        enteredAt: '2024-06-15T08:30:00.000',
      );
      final json = jsonEncode(model.toJson());
      final restored = SubjectiveInputModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.exhaustionLevel, 3);
      expect(restored.muscleSoreness, 2);
      expect(restored.stressLevel, 1);
      expect(restored.note, 'Feeling okay');
      expect(restored.enteredAt, '2024-06-15T08:30:00.000');
    });

    test('handles null optional fields', () {
      const model = SubjectiveInputModel();
      final json = model.toJson();
      final restored = SubjectiveInputModel.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.exhaustionLevel, isNull);
      expect(restored.note, isNull);
      expect(restored.enteredAt, isNull);
    });
  });

  group('ComponentScoreModel', () {
    test('round-trip serialization', () {
      const model = ComponentScoreModel(
        component: 'hrr',
        score: 85.0,
        isAvailable: true,
        reason: null,
      );
      final json = jsonEncode(model.toJson());
      final restored = ComponentScoreModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.component, 'hrr');
      expect(restored.score, 85.0);
      expect(restored.isAvailable, true);
      expect(restored.reason, isNull);
    });
  });

  group('ReadinessOverrideModel', () {
    test('round-trip serialization', () {
      const model = ReadinessOverrideModel(
        state: 'harder',
        note: 'User wants to push',
        overriddenAt: '2024-06-15T09:00:00.000',
      );
      final json = jsonEncode(model.toJson());
      final restored = ReadinessOverrideModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.state, 'harder');
      expect(restored.note, 'User wants to push');
      expect(restored.overriddenAt, '2024-06-15T09:00:00.000');
    });
  });

  group('DailyReadinessRecordModel', () {
    test('round-trip serialization with nested objects', () {
      final model = DailyReadinessRecordModel(
        date: '2024-06-15',
        rhr: const RhrMetricsModel(todayRhr: 52.0, baselineRhr: 55.0),
        sleep: const SleepMetricsModel(totalDurationMinutes: 420.0),
        load: const LoadMetricsModel(atl: 45.0),
        subjective: const SubjectiveInputModel(exhaustionLevel: 3),
        componentScores: const [
          ComponentScoreModel(
              component: 'hrr', score: 85.0, isAvailable: true),
          ComponentScoreModel(
              component: 'sleep', score: 70.0, isAvailable: true),
        ],
        compositeScore: 77.5,
        state: 'good',
        confidence: 'full',
        reasons: ['RHR below baseline', 'Good sleep'],
        readinessOverride: const ReadinessOverrideModel(
            state: 'none', overriddenAt: '2024-06-15T09:00:00.000'),
        computedAt: '2024-06-15T08:00:00.000',
        syncedAt: '2024-06-15T08:05:00.000',
        maxHr: 190,
        restingHr: 55,
      );
      final json = jsonEncode(model.toJson());
      final restored = DailyReadinessRecordModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.date, '2024-06-15');
      expect(restored.rhr?.todayRhr, 52.0);
      expect(restored.sleep?.totalDurationMinutes, 420.0);
      expect(restored.load?.atl, 45.0);
      expect(restored.subjective?.exhaustionLevel, 3);
      expect(restored.componentScores.length, 2);
      expect(restored.componentScores[0].component, 'hrr');
      expect(restored.compositeScore, 77.5);
      expect(restored.state, 'good');
      expect(restored.confidence, 'full');
      expect(restored.reasons, ['RHR below baseline', 'Good sleep']);
      expect(restored.readinessOverride?.state, 'none');
      expect(restored.computedAt, '2024-06-15T08:00:00.000');
      expect(restored.maxHr, 190);
      expect(restored.restingHr, 55);
    });

    test('handles null optional fields', () {
      final model = DailyReadinessRecordModel(
        date: '2024-06-15',
        componentScores: [],
        compositeScore: 0,
        state: 'unavailable',
        confidence: 'unavailable',
        reasons: [],
      );
      final json = model.toJson();
      final restored = DailyReadinessRecordModel.fromJson(
        Map<String, dynamic>.from(json),
      );

      expect(restored.rhr, isNull);
      expect(restored.sleep, isNull);
      expect(restored.load, isNull);
      expect(restored.subjective, isNull);
      expect(restored.readinessOverride, isNull);
      expect(restored.computedAt, isNull);
      expect(restored.syncedAt, isNull);
      expect(restored.maxHr, isNull);
      expect(restored.restingHr, isNull);
    });

    test('fromJson handles string-encoded nested JSON', () {
      final json = {
        'date': '2024-06-15',
        'rhr': '{"todayRhr":52.0,"baselineRhr":55.0}',
        'componentScores':
            '[{"component":"hrr","score":85.0,"isAvailable":true}]',
        'reasons': '["RHR below baseline"]',
        'readinessOverride':
            '{"state":"none","overriddenAt":"2024-06-15T09:00:00.000"}',
        'compositeScore': 77.5,
        'state': 'good',
        'confidence': 'full',
      };
      final restored = DailyReadinessRecordModel.fromJson(json);

      expect(restored.rhr?.todayRhr, 52.0);
      expect(restored.componentScores.length, 1);
      expect(restored.reasons, ['RHR below baseline']);
      expect(restored.readinessOverride?.state, 'none');
    });
  });

  group('ReadinessBaselineModel', () {
    test('round-trip serialization', () {
      const model = ReadinessBaselineModel(
        rhrMedian30Day: 54.0,
        sleepAverage28Day: 410.0,
        lastUpdated: '2024-06-15T08:00:00.000',
      );
      final json = jsonEncode(model.toJson());
      final restored = ReadinessBaselineModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.rhrMedian30Day, 54.0);
      expect(restored.sleepAverage28Day, 410.0);
      expect(restored.lastUpdated, '2024-06-15T08:00:00.000');
    });

    test('fromJson handles invalid date gracefully', () {
      final json = {
        'rhrMedian30Day': 54.0,
        'sleepAverage28Day': 410.0,
        'lastUpdated': 'not-a-date',
      };
      final restored = ReadinessBaselineModel.fromJson(json);

      expect(restored.lastUpdated, '');
      expect(restored.rhrMedian30Day, 54.0);
    });
  });

  group('AdaptedWorkoutModel', () {
    test('round-trip serialization', () {
      const model = AdaptedWorkoutModel(
        id: 'aw-1',
        originalWorkoutId: 'w-1',
        date: '2024-06-15',
        originalType: 'tempo',
        adaptedType: 'easy',
        adaptationType: 'swapToEasy',
        originalTargetDistance: 10.0,
        adaptedTargetDistance: 6.0,
        originalTargetDuration: 50,
        adaptedTargetDuration: 35,
        originalTargetPace: 300.0,
        adaptedTargetPace: 360.0,
        reason: 'Reduced readiness score',
        readinessScore: 35.0,
        readinessState: 'reduced',
        isAccepted: true,
        createdAt: '2024-06-15T08:00:00.000',
      );
      final json = jsonEncode(model.toJson());
      final restored = AdaptedWorkoutModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.id, 'aw-1');
      expect(restored.originalWorkoutId, 'w-1');
      expect(restored.adaptationType, 'swapToEasy');
      expect(restored.adaptedTargetDistance, 6.0);
      expect(restored.isAccepted, true);
    });
  });

  group('WeeklyReconciliationRecordModel', () {
    test('round-trip serialization', () {
      const model = WeeklyReconciliationRecordModel(
        weekStartDate: '2024-06-10',
        plannedLoad: 350.0,
        actualLoad: 280.0,
        adaptedLoad: 300.0,
        deficitPercent: 20.0,
        surplusPercent: 0.0,
        adjustmentDescription: 'Reduced due to fatigue',
        isApplied: false,
        raceWeeksRemaining: 4,
        requiresReview: true,
        createdAt: '2024-06-16T08:00:00.000',
      );
      final json = jsonEncode(model.toJson());
      final restored = WeeklyReconciliationRecordModel.fromJson(
        jsonDecode(json) as Map<String, dynamic>,
      );

      expect(restored.weekStartDate, '2024-06-10');
      expect(restored.plannedLoad, 350.0);
      expect(restored.actualLoad, 280.0);
      expect(restored.deficitPercent, 20.0);
      expect(restored.adjustmentDescription, 'Reduced due to fatigue');
      expect(restored.raceWeeksRemaining, 4);
      expect(restored.requiresReview, true);
    });

    test('fromJson handles invalid date gracefully', () {
      final json = {
        'weekStartDate': '2024-06-10',
        'plannedLoad': 350.0,
        'createdAt': 'not-a-date',
      };
      final restored = WeeklyReconciliationRecordModel.fromJson(json);

      expect(restored.createdAt, '');
      expect(restored.plannedLoad, 350.0);
    });
  });
}
