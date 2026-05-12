import 'package:runflow_flutter/data/models/readiness/readiness_models.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart'
    as domain;

extension RhrMetricsModelMapper on RhrMetricsModel {
  domain.RhrMetrics toDomain() => domain.RhrMetrics(
        todayRhr: todayRhr,
        baselineRhr: baselineRhr,
        rhrDelta: rhrDelta,
        trendDirection: trendDirection,
      );
}

extension DomainRhrMetricsMapper on domain.RhrMetrics {
  RhrMetricsModel toData() => RhrMetricsModel(
        todayRhr: todayRhr,
        baselineRhr: baselineRhr,
        rhrDelta: rhrDelta,
        trendDirection: trendDirection,
      );
}

extension SleepMetricsModelMapper on SleepMetricsModel {
  domain.SleepMetrics toDomain() => domain.SleepMetrics(
        totalDurationMinutes: totalDurationMinutes,
        deepMinutes: deepMinutes,
        remMinutes: remMinutes,
        lightMinutes: lightMinutes,
        deepPercent: deepPercent,
        remPercent: remPercent,
        sleepEfficiency: sleepEfficiency,
      );
}

extension DomainSleepMetricsMapper on domain.SleepMetrics {
  SleepMetricsModel toData() => SleepMetricsModel(
        totalDurationMinutes: totalDurationMinutes,
        deepMinutes: deepMinutes,
        remMinutes: remMinutes,
        lightMinutes: lightMinutes,
        deepPercent: deepPercent,
        remPercent: remPercent,
        sleepEfficiency: sleepEfficiency,
      );
}

extension LoadMetricsModelMapper on LoadMetricsModel {
  domain.LoadMetrics toDomain() => domain.LoadMetrics(
        todayTrimp: todayTrimp,
        atl: atl,
        ctl: ctl,
        tsb: tsb,
        workloadRatio: workloadRatio,
        trimpStrategy: _trimpStrategyFromString(trimpStrategy),
        sevenDayTrimpTotal: sevenDayTrimpTotal,
      );
}

extension DomainLoadMetricsMapper on domain.LoadMetrics {
  LoadMetricsModel toData() => LoadMetricsModel(
        todayTrimp: todayTrimp,
        atl: atl,
        ctl: ctl,
        tsb: tsb,
        workloadRatio: workloadRatio,
        trimpStrategy: trimpStrategy.name,
        sevenDayTrimpTotal: sevenDayTrimpTotal,
      );
}

extension SubjectiveInputModelMapper on SubjectiveInputModel {
  domain.SubjectiveInput toDomain() => domain.SubjectiveInput(
        exhaustionLevel: exhaustionLevel,
        muscleSoreness: muscleSoreness,
        stressLevel: stressLevel,
        note: note,
        enteredAt: enteredAt != null ? DateTime.tryParse(enteredAt!) : null,
      );
}

extension DomainSubjectiveInputMapper on domain.SubjectiveInput {
  SubjectiveInputModel toData() => SubjectiveInputModel(
        exhaustionLevel: exhaustionLevel,
        muscleSoreness: muscleSoreness,
        stressLevel: stressLevel,
        note: note,
        enteredAt: enteredAt?.toIso8601String(),
      );
}

extension ComponentScoreModelMapper on ComponentScoreModel {
  domain.ComponentScore toDomain() => domain.ComponentScore(
        component: _readinessComponentFromString(component),
        score: score,
        isAvailable: isAvailable,
        reason: reason,
      );
}

extension DomainComponentScoreMapper on domain.ComponentScore {
  ComponentScoreModel toData() => ComponentScoreModel(
        component: component.name,
        score: score,
        isAvailable: isAvailable,
        reason: reason,
      );
}

extension ReadinessOverrideModelMapper on ReadinessOverrideModel {
  domain.ReadinessOverride toDomain() => domain.ReadinessOverride(
        state: _overrideStateFromString(state),
        note: note,
        overriddenAt: DateTime.tryParse(overriddenAt ?? '') ?? DateTime.now(),
      );
}

extension DomainReadinessOverrideMapper on domain.ReadinessOverride {
  ReadinessOverrideModel toData() => ReadinessOverrideModel(
        state: state.name,
        note: note,
        overriddenAt: overriddenAt.toIso8601String(),
      );
}

