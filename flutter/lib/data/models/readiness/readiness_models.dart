import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'readiness_models.freezed.dart';
part 'readiness_models.g.dart';

@Freezed(copyWith: true)
sealed class RhrMetricsModel with _$RhrMetricsModel {
  const factory RhrMetricsModel({
    double? todayRhr,
    double? baselineRhr,
    double? rhrDelta,
    int? trendDirection,
  }) = _RhrMetricsModel;
  const RhrMetricsModel._();

  factory RhrMetricsModel.fromJson(Map<String, dynamic> json) =>
      _$RhrMetricsModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class SleepMetricsModel with _$SleepMetricsModel {
  const factory SleepMetricsModel({
    double? totalDurationMinutes,
    double? deepMinutes,
    double? remMinutes,
    double? lightMinutes,
    double? deepPercent,
    double? remPercent,
    double? sleepEfficiency,
  }) = _SleepMetricsModel;
  const SleepMetricsModel._();

  factory SleepMetricsModel.fromJson(Map<String, dynamic> json) =>
      _$SleepMetricsModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class LoadMetricsModel with _$LoadMetricsModel {
  const factory LoadMetricsModel({
    double? todayTrimp,
    double? atl,
    double? ctl,
    double? tsb,
    double? workloadRatio,
    String? trimpStrategy,
    double? sevenDayTrimpTotal,
  }) = _LoadMetricsModel;
  const LoadMetricsModel._();

  factory LoadMetricsModel.fromJson(Map<String, dynamic> json) =>
      _$LoadMetricsModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class SubjectiveInputModel with _$SubjectiveInputModel {
  const factory SubjectiveInputModel({
    int? exhaustionLevel,
    int? muscleSoreness,
    int? stressLevel,
    String? note,
    String? enteredAt,
  }) = _SubjectiveInputModel;
  const SubjectiveInputModel._();

  factory SubjectiveInputModel.fromJson(Map<String, dynamic> json) =>
      _$SubjectiveInputModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class ComponentScoreModel with _$ComponentScoreModel {
  const factory ComponentScoreModel({
    required String component,
    required double score,
    required bool isAvailable,
    String? reason,
  }) = _ComponentScoreModel;
  const ComponentScoreModel._();

  factory ComponentScoreModel.fromJson(Map<String, dynamic> json) =>
      _$ComponentScoreModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class ReadinessOverrideModel with _$ReadinessOverrideModel {
  const factory ReadinessOverrideModel({
    required String state,
    String? note,
    String? overriddenAt,
  }) = _ReadinessOverrideModel;
  const ReadinessOverrideModel._();

  factory ReadinessOverrideModel.fromJson(Map<String, dynamic> json) =>
      _$ReadinessOverrideModelFromJson(json);
}

@Freezed(copyWith: true)
sealed class DailyReadinessRecordModel with _$DailyReadinessRecordModel {
  const factory DailyReadinessRecordModel({
    required String date,
    RhrMetricsModel? rhr,
    SleepMetricsModel? sleep,
    LoadMetricsModel? load,
    SubjectiveInputModel? subjective,
    @Default([]) List<ComponentScoreModel> componentScores,
    @Default(0) double compositeScore,
    @Default('unavailable') String state,
    @Default('unavailable') String confidence,
    @Default([]) List<String> reasons,
    ReadinessOverrideModel? readinessOverride,
    String? computedAt,
    String? syncedAt,
    int? maxHr,
    int? restingHr,
  }) = _DailyReadinessRecordModel;
  const DailyReadinessRecordModel._();

  factory DailyReadinessRecordModel.fromJson(Map<String, dynamic> json) {
    RhrMetricsModel? rhr;
    if (json['rhr'] != null) {
      try {
        final raw = json['rhr'];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(jsonDecode(raw.toString()) as Map);
        rhr = RhrMetricsModel.fromJson(map);
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse rhr: $e');
      }
    }

    SleepMetricsModel? sleep;
    if (json['sleep'] != null) {
      try {
        final raw = json['sleep'];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(jsonDecode(raw.toString()) as Map);
        sleep = SleepMetricsModel.fromJson(map);
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse sleep: $e');
      }
    }

    LoadMetricsModel? load;
    if (json['load'] != null) {
      try {
        final raw = json['load'];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(jsonDecode(raw.toString()) as Map);
        load = LoadMetricsModel.fromJson(map);
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse load: $e');
      }
    }

    SubjectiveInputModel? subjective;
    if (json['subjective'] != null) {
      try {
        final raw = json['subjective'];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(jsonDecode(raw.toString()) as Map);
        subjective = SubjectiveInputModel.fromJson(map);
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse subjective: $e');
      }
    }

    List<ComponentScoreModel> componentScores = [];
    if (json['componentScores'] != null) {
      try {
        final raw = json['componentScores'];
        final list = raw is String
            ? jsonDecode(raw) as List
            : raw is List
                ? raw
                : [];
        componentScores = list
            .map((e) => ComponentScoreModel.fromJson(
                Map<String, dynamic>.from(e as Map)))
            .toList();
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse componentScores: $e');
      }
    }

    List<String> reasons = [];
    if (json['reasons'] != null) {
      try {
        final raw = json['reasons'];
        final list = raw is String
            ? jsonDecode(raw) as List
            : raw is List
                ? raw
                : [];
        reasons = list.map((e) => e.toString()).toList();
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse reasons: $e');
      }
    }

    ReadinessOverrideModel? override;
    if (json['readinessOverride'] != null) {
      try {
        final raw = json['readinessOverride'];
        final map = raw is Map<String, dynamic>
            ? raw
            : Map<String, dynamic>.from(jsonDecode(raw.toString()) as Map);
        override = ReadinessOverrideModel.fromJson(map);
      } catch (e) {
        debugPrint('DailyReadinessRecordModel: Failed to parse readinessOverride: $e');
      }
    }

    return DailyReadinessRecordModel(
      date: json['date'] as String? ?? '',
      rhr: rhr,
      sleep: sleep,
      load: load,
      subjective: subjective,
      componentScores: componentScores,
      compositeScore: (json['compositeScore'] as num?)?.toDouble() ?? 0,
      state: json['state'] as String? ?? 'unavailable',
      confidence: json['confidence'] as String? ?? 'unavailable',
      reasons: reasons,
      readinessOverride: override,
      computedAt: json['computedAt'] as String?,
      syncedAt: json['syncedAt'] as String?,
      maxHr: json['maxHr'] as int?,
      restingHr: json['restingHr'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'date': date,
        'rhr': rhr?.toJson(),
        'sleep': sleep?.toJson(),
        'load': load?.toJson(),
        'subjective': subjective?.toJson(),
        'componentScores': componentScores.map((c) => c.toJson()).toList(),
        'compositeScore': compositeScore,
        'state': state,
        'confidence': confidence,
        'reasons': reasons,
        'readinessOverride': readinessOverride?.toJson(),
        'computedAt': computedAt,
        'syncedAt': syncedAt,
        'maxHr': maxHr,
        'restingHr': restingHr,
      };
}

@Freezed(copyWith: true)
sealed class ReadinessBaselineModel with _$ReadinessBaselineModel {
  const factory ReadinessBaselineModel({
    double? rhrMedian30Day,
    double? sleepAverage28Day,
    required String lastUpdated,
  }) = _ReadinessBaselineModel;
  const ReadinessBaselineModel._();

  factory ReadinessBaselineModel.fromJson(Map<String, dynamic> json) {
    String lastUpdated;
    try {
      lastUpdated = json['lastUpdated'] as String? ?? '';
      if (lastUpdated.isNotEmpty) {
        DateTime.parse(lastUpdated);
      }
    } catch (e) {
      debugPrint('ReadinessBaselineModel: Failed to parse lastUpdated: $e');
      lastUpdated = '';
    }
    return ReadinessBaselineModel(
      rhrMedian30Day: (json['rhrMedian30Day'] as num?)?.toDouble(),
      sleepAverage28Day: (json['sleepAverage28Day'] as num?)?.toDouble(),
      lastUpdated: lastUpdated,
    );
  }

  Map<String, dynamic> toJson() => {
        'rhrMedian30Day': rhrMedian30Day,
        'sleepAverage28Day': sleepAverage28Day,
        'lastUpdated': lastUpdated,
      };
}

@Freezed(copyWith: true)
sealed class AdaptedWorkoutModel with _$AdaptedWorkoutModel {
  const factory AdaptedWorkoutModel({
    required String id,
    required String originalWorkoutId,
    required String date,
    required String originalType,
    required String adaptedType,
    required String adaptationType,
    required double originalTargetDistance,
    double? adaptedTargetDistance,
    required int originalTargetDuration,
    int? adaptedTargetDuration,
    required double originalTargetPace,
    double? adaptedTargetPace,
    required String reason,
    required double readinessScore,
    required String readinessState,
    required bool isAccepted,
    required String createdAt,
    String? syncedAt,
  }) = _AdaptedWorkoutModel;
  const AdaptedWorkoutModel._();

  factory AdaptedWorkoutModel.fromJson(Map<String, dynamic> json) {
    String createdAt;
    try {
      createdAt = json['createdAt'] as String? ?? '';
      if (createdAt.isNotEmpty) {
        DateTime.parse(createdAt);
      }
    } catch (e) {
      debugPrint('AdaptedWorkoutModel: Failed to parse createdAt: $e');
      createdAt = '';
    }
    return AdaptedWorkoutModel(
      id: json['id'] as String? ?? '',
      originalWorkoutId: json['originalWorkoutId'] as String? ?? '',
      date: json['date'] as String? ?? '',
      originalType: json['originalType'] as String? ?? '',
      adaptedType: json['adaptedType'] as String? ?? '',
      adaptationType: json['adaptationType'] as String? ?? '',
      originalTargetDistance:
          (json['originalTargetDistance'] as num?)?.toDouble() ?? 0,
      adaptedTargetDistance:
          (json['adaptedTargetDistance'] as num?)?.toDouble(),
      originalTargetDuration:
          (json['originalTargetDuration'] as num?)?.toInt() ?? 0,
      adaptedTargetDuration: (json['adaptedTargetDuration'] as num?)?.toInt(),
      originalTargetPace:
          (json['originalTargetPace'] as num?)?.toDouble() ?? 0,
      adaptedTargetPace: (json['adaptedTargetPace'] as num?)?.toDouble(),
      reason: json['reason'] as String? ?? '',
      readinessScore: (json['readinessScore'] as num?)?.toDouble() ?? 0,
      readinessState: json['readinessState'] as String? ?? '',
      isAccepted: json['isAccepted'] as bool? ?? false,
      createdAt: createdAt,
      syncedAt: json['syncedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'originalWorkoutId': originalWorkoutId,
        'date': date,
        'originalType': originalType,
        'adaptedType': adaptedType,
        'adaptationType': adaptationType,
        'originalTargetDistance': originalTargetDistance,
        'adaptedTargetDistance': adaptedTargetDistance,
        'originalTargetDuration': originalTargetDuration,
        'adaptedTargetDuration': adaptedTargetDuration,
        'originalTargetPace': originalTargetPace,
        'adaptedTargetPace': adaptedTargetPace,
        'reason': reason,
        'readinessScore': readinessScore,
        'readinessState': readinessState,
        'isAccepted': isAccepted,
        'createdAt': createdAt,
        'syncedAt': syncedAt,
      };
}

@Freezed(copyWith: true)
sealed class WeeklyReconciliationRecordModel
    with _$WeeklyReconciliationRecordModel {
  const factory WeeklyReconciliationRecordModel({
    required String weekStartDate,
    @Default(0) double plannedLoad,
    @Default(0) double actualLoad,
    @Default(0) double adaptedLoad,
    @Default(0) double deficitPercent,
    @Default(0) double surplusPercent,
    String? adjustmentDescription,
    @Default(false) bool isApplied,
    int? raceWeeksRemaining,
    @Default(false) bool requiresReview,
    required String createdAt,
    String? syncedAt,
  }) = _WeeklyReconciliationRecordModel;
  const WeeklyReconciliationRecordModel._();

  factory WeeklyReconciliationRecordModel.fromJson(Map<String, dynamic> json) {
    String createdAt;
    try {
      createdAt = json['createdAt'] as String? ?? '';
      if (createdAt.isNotEmpty) {
        DateTime.parse(createdAt);
      }
    } catch (e) {
      debugPrint('WeeklyReconciliationRecordModel: Failed to parse createdAt: $e');
      createdAt = '';
    }
    return WeeklyReconciliationRecordModel(
      weekStartDate: json['weekStartDate'] as String? ?? '',
      plannedLoad: (json['plannedLoad'] as num?)?.toDouble() ?? 0,
      actualLoad: (json['actualLoad'] as num?)?.toDouble() ?? 0,
      adaptedLoad: (json['adaptedLoad'] as num?)?.toDouble() ?? 0,
      deficitPercent: (json['deficitPercent'] as num?)?.toDouble() ?? 0,
      surplusPercent: (json['surplusPercent'] as num?)?.toDouble() ?? 0,
      adjustmentDescription: json['adjustmentDescription'] as String?,
      isApplied: json['isApplied'] as bool? ?? false,
      raceWeeksRemaining: json['raceWeeksRemaining'] as int?,
      requiresReview: json['requiresReview'] as bool? ?? false,
      createdAt: createdAt,
      syncedAt: json['syncedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'weekStartDate': weekStartDate,
        'plannedLoad': plannedLoad,
        'actualLoad': actualLoad,
        'adaptedLoad': adaptedLoad,
        'deficitPercent': deficitPercent,
        'surplusPercent': surplusPercent,
        'adjustmentDescription': adjustmentDescription,
        'isApplied': isApplied,
        'raceWeeksRemaining': raceWeeksRemaining,
        'requiresReview': requiresReview,
        'createdAt': createdAt,
        'syncedAt': syncedAt,
      };
}
