class AiActivityFeedback {
  const AiActivityFeedback({
    this.plannedComparison,
    this.progressAnalysis,
    this.goalTrajectory,
  });

  final String? plannedComparison;
  final String? progressAnalysis;
  final String? goalTrajectory;

  AiActivityFeedback copyWith({
    String? plannedComparison,
    String? progressAnalysis,
    String? goalTrajectory,
  }) {
    return AiActivityFeedback(
      plannedComparison: plannedComparison ?? this.plannedComparison,
      progressAnalysis: progressAnalysis ?? this.progressAnalysis,
      goalTrajectory: goalTrajectory ?? this.goalTrajectory,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AiActivityFeedback &&
          runtimeType == other.runtimeType &&
          plannedComparison == other.plannedComparison &&
          progressAnalysis == other.progressAnalysis &&
          goalTrajectory == other.goalTrajectory;

  @override
  int get hashCode => Object.hash(
        plannedComparison,
        progressAnalysis,
        goalTrajectory,
      );
}