extension DailyReadinessRecordModelMapper on DailyReadinessRecordModel {
  domain.DailyReadinessRecord toDomain() => domain.DailyReadinessRecord(
        date: DateTime.tryParse(date) ?? DateTime.now(),
        rhr: rhr?.toDomain(),
        sleep: sleep?.toDomain(),
        load: load?.toDomain(),
        subjective: subjective?.toDomain(),
        componentScores: componentScores.map((c) => c.toDomain()).toList(),
        compositeScore: compositeScore,
        state: _readinessStateFromString(state),
        confidence: _dataConfidenceFromString(confidence),
        reasons: reasons,
        readinessOverride: readinessOverride?.toDomain(),
        computedAt: computedAt != null ? DateTime.tryParse(computedAt!) : null,
        syncedAt: syncedAt != null ? DateTime.tryParse(syncedAt!) : null,
        maxHr: maxHr,
        restingHr: restingHr,
      );
}

extension DomainDailyReadinessRecordMapper on domain.DailyReadinessRecord {
  DailyReadinessRecordModel toData() => DailyReadinessRecordModel(
        date: _dateToString(date),
        rhr: rhr?.toData(),
        sleep: sleep?.toData(),
        load: load?.toData(),
        subjective: subjective?.toData(),
        componentScores: componentScores.map((c) => c.toData()).toList(),
        compositeScore: compositeScore,
        state: state.name,
        confidence: confidence.name,
        reasons: reasons,
        readinessOverride: readinessOverride?.toData(),
        computedAt: computedAt?.toIso8601String(),
        syncedAt: syncedAt?.toIso8601String(),
        maxHr: maxHr,
        restingHr: restingHr,
      );
}

extension ReadinessBaselineModelMapper on ReadinessBaselineModel {
  domain.ReadinessBaseline toDomain() => domain.ReadinessBaseline(
        rhrMedian30Day: rhrMedian30Day,
        sleepAverage28Day: sleepAverage28Day,
        lastUpdated: DateTime.tryParse(lastUpdated) ?? DateTime.now(),
      );
}

extension DomainReadinessBaselineMapper on domain.ReadinessBaseline {
  ReadinessBaselineModel toData() => ReadinessBaselineModel(
        rhrMedian30Day: rhrMedian30Day,
        sleepAverage28Day: sleepAverage28Day,
        lastUpdated: lastUpdated.toIso8601String(),
      );
}

extension AdaptedWorkoutModelMapper on AdaptedWorkoutModel {
  domain.AdaptedWorkout toDomain() => domain.AdaptedWorkout(
        id: id,
        originalWorkoutId: originalWorkoutId,
        date: DateTime.tryParse(date) ?? DateTime.now(),
        originalType: originalType,
        adaptedType: adaptedType,
        adaptationType: _adaptationTypeFromString(adaptationType),
        originalTargetDistance: originalTargetDistance,
        adaptedTargetDistance: adaptedTargetDistance,
        originalTargetDuration: originalTargetDuration,
        adaptedTargetDuration: adaptedTargetDuration,
        originalTargetPace: originalTargetPace,
        adaptedTargetPace: adaptedTargetPace,
        reason: reason,
        readinessScore: readinessScore,
        readinessState: _readinessStateFromString(readinessState),
        isAccepted: isAccepted,
        createdAt: DateTime.tryParse(createdAt) ?? DateTime.now(),
        syncedAt: syncedAt != null ? DateTime.tryParse(syncedAt!) : null,
      );
}

extension DomainAdaptedWorkoutMapper on domain.AdaptedWorkout {
  AdaptedWorkoutModel toData() => AdaptedWorkoutModel(
        id: id,
        originalWorkoutId: originalWorkoutId,
        date: _dateToString(date),
        originalType: originalType,
        adaptedType: adaptedType,
        adaptationType: adaptationType.name,
        originalTargetDistance: originalTargetDistance,
        adaptedTargetDistance: adaptedTargetDistance,
        originalTargetDuration: originalTargetDuration,
        adaptedTargetDuration: adaptedTargetDuration,
        originalTargetPace: originalTargetPace,
        adaptedTargetPace: adaptedTargetPace,
        reason: reason,
        readinessScore: readinessScore,
        readinessState: readinessState.name,
        isAccepted: isAccepted,
        createdAt: createdAt.toIso8601String(),
        syncedAt: syncedAt?.toIso8601String(),
      );
}

