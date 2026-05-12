import 'package:flutter/foundation.dart';

enum ReadinessState {
  excellent,
  good,
  moderate,
  reduced,
  rest,
  unavailable,
}

enum DataConfidence {
  full,
  partial,
  estimated,
  unavailable,
}

enum AdaptationType {
  none,
  volumeReduction,
  intensityReduction,
  swapToEasy,
  restOrReschedule,
  userOverrideHarder,
  userOverrideEasier,
}

enum TrimpStrategy {
  heartRateReserve,
  sessionTypeFallback,
  unavailable,
}

enum ReadinessComponent {
  hrr,
  sleep,
  load,
  subjective,
}

enum OverrideState {
  none,
  harder,
  easier,
  rest,
}

class ReadinessScoringConfig {
  const ReadinessScoringConfig({
    this.hrrWeight = 0.35,
    this.sleepWeight = 0.30,
    this.loadWeight = 0.25,
    this.subjectiveWeight = 0.10,
    this.excellentThreshold = 80.0,
    this.goodThreshold = 65.0,
    this.moderateThreshold = 50.0,
    this.reducedThreshold = 35.0,
  });

  final double hrrWeight;
  final double sleepWeight;
  final double loadWeight;
  final double subjectiveWeight;
  final double excellentThreshold;
  final double goodThreshold;
  final double moderateThreshold;
  final double reducedThreshold;

