class FitnessHistoryMetrics {
  const FitnessHistoryMetrics({
    required this.ctl,
    required this.atl,
    required this.tsb,
    required this.ctlRunning,
  });

  final double ctl;
  final double atl;
  final double tsb;
  final double ctlRunning;

  FitnessHistoryMetrics copyWith({
    double? ctl,
    double? atl,
    double? tsb,
    double? ctlRunning,
  }) {
    return FitnessHistoryMetrics(
      ctl: ctl ?? this.ctl,
      atl: atl ?? this.atl,
      tsb: tsb ?? this.tsb,
      ctlRunning: ctlRunning ?? this.ctlRunning,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FitnessHistoryMetrics &&
          runtimeType == other.runtimeType &&
          ctl == other.ctl &&
          atl == other.atl &&
          tsb == other.tsb &&
          ctlRunning == other.ctlRunning;

  @override
  int get hashCode => Object.hash(
        ctl,
        atl,
        tsb,
        ctlRunning,
      );
}

class FitnessHistory {
  const FitnessHistory({
    required this.date,
    required this.metrics,
  });

  final DateTime date;
  final FitnessHistoryMetrics metrics;

  FitnessHistory copyWith({
    DateTime? date,
    FitnessHistoryMetrics? metrics,
  }) {
    return FitnessHistory(
      date: date ?? this.date,
      metrics: metrics ?? this.metrics,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FitnessHistory &&
          runtimeType == other.runtimeType &&
          date == other.date &&
          metrics == other.metrics;

  @override
  int get hashCode => Object.hash(
        date,
        metrics,
      );
}
