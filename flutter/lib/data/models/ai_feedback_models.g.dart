// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_feedback_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AiActivityFeedback _$AiActivityFeedbackFromJson(Map<String, dynamic> json) =>
    _AiActivityFeedback(
      plannedComparison: json['plannedComparison'] as String?,
      progressAnalysis: json['progressAnalysis'] as String?,
      goalTrajectory: json['goalTrajectory'] as String?,
    );

Map<String, dynamic> _$AiActivityFeedbackToJson(_AiActivityFeedback instance) =>
    <String, dynamic>{
      'plannedComparison': instance.plannedComparison,
      'progressAnalysis': instance.progressAnalysis,
      'goalTrajectory': instance.goalTrajectory,
    };