  ReadinessScoringConfig copyWith({
    double? hrrWeight,
    double? sleepWeight,
    double? loadWeight,
    double? subjectiveWeight,
    double? excellentThreshold,
    double? goodThreshold,
    double? moderateThreshold,
    double? reducedThreshold,
  }) {
    return ReadinessScoringConfig(
      hrrWeight: hrrWeight ?? this.hrrWeight,
      sleepWeight: sleepWeight ?? this.sleepWeight,
      loadWeight: loadWeight ?? this.loadWeight,
      subjectiveWeight: subjectiveWeight ?? this.subjectiveWeight,
      excellentThreshold: excellentThreshold ?? this.excellentThreshold,
      goodThreshold: goodThreshold ?? this.goodThreshold,
      moderateThreshold: moderateThreshold ?? this.moderateThreshold,
      reducedThreshold: reducedThreshold ?? this.reducedThreshold,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessScoringConfig &&
          runtimeType == other.runtimeType &&
          hrrWeight == other.hrrWeight &&
          sleepWeight == other.sleepWeight &&
          loadWeight == other.loadWeight &&
          subjectiveWeight == other.subjectiveWeight &&
          excellentThreshold == other.excellentThreshold &&
          goodThreshold == other.goodThreshold &&
          moderateThreshold == other.moderateThreshold &&
          reducedThreshold == other.reducedThreshold;

  @override
  int get hashCode => Object.hash(
        hrrWeight,
        sleepWeight,
        loadWeight,
        subjectiveWeight,
        excellentThreshold,
        goodThreshold,
        moderateThreshold,
        reducedThreshold,
      );
}

class TrimpConfig {
  const TrimpConfig({
    this.atlDecayDays = 7,
    this.ctlDecayDays = 42,
    this.sessionTypeMultipliers = const {
      'easy': 1.0,
      'long': 1.3,
      'tempo': 1.5,
      'interval': 1.8,
      'recovery': 0.8,
      'race': 2.0,
      'other': 1.0,
    },
  });

  final int atlDecayDays;
  final int ctlDecayDays;
  final Map<String, double> sessionTypeMultipliers;

  TrimpConfig copyWith({
    int? atlDecayDays,
    int? ctlDecayDays,
    Map<String, double>? sessionTypeMultipliers,
  }) {
    return TrimpConfig(
      atlDecayDays: atlDecayDays ?? this.atlDecayDays,
      ctlDecayDays: ctlDecayDays ?? this.ctlDecayDays,
      sessionTypeMultipliers:
          sessionTypeMultipliers ?? this.sessionTypeMultipliers,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TrimpConfig &&
          runtimeType == other.runtimeType &&
          atlDecayDays == other.atlDecayDays &&
          ctlDecayDays == other.ctlDecayDays &&
          mapEquals(sessionTypeMultipliers, other.sessionTypeMultipliers);

  @override
  int get hashCode => Object.hash(
        atlDecayDays,
        ctlDecayDays,
        Object.hashAll(sessionTypeMultipliers.entries),
      );
}

class ComponentScore {
  const ComponentScore({
    required this.component,
    required this.score,
    required this.isAvailable,
    this.reason,
  });

  final ReadinessComponent component;
  final double score;
  final bool isAvailable;
  final String? reason;

  ComponentScore copyWith({
    ReadinessComponent? component,
    double? score,
    bool? isAvailable,
    String? reason,
  }) {
    return ComponentScore(
      component: component ?? this.component,
      score: score ?? this.score,
      isAvailable: isAvailable ?? this.isAvailable,
      reason: reason ?? this.reason,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ComponentScore &&
          runtimeType == other.runtimeType &&
          component == other.component &&
          score == other.score &&
          isAvailable == other.isAvailable &&
          reason == other.reason;

  @override
  int get hashCode => Object.hash(
        component,
        score,
        isAvailable,
        reason,
      );
}

class RhrMetrics {
  const RhrMetrics({
    this.todayRhr,
    this.baselineRhr,
    this.rhrDelta,
    this.trendDirection,
  });

  final double? todayRhr;
  final double? baselineRhr;
  final double? rhrDelta;
  final int? trendDirection;

  RhrMetrics copyWith({
    double? todayRhr,
    double? baselineRhr,
    double? rhrDelta,
    int? trendDirection,
  }) {
    return RhrMetrics(
      todayRhr: todayRhr ?? this.todayRhr,
      baselineRhr: baselineRhr ?? this.baselineRhr,
      rhrDelta: rhrDelta ?? this.rhrDelta,
      trendDirection: trendDirection ?? this.trendDirection,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RhrMetrics &&
          runtimeType == other.runtimeType &&
          todayRhr == other.todayRhr &&
          baselineRhr == other.baselineRhr &&
          rhrDelta == other.rhrDelta &&
          trendDirection == other.trendDirection;

  @override
  int get hashCode => Object.hash(
        todayRhr,
        baselineRhr,
        rhrDelta,
        trendDirection,
      );
}

class SleepMetrics {
  const SleepMetrics({
    this.totalDurationMinutes,
    this.deepMinutes,
    this.remMinutes,
    this.lightMinutes,
    this.deepPercent,
    this.remPercent,
    this.sleepEfficiency,
  });

  final double? totalDurationMinutes;
  final double? deepMinutes;
  final double? remMinutes;
  final double? lightMinutes;
  final double? deepPercent;
  final double? remPercent;
  final double? sleepEfficiency;

  SleepMetrics copyWith({
    double? totalDurationMinutes,
    double? deepMinutes,
    double? remMinutes,
    double? lightMinutes,
    double? deepPercent,
    double? remPercent,
    double? sleepEfficiency,
  }) {
    return SleepMetrics(
      totalDurationMinutes:
          totalDurationMinutes ?? this.totalDurationMinutes,
      deepMinutes: deepMinutes ?? this.deepMinutes,
      remMinutes: remMinutes ?? this.remMinutes,
      lightMinutes: lightMinutes ?? this.lightMinutes,
      deepPercent: deepPercent ?? this.deepPercent,
      remPercent: remPercent ?? this.remPercent,
      sleepEfficiency: sleepEfficiency ?? this.sleepEfficiency,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SleepMetrics &&
          runtimeType == other.runtimeType &&
          totalDurationMinutes == other.totalDurationMinutes &&
          deepMinutes == other.deepMinutes &&
          remMinutes == other.remMinutes &&
          lightMinutes == other.lightMinutes &&
          deepPercent == other.deepPercent &&
          remPercent == other.remPercent &&
          sleepEfficiency == other.sleepEfficiency;

  @override
  int get hashCode => Object.hash(
        totalDurationMinutes,
        deepMinutes,
        remMinutes,
        lightMinutes,
        deepPercent,
        remPercent,
        sleepEfficiency,
      );
}

class LoadMetrics {
  const LoadMetrics({
    this.todayTrimp,
    this.atl,
    this.ctl,
    this.tsb,
    this.workloadRatio,
    this.trimpStrategy = TrimpStrategy.unavailable,
    this.sevenDayTrimpTotal,
  });

  final double? todayTrimp;
  final double? atl;
  final double? ctl;
  final double? tsb;
  final double? workloadRatio;
  final TrimpStrategy trimpStrategy;
  final double? sevenDayTrimpTotal;

  LoadMetrics copyWith({
    double? todayTrimp,
    double? atl,
    double? ctl,
    double? tsb,
    double? workloadRatio,
    TrimpStrategy? trimpStrategy,
    double? sevenDayTrimpTotal,
  }) {
    return LoadMetrics(
      todayTrimp: todayTrimp ?? this.todayTrimp,
      atl: atl ?? this.atl,
      ctl: ctl ?? this.ctl,
      tsb: tsb ?? this.tsb,
      workloadRatio: workloadRatio ?? this.workloadRatio,
      trimpStrategy: trimpStrategy ?? this.trimpStrategy,
      sevenDayTrimpTotal: sevenDayTrimpTotal ?? this.sevenDayTrimpTotal,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoadMetrics &&
          runtimeType == other.runtimeType &&
          todayTrimp == other.todayTrimp &&
          atl == other.atl &&
          ctl == other.ctl &&
          tsb == other.tsb &&
          workloadRatio == other.workloadRatio &&
          trimpStrategy == other.trimpStrategy &&
          sevenDayTrimpTotal == other.sevenDayTrimpTotal;

  @override
  int get hashCode => Object.hash(
        todayTrimp,
        atl,
        ctl,
        tsb,
        workloadRatio,
        trimpStrategy,
        sevenDayTrimpTotal,
      );
}

class SubjectiveInput {
  const SubjectiveInput({
    this.exhaustionLevel,
    this.muscleSoreness,
    this.stressLevel,
    this.note,
    this.enteredAt,
  });

  final int? exhaustionLevel;
  final int? muscleSoreness;
  final int? stressLevel;
  final String? note;
  final DateTime? enteredAt;

  SubjectiveInput copyWith({
    int? exhaustionLevel,
    int? muscleSoreness,
    int? stressLevel,
    String? note,
    DateTime? enteredAt,
  }) {
    return SubjectiveInput(
      exhaustionLevel: exhaustionLevel ?? this.exhaustionLevel,
      muscleSoreness: muscleSoreness ?? this.muscleSoreness,
      stressLevel: stressLevel ?? this.stressLevel,
      note: note ?? this.note,
      enteredAt: enteredAt ?? this.enteredAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubjectiveInput &&
          runtimeType == other.runtimeType &&
          exhaustionLevel == other.exhaustionLevel &&
          muscleSoreness == other.muscleSoreness &&
          stressLevel == other.stressLevel &&
          note == other.note &&
          enteredAt == other.enteredAt;

  @override
  int get hashCode => Object.hash(
        exhaustionLevel,
        muscleSoreness,
        stressLevel,
        note,
        enteredAt,
      );
}

class ReadinessInputs {
  const ReadinessInputs({
    required this.date,
    this.rhr,
    this.sleep,
    this.load,
    this.subjective,
    this.maxHr,
    this.restingHr,
  });

  final DateTime date;
  final RhrMetrics? rhr;
  final SleepMetrics? sleep;
  final LoadMetrics? load;
  final SubjectiveInput? subjective;
  final int? maxHr;
  final int? restingHr;

  ReadinessInputs copyWith({
    DateTime? date,
    RhrMetrics? rhr,
    SleepMetrics? sleep,
    LoadMetrics? load,
    SubjectiveInput? subjective,
    int? maxHr,
    int? restingHr,
  }) {
    return ReadinessInputs(
      date: date ?? this.date,
      rhr: rhr ?? this.rhr,
      sleep: sleep ?? this.sleep,
      load: load ?? this.load,
      subjective: subjective ?? this.subjective,
      maxHr: maxHr ?? this.maxHr,
      restingHr: restingHr ?? this.restingHr,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessInputs &&
          runtimeType == other.runtimeType &&
          date == other.date &&
          rhr == other.rhr &&
          sleep == other.sleep &&
          load == other.load &&
          subjective == other.subjective &&
          maxHr == other.maxHr &&
          restingHr == other.restingHr;

  @override
  int get hashCode => Object.hash(
        date,
        rhr,
        sleep,
        load,
        subjective,
        maxHr,
        restingHr,
      );
}

class ReadinessResult {
  const ReadinessResult({
    required this.compositeScore,
    required this.state,
    required this.confidence,
    required this.componentScores,
    required this.reasons,
    required this.adaptationType,
    this.adaptationDescription,
    this.recommendation,
  });

  final double compositeScore;
  final ReadinessState state;
  final DataConfidence confidence;
  final List<ComponentScore> componentScores;
  final List<String> reasons;
  final AdaptationType adaptationType;
  final String? adaptationDescription;
  final String? recommendation;

  ReadinessResult copyWith({
    double? compositeScore,
    ReadinessState? state,
    DataConfidence? confidence,
    List<ComponentScore>? componentScores,
    List<String>? reasons,
    AdaptationType? adaptationType,
    String? adaptationDescription,
    String? recommendation,
  }) {
    return ReadinessResult(
      compositeScore: compositeScore ?? this.compositeScore,
      state: state ?? this.state,
      confidence: confidence ?? this.confidence,
      componentScores: componentScores ?? this.componentScores,
      reasons: reasons ?? this.reasons,
      adaptationType: adaptationType ?? this.adaptationType,
      adaptationDescription:
          adaptationDescription ?? this.adaptationDescription,
      recommendation: recommendation ?? this.recommendation,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessResult &&
          runtimeType == other.runtimeType &&
          compositeScore == other.compositeScore &&
          state == other.state &&
          confidence == other.confidence &&
          listEquals(componentScores, other.componentScores) &&
          listEquals(reasons, other.reasons) &&
          adaptationType == other.adaptationType &&
          adaptationDescription == other.adaptationDescription &&
          recommendation == other.recommendation;

  @override
  int get hashCode => Object.hash(
        compositeScore,
        state,
        confidence,
        Object.hashAll(componentScores),
        Object.hashAll(reasons),
        adaptationType,
        adaptationDescription,
        recommendation,
      );
}

class ReadinessOverride {
  const ReadinessOverride({
    required this.state,
    this.note,
    required this.overriddenAt,
  });

  final OverrideState state;
  final String? note;
  final DateTime overriddenAt;

  ReadinessOverride copyWith({
    OverrideState? state,
    String? note,
    DateTime? overriddenAt,
  }) {
    return ReadinessOverride(
      state: state ?? this.state,
      note: note ?? this.note,
      overriddenAt: overriddenAt ?? this.overriddenAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessOverride &&
          runtimeType == other.runtimeType &&
          state == other.state &&
          note == other.note &&
          overriddenAt == other.overriddenAt;

  @override
  int get hashCode => Object.hash(
        state,
        note,
        overriddenAt,
      );
}

class DailyReadinessRecord {
  const DailyReadinessRecord({
    required this.date,
    this.rhr,
    this.sleep,
    this.load,
    this.subjective,
    required this.componentScores,
    required this.compositeScore,
    required this.state,
    required this.confidence,
    required this.reasons,
    this.result,
    this.readinessOverride,
    this.computedAt,
    this.syncedAt,
    this.maxHr,
    this.restingHr,
  });

  final DateTime date;
  final RhrMetrics? rhr;
  final SleepMetrics? sleep;
  final LoadMetrics? load;
  final SubjectiveInput? subjective;
  final List<ComponentScore> componentScores;
  final double compositeScore;
  final ReadinessState state;
  final DataConfidence confidence;
  final List<String> reasons;
  final ReadinessResult? result;
  final ReadinessOverride? readinessOverride;
  final DateTime? computedAt;
  final DateTime? syncedAt;
  final int? maxHr;
  final int? restingHr;

  DailyReadinessRecord copyWith({
    DateTime? date,
    RhrMetrics? rhr,
    SleepMetrics? sleep,
    LoadMetrics? load,
    SubjectiveInput? subjective,
    List<ComponentScore>? componentScores,
    double? compositeScore,
    ReadinessState? state,
    DataConfidence? confidence,
    List<String>? reasons,
    ReadinessResult? result,
    ReadinessOverride? readinessOverride,
    DateTime? computedAt,
    DateTime? syncedAt,
    int? maxHr,
    int? restingHr,
  }) {
    return DailyReadinessRecord(
      date: date ?? this.date,
      rhr: rhr ?? this.rhr,
      sleep: sleep ?? this.sleep,
      load: load ?? this.load,
      subjective: subjective ?? this.subjective,
      componentScores: componentScores ?? this.componentScores,
      compositeScore: compositeScore ?? this.compositeScore,
      state: state ?? this.state,
      confidence: confidence ?? this.confidence,
      reasons: reasons ?? this.reasons,
      result: result ?? this.result,
      readinessOverride: readinessOverride ?? this.readinessOverride,
      computedAt: computedAt ?? this.computedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      maxHr: maxHr ?? this.maxHr,
      restingHr: restingHr ?? this.restingHr,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DailyReadinessRecord &&
          runtimeType == other.runtimeType &&
          date == other.date &&
          rhr == other.rhr &&
          sleep == other.sleep &&
          load == other.load &&
          subjective == other.subjective &&
          listEquals(componentScores, other.componentScores) &&
          compositeScore == other.compositeScore &&
          state == other.state &&
          confidence == other.confidence &&
          listEquals(reasons, other.reasons) &&
          result == other.result &&
          readinessOverride == other.readinessOverride &&
          computedAt == other.computedAt &&
          syncedAt == other.syncedAt &&
          maxHr == other.maxHr &&
          restingHr == other.restingHr;

  @override
  int get hashCode => Object.hashAll([
        date,
        rhr,
        sleep,
        load,
        subjective,
        Object.hashAll(componentScores),
        compositeScore,
        state,
        confidence,
        Object.hashAll(reasons),
        result,
        readinessOverride,
        computedAt,
        syncedAt,
        maxHr,
        restingHr,
      ]);
}

class ReadinessBaseline {
  const ReadinessBaseline({
    this.rhrMedian30Day,
    this.sleepAverage28Day,
    required this.lastUpdated,
  });

  final double? rhrMedian30Day;
  final double? sleepAverage28Day;
  final DateTime lastUpdated;

  ReadinessBaseline copyWith({
    double? rhrMedian30Day,
    double? sleepAverage28Day,
    DateTime? lastUpdated,
  }) {
    return ReadinessBaseline(
      rhrMedian30Day: rhrMedian30Day ?? this.rhrMedian30Day,
      sleepAverage28Day: sleepAverage28Day ?? this.sleepAverage28Day,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessBaseline &&
          runtimeType == other.runtimeType &&
          rhrMedian30Day == other.rhrMedian30Day &&
          sleepAverage28Day == other.sleepAverage28Day &&
          lastUpdated == other.lastUpdated;

  @override
  int get hashCode => Object.hash(
        rhrMedian30Day,
        sleepAverage28Day,
        lastUpdated,
      );
}

class AdaptedWorkout {
  const AdaptedWorkout({
    required this.id,
    required this.originalWorkoutId,
    required this.date,
    required this.originalType,
    required this.adaptedType,
    required this.adaptationType,
    required this.originalTargetDistance,
    this.adaptedTargetDistance,
    required this.originalTargetDuration,
    this.adaptedTargetDuration,
    required this.originalTargetPace,
    this.adaptedTargetPace,
    required this.reason,
    required this.readinessScore,
    required this.readinessState,
    required this.isAccepted,
    required this.createdAt,
    this.syncedAt,
  });

  final String id;
  final String originalWorkoutId;
  final DateTime date;
  final String originalType;
  final String adaptedType;
  final AdaptationType adaptationType;
  final double originalTargetDistance;
  final double? adaptedTargetDistance;
  final int originalTargetDuration;
  final int? adaptedTargetDuration;
  final double originalTargetPace;
  final double? adaptedTargetPace;
  final String reason;
  final double readinessScore;
  final ReadinessState readinessState;
  final bool isAccepted;
  final DateTime createdAt;
  final DateTime? syncedAt;

  AdaptedWorkout copyWith({
    String? id,
    String? originalWorkoutId,
    DateTime? date,
    String? originalType,
    String? adaptedType,
    AdaptationType? adaptationType,
    double? originalTargetDistance,
    double? adaptedTargetDistance,
    int? originalTargetDuration,
    int? adaptedTargetDuration,
    double? originalTargetPace,
    double? adaptedTargetPace,
    String? reason,
    double? readinessScore,
    ReadinessState? readinessState,
    bool? isAccepted,
    DateTime? createdAt,
    DateTime? syncedAt,
  }) {
    return AdaptedWorkout(
      id: id ?? this.id,
      originalWorkoutId: originalWorkoutId ?? this.originalWorkoutId,
      date: date ?? this.date,
      originalType: originalType ?? this.originalType,
      adaptedType: adaptedType ?? this.adaptedType,
      adaptationType: adaptationType ?? this.adaptationType,
      originalTargetDistance:
          originalTargetDistance ?? this.originalTargetDistance,
      adaptedTargetDistance: adaptedTargetDistance ?? this.adaptedTargetDistance,
      originalTargetDuration:
          originalTargetDuration ?? this.originalTargetDuration,
      adaptedTargetDuration: adaptedTargetDuration ?? this.adaptedTargetDuration,
      originalTargetPace: originalTargetPace ?? this.originalTargetPace,
      adaptedTargetPace: adaptedTargetPace ?? this.adaptedTargetPace,
      reason: reason ?? this.reason,
      readinessScore: readinessScore ?? this.readinessScore,
      readinessState: readinessState ?? this.readinessState,
      isAccepted: isAccepted ?? this.isAccepted,
      createdAt: createdAt ?? this.createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdaptedWorkout &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          originalWorkoutId == other.originalWorkoutId &&
          date == other.date &&
          originalType == other.originalType &&
          adaptedType == other.adaptedType &&
          adaptationType == other.adaptationType &&
          originalTargetDistance == other.originalTargetDistance &&
          adaptedTargetDistance == other.adaptedTargetDistance &&
          originalTargetDuration == other.originalTargetDuration &&
          adaptedTargetDuration == other.adaptedTargetDuration &&
          originalTargetPace == other.originalTargetPace &&
          adaptedTargetPace == other.adaptedTargetPace &&
          reason == other.reason &&
          readinessScore == other.readinessScore &&
          readinessState == other.readinessState &&
          isAccepted == other.isAccepted &&
          createdAt == other.createdAt &&
          syncedAt == other.syncedAt;

  @override
  int get hashCode => Object.hashAll([
        id,
        originalWorkoutId,
        date,
        originalType,
        adaptedType,
        adaptationType,
        originalTargetDistance,
        adaptedTargetDistance,
        originalTargetDuration,
        adaptedTargetDuration,
        originalTargetPace,
        adaptedTargetPace,
        reason,
        readinessScore,
        readinessState,
        isAccepted,
        createdAt,
        syncedAt,
      ]);
}

class WeeklyReconciliationRecord {
  const WeeklyReconciliationRecord({
    required this.weekStartDate,
    required this.plannedLoad,
    required this.actualLoad,
    required this.adaptedLoad,
    required this.deficitPercent,
    required this.surplusPercent,
    this.adjustmentDescription,
    required this.isApplied,
    this.raceWeeksRemaining,
    required this.requiresReview,
    required this.createdAt,
    this.syncedAt,
  });

  final DateTime weekStartDate;
  final double plannedLoad;
  final double actualLoad;
  final double adaptedLoad;
  final double deficitPercent;
  final double surplusPercent;
  final String? adjustmentDescription;
  final bool isApplied;
  final int? raceWeeksRemaining;
  final bool requiresReview;
  final DateTime createdAt;
  final DateTime? syncedAt;

  WeeklyReconciliationRecord copyWith({
    DateTime? weekStartDate,
    double? plannedLoad,
    double? actualLoad,
    double? adaptedLoad,
    double? deficitPercent,
    double? surplusPercent,
    String? adjustmentDescription,
    bool? isApplied,
    int? raceWeeksRemaining,
    bool? requiresReview,
    DateTime? createdAt,
    DateTime? syncedAt,
  }) {
    return WeeklyReconciliationRecord(
      weekStartDate: weekStartDate ?? this.weekStartDate,
      plannedLoad: plannedLoad ?? this.plannedLoad,
      actualLoad: actualLoad ?? this.actualLoad,
      adaptedLoad: adaptedLoad ?? this.adaptedLoad,
      deficitPercent: deficitPercent ?? this.deficitPercent,
      surplusPercent: surplusPercent ?? this.surplusPercent,
      adjustmentDescription:
          adjustmentDescription ?? this.adjustmentDescription,
      isApplied: isApplied ?? this.isApplied,
      raceWeeksRemaining: raceWeeksRemaining ?? this.raceWeeksRemaining,
      requiresReview: requiresReview ?? this.requiresReview,
      createdAt: createdAt ?? this.createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WeeklyReconciliationRecord &&
          runtimeType == other.runtimeType &&
          weekStartDate == other.weekStartDate &&
          plannedLoad == other.plannedLoad &&
          actualLoad == other.actualLoad &&
          adaptedLoad == other.adaptedLoad &&
          deficitPercent == other.deficitPercent &&
          surplusPercent == other.surplusPercent &&
          adjustmentDescription == other.adjustmentDescription &&
          isApplied == other.isApplied &&
          raceWeeksRemaining == other.raceWeeksRemaining &&
          requiresReview == other.requiresReview &&
          createdAt == other.createdAt &&
          syncedAt == other.syncedAt;

  @override
  int get hashCode => Object.hashAll([
        weekStartDate,
        plannedLoad,
        actualLoad,
        adaptedLoad,
        deficitPercent,
        surplusPercent,
        adjustmentDescription,
        isApplied,
        raceWeeksRemaining,
        requiresReview,
        createdAt,
        syncedAt,
      ]);
}
