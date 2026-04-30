import 'package:runflow_flutter/data/models/ai_feedback_models.dart';
import 'package:runflow_flutter/domain/entities/ai_feedback_entities.dart' as domain;

extension AiActivityFeedbackMapper on AiActivityFeedback {
  domain.AiActivityFeedback toDomain() => domain.AiActivityFeedback(
        plannedComparison: plannedComparison,
        progressAnalysis: progressAnalysis,
        goalTrajectory: goalTrajectory,
      );
}

extension DomainAiActivityFeedbackMapper on domain.AiActivityFeedback {
  AiActivityFeedback toData() => AiActivityFeedback(
        plannedComparison: plannedComparison,
        progressAnalysis: progressAnalysis,
        goalTrajectory: goalTrajectory,
      );
}