extension WeeklyReconciliationRecordModelMapper
    on WeeklyReconciliationRecordModel {
  domain.WeeklyReconciliationRecord toDomain() =>
      domain.WeeklyReconciliationRecord(
        weekStartDate: DateTime.tryParse(weekStartDate) ?? DateTime.now(),
        plannedLoad: plannedLoad,
        actualLoad: actualLoad,
        adaptedLoad: adaptedLoad,
        deficitPercent: deficitPercent,
        surplusPercent: surplusPercent,
        adjustmentDescription: adjustmentDescription,
        isApplied: isApplied,
        raceWeeksRemaining: raceWeeksRemaining,
        requiresReview: requiresReview,
        createdAt: DateTime.tryParse(createdAt) ?? DateTime.now(),
        syncedAt: syncedAt != null ? DateTime.tryParse(syncedAt!) : null,
      );
}

extension DomainWeeklyReconciliationRecordMapper
    on domain.WeeklyReconciliationRecord {
  WeeklyReconciliationRecordModel toData() => WeeklyReconciliationRecordModel(
        weekStartDate: _dateToString(weekStartDate),
        plannedLoad: plannedLoad,
        actualLoad: actualLoad,
        adaptedLoad: adaptedLoad,
        deficitPercent: deficitPercent,
        surplusPercent: surplusPercent,
        adjustmentDescription: adjustmentDescription,
        isApplied: isApplied,
        raceWeeksRemaining: raceWeeksRemaining,
        requiresReview: requiresReview,
        createdAt: createdAt.toIso8601String(),
        syncedAt: syncedAt?.toIso8601String(),
      );
}

String _dateToString(DateTime dt) {
  final y = dt.year.toString().padLeft(4, '0');
  final m = dt.month.toString().padLeft(2, '0');
  final d = dt.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

domain.ReadinessState _readinessStateFromString(String? value) {
  switch (value) {
    case 'excellent':
      return domain.ReadinessState.excellent;
    case 'good':
      return domain.ReadinessState.good;
    case 'moderate':
      return domain.ReadinessState.moderate;
    case 'reduced':
      return domain.ReadinessState.reduced;
    case 'rest':
      return domain.ReadinessState.rest;
    default:
      return domain.ReadinessState.unavailable;
  }
}

domain.DataConfidence _dataConfidenceFromString(String? value) {
  switch (value) {
    case 'full':
      return domain.DataConfidence.full;
    case 'partial':
      return domain.DataConfidence.partial;
    case 'estimated':
      return domain.DataConfidence.estimated;
    default:
      return domain.DataConfidence.unavailable;
  }
}

domain.AdaptationType _adaptationTypeFromString(String? value) {
  switch (value) {
    case 'volumeReduction':
      return domain.AdaptationType.volumeReduction;
    case 'intensityReduction':
      return domain.AdaptationType.intensityReduction;
    case 'swapToEasy':
      return domain.AdaptationType.swapToEasy;
    case 'restOrReschedule':
      return domain.AdaptationType.restOrReschedule;
    case 'userOverrideHarder':
      return domain.AdaptationType.userOverrideHarder;
    case 'userOverrideEasier':
      return domain.AdaptationType.userOverrideEasier;
    default:
      return domain.AdaptationType.none;
  }
}

domain.TrimpStrategy _trimpStrategyFromString(String? value) {
  switch (value) {
    case 'heartRateReserve':
      return domain.TrimpStrategy.heartRateReserve;
    case 'sessionTypeFallback':
      return domain.TrimpStrategy.sessionTypeFallback;
    default:
      return domain.TrimpStrategy.unavailable;
  }
}

domain.ReadinessComponent _readinessComponentFromString(String? value) {
  switch (value) {
    case 'hrr':
      return domain.ReadinessComponent.hrr;
    case 'sleep':
      return domain.ReadinessComponent.sleep;
    case 'load':
      return domain.ReadinessComponent.load;
    case 'subjective':
      return domain.ReadinessComponent.subjective;
    default:
      return domain.ReadinessComponent.hrr;
  }
}

domain.OverrideState _overrideStateFromString(String? value) {
  switch (value) {
    case 'harder':
      return domain.OverrideState.harder;
    case 'easier':
      return domain.OverrideState.easier;
    case 'rest':
      return domain.OverrideState.rest;
    default:
      return domain.OverrideState.none;
  }
}
