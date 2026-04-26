// Simple plain-dart models for Health Connect vitals & sleep.
// These are NOT freezed so they don't need code generation.

class VitalsData {
  const VitalsData({
    this.restingHeartRate,
    this.hrv,
    this.spo2,
    this.lastSynced,
    this.hrTrend = const {},
  });

  final double? restingHeartRate;
  final double? hrv;
  final double? spo2;
  final DateTime? lastSynced;
  final Map<DateTime, double> hrTrend;

  bool get hasData =>
      restingHeartRate != null || hrv != null || spo2 != null;
}

class SleepSession {
  const SleepSession({
    required this.startTime,
    required this.endTime,
    required this.durationMinutes,
  });

  final DateTime startTime;
  final DateTime endTime;
  final int durationMinutes;

  double get hours => durationMinutes / 60;
}

class SleepData {
  const SleepData({
    this.lastNightMinutes = 0,
    this.lastNightStart,
    this.lastNightEnd,
    this.deepMinutes = 0,
    this.remMinutes = 0,
    this.lightMinutes = 0,
    this.lastSynced,
    this.recentSessions = const [],
  });

  final int lastNightMinutes;
  final DateTime? lastNightStart;
  final DateTime? lastNightEnd;
  final double deepMinutes;
  final double remMinutes;
  final double lightMinutes;
  final DateTime? lastSynced;
  final List<SleepSession> recentSessions;

  bool get hasData => lastNightMinutes > 0;

  double get lastNightHours => lastNightMinutes / 60;
}
