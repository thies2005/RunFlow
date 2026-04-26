import 'package:freezed_annotation/freezed_annotation.dart';

part 'race_models.freezed.dart';
part 'race_models.g.dart';

double _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  if (value is Map) {
    final val = value['value'] ?? value['\$numberDouble'] ?? value.values.first;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0.0;
  }
  return 0.0;
}

@Freezed(copyWith: true)
sealed class RaceCountdownData with _$RaceCountdownData {
  const factory RaceCountdownData({
    required String goalId,
    required String goalName,
    required String raceType,
    required DateTime raceDate,
    required int daysToRace,
    required int weeksToRace,
    required int planWeeks,
    required int weeksCompleted,
    required double progressPercent,
    required int? targetTimeSeconds,
    required int? projectedTimeSeconds,
    required double? projectedVdot,
    required double currentWeekMileage,
    required double plannedWeekMileage,
    required bool isRaceDay,
    required bool isPostRace,
    required bool isOverdue,
    required bool hasRaceResult,
    required int totalWorkouts,
    required int completedWorkouts,
  }) = _RaceCountdownData;
  const RaceCountdownData._();

  factory RaceCountdownData.fromJson(Map<String, dynamic> json) =>
      _$RaceCountdownDataFromJson(json);
}

@Freezed(copyWith: true)
sealed class TrainingStatusData with _$TrainingStatusData {
  const factory TrainingStatusData({
    @JsonKey(fromJson: _parseDouble) required double shapePercent,
    @JsonKey(fromJson: _parseDouble) required double effectiveVO2max,
    @JsonKey(fromJson: _parseDouble) required double correctionFactor,
    @JsonKey(fromJson: _parseDouble) required double ctl,
    @JsonKey(fromJson: _parseDouble) required double atl,
    @JsonKey(fromJson: _parseDouble) required double tsb,
    @JsonKey(fromJson: _parseDouble) required double workloadRatio,
    @JsonKey(fromJson: _parseDouble) required double easyTrimp,
    @JsonKey(fromJson: _parseDouble) required double maxCtl,
    @JsonKey(fromJson: _parseDouble) required double maxAtl,
    @JsonKey(fromJson: _parseDouble) required double ctlPercent,
    @JsonKey(fromJson: _parseDouble) required double atlPercent,
  }) = _TrainingStatusData;
  const TrainingStatusData._();

  factory TrainingStatusData.fromJson(Map<String, dynamic> json) =>
      _$TrainingStatusDataFromJson(json);
}

@Freezed(copyWith: true)
sealed class SuggestedRaceActivity with _$SuggestedRaceActivity {
  const factory SuggestedRaceActivity({
    required String id,
    required String name,
    required DateTime startDate,
    required double distance,
    required int movingTime,
    required double? averageSpeed,
  }) = _SuggestedRaceActivity;
  const SuggestedRaceActivity._();

  factory SuggestedRaceActivity.fromJson(Map<String, dynamic> json) =>
      _$SuggestedRaceActivityFromJson(json);
}

@Freezed(copyWith: true)
sealed class RaceResult with _$RaceResult {
  const factory RaceResult({
    required String id,
    required String goalId,
    required String? activityId,
    required int? actualTime,
    required int? chipTime,
    required int? placementOverall,
    required int? placementGender,
    required int? placementAgeGroup,
    required String? ageGroup,
    required int? totalFinishers,
    required String? weatherConditions,
    required int? feltLike,
    required String? notes,
  }) = _RaceResult;
  const RaceResult._();

  factory RaceResult.fromJson(Map<String, dynamic> json) =>
      _$RaceResultFromJson(json);
}

@Freezed(copyWith: true)
sealed class CompleteRaceRequest with _$CompleteRaceRequest {
  const factory CompleteRaceRequest({
    required String? raceActivityId,
    required int? actualTime,
    required int? chipTime,
    required int? placementOverall,
    required int? placementGender,
    required int? placementAgeGroup,
    required String? ageGroup,
    required int? totalFinishers,
    required String? weatherConditions,
    required int? feltLike,
    required String? notes,
  }) = _CompleteRaceRequest;
  const CompleteRaceRequest._();

  factory CompleteRaceRequest.fromJson(Map<String, dynamic> json) =>
      _$CompleteRaceRequestFromJson(json);
}

@Freezed(copyWith: true)
sealed class RaceSuggestionResponse with _$RaceSuggestionResponse {
  const factory RaceSuggestionResponse({
    required List<SuggestedRaceActivity> suggestions,
  }) = _RaceSuggestionResponse;
  const RaceSuggestionResponse._();

  factory RaceSuggestionResponse.fromJson(Map<String, dynamic> json) =>
      _$RaceSuggestionResponseFromJson(json);
}

@Freezed(copyWith: true)
sealed class TrainingCompletionSummary with _$TrainingCompletionSummary {
  const factory TrainingCompletionSummary({
    required int totalWorkouts,
    required int completedWorkouts,
    required int completionRate,
  }) = _TrainingCompletionSummary;
  const TrainingCompletionSummary._();

  factory TrainingCompletionSummary.fromJson(Map<String, dynamic> json) =>
      _$TrainingCompletionSummaryFromJson(json);
}

enum RaceResultMode { suggest, pick, review }

@Freezed(copyWith: true)
sealed class RaceResultFlowState with _$RaceResultFlowState {
  const factory RaceResultFlowState({
    required RaceResultMode mode,
    required bool isLoading,
    @Default(false) bool isSaving,
    SuggestedRaceActivity? suggestedActivity,
    String? selectedActivityId,
    int? actualTimeSeconds,
    int? chipTimeSeconds,
    int? placementOverall,
    int? placementGender,
    int? placementAgeGroup,
    String? ageGroup,
    int? totalFinishers,
    String? weatherConditions,
    int? feltLike,
    String? notes,
  }) = _RaceResultFlowState;
  const RaceResultFlowState._();
}
