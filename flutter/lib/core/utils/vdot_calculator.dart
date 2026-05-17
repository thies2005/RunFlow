import 'dart:math';

export 'vdot.dart';

String raceTypeToDistanceKey(String raceType) {
  switch (raceType) {
    case 'FIVE_K':
    case 'fiveK':
      return '5K';
    case 'TEN_K':
    case 'tenK':
      return '10K';
    case 'HALF_MARATHON':
    case 'halfMarathon':
      return 'HALF';
    case 'MARATHON':
    case 'marathon':
      return 'MARATHON';
    default:
      return 'MARATHON';
  }
}

String raceTypeToApiString(String raceType) {
  switch (raceType) {
    case 'fiveK':
      return 'FIVE_K';
    case 'tenK':
      return 'TEN_K';
    case 'halfMarathon':
      return 'HALF_MARATHON';
    case 'marathon':
      return 'MARATHON';
    default:
      return raceType;
  }
}

String formatDuration(int totalSeconds) {
  if (totalSeconds <= 0) return '--:--';
  final hours = totalSeconds ~/ 3600;
  final mins = (totalSeconds % 3600) ~/ 60;
  final secs = totalSeconds % 60;

  if (hours > 0) {
    return '$hours:${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }
  return '$mins:${secs.toString().padLeft(2, '0')}';
}

String formatPace(int secsPerKm) {
  if (secsPerKm <= 0) return '--:--';
  final mins = secsPerKm ~/ 60;
  final secs = secsPerKm % 60;
  return '$mins:${secs.toString().padLeft(2, '0')}/km';
}

int calculateDefaultMaxLongRunKm(String raceType, double weeklyMileageKm) {
  final key = raceTypeToDistanceKey(raceType);
  const maxByRace = <String, double>{
    '5K': 18,
    '10K': 22,
    'HALF': 24,
    'MARATHON': 32,
  };
  final raceCap = maxByRace[key] ?? 22;
  final calculated = (weeklyMileageKm * 0.55).round();
  return max(6, min(calculated, raceCap.toInt()));
}

List<HeartRateZone> calculateHRZonesFromLTHR(int lthr) {
  if (lthr <= 0) return [];
  return [
    HeartRateZone(label: 'Z1 Recovery', min: 0, max: (lthr * 0.75).round()),
    HeartRateZone(
        label: 'Z2 Aerobic',
        min: (lthr * 0.75).round() + 1,
        max: (lthr * 0.87).round()),
    HeartRateZone(
        label: 'Z3 Tempo',
        min: (lthr * 0.87).round() + 1,
        max: (lthr * 0.94).round()),
    HeartRateZone(
        label: 'Z4 Threshold',
        min: (lthr * 0.94).round() + 1,
        max: lthr),
    HeartRateZone(
        label: 'Z5 VO2max',
        min: lthr + 1,
        max: (lthr * 1.05).round()),
    HeartRateZone(
        label: 'Z6 Anaerobic',
        min: (lthr * 1.05).round() + 1,
        max: (lthr * 1.10).round()),
    HeartRateZone(
        label: 'Z7 Neuromuscular',
        min: (lthr * 1.10).round() + 1,
        max: 999),
  ];
}

class HeartRateZone {
  const HeartRateZone({
    required this.label,
    required this.min,
    required this.max,
  });

  final String label;
  final int min;
  final int max;
}
