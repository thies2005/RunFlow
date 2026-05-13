enum PaceZoneStatus { tooFast, inZone, tooSlow, noTarget }

class PaceZoneResult {
  const PaceZoneResult({
    required this.status,
    required this.deltaSecondsPerKm,
    required this.currentPaceSecondsPerKm,
    required this.targetPaceSecondsPerKm,
    required this.toleranceSecondsPerKm,
  });

  final PaceZoneStatus status;
  final double deltaSecondsPerKm;
  final double currentPaceSecondsPerKm;
  final double targetPaceSecondsPerKm;
  final double toleranceSecondsPerKm;

  static PaceZoneResult evaluate({
    required double currentPaceSecondsPerKm,
    required double targetPaceSecondsPerKm,
    double tolerancePercent = 0.10,
  }) {
    if (targetPaceSecondsPerKm <= 0 || currentPaceSecondsPerKm <= 0) {
      return PaceZoneResult(
        status: PaceZoneStatus.noTarget,
        deltaSecondsPerKm: 0,
        currentPaceSecondsPerKm: currentPaceSecondsPerKm,
        targetPaceSecondsPerKm: targetPaceSecondsPerKm,
        toleranceSecondsPerKm: 0,
      );
    }
    final tolerance = targetPaceSecondsPerKm * tolerancePercent;
    final delta = currentPaceSecondsPerKm - targetPaceSecondsPerKm;
    PaceZoneStatus status;
    if (delta < -tolerance) {
      status = PaceZoneStatus.tooFast;
    } else if (delta > tolerance) {
      status = PaceZoneStatus.tooSlow;
    } else {
      status = PaceZoneStatus.inZone;
    }
    return PaceZoneResult(
      status: status,
      deltaSecondsPerKm: delta,
      currentPaceSecondsPerKm: currentPaceSecondsPerKm,
      targetPaceSecondsPerKm: targetPaceSecondsPerKm,
      toleranceSecondsPerKm: tolerance,
    );
  }
}
