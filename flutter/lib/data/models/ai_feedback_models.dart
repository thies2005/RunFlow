import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_feedback_models.freezed.dart';
part 'ai_feedback_models.g.dart';

@Freezed(copyWith: true)
sealed class AiActivityFeedback with _$AiActivityFeedback {
  const factory AiActivityFeedback({
    String? plannedComparison,
    String? progressAnalysis,
    String? goalTrajectory,
  }) = _AiActivityFeedback;
  const AiActivityFeedback._();

  factory AiActivityFeedback.fromJson(Map<String, dynamic> json) =>
      _$AiActivityFeedbackFromJson(json);
}
