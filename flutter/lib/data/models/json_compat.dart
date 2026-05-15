String? _asString(Object? value) {
  if (value == null) {
    return null;
  }

  return value.toString();
}

DateTime? flexibleDateTimeFromJson(Object? value) {
  final raw = _asString(value);
  if (raw == null || raw.isEmpty) {
    return null;
  }

  return DateTime.tryParse(raw);
}

String? dateTimeToJson(DateTime? value) {
  return value?.toIso8601String();
}

String? dateOnlyToJson(DateTime? value) {
  if (value == null) {
    return null;
  }

  final year = value.year.toString().padLeft(4, '0');
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '$year-$month-$day';
}

enum CompatibilitySex { male, female, other }

CompatibilitySex? compatibilitySexFromJson(Object? value) {
  final normalized = _asString(value)?.trim().toUpperCase();

  switch (normalized) {
    case 'MALE':
      return CompatibilitySex.male;
    case 'FEMALE':
      return CompatibilitySex.female;
    case 'OTHER':
      return CompatibilitySex.other;
    default:
      return null;
  }
}

String? compatibilitySexToJson(CompatibilitySex? value) {
  switch (value) {
    case CompatibilitySex.male:
      return 'MALE';
    case CompatibilitySex.female:
      return 'FEMALE';
    case CompatibilitySex.other:
      return 'OTHER';
    case null:
      return null;
  }
}

enum CompatibilityWorkoutType {
  easy,
  longRun,
  tempo,
  intervals,
  fartlek,
  repetitions,
  recovery,
  race,
  rest,
  crossTrain,
  ride,
  swim,
  strength,
  other,
  brick,
  openWaterSwim,
  longRide,
  rideIntervals,
  swimDrill,
  transitionPractice,
  doubleDay,
}

CompatibilityWorkoutType compatibilityWorkoutTypeFromJson(Object? value) {
  final normalized = _asString(value)?.trim().toUpperCase();

  return switch (normalized) {
    'EASY' => CompatibilityWorkoutType.easy,
    'LONG' || 'LONG_RUN' => CompatibilityWorkoutType.longRun,
    'TEMPO' || 'THRESHOLD' => CompatibilityWorkoutType.tempo,
    'INTERVAL' || 'INTERVALS' => CompatibilityWorkoutType.intervals,
    'FARTLEK' => CompatibilityWorkoutType.fartlek,
    'REPETITIONS' || 'REPS' => CompatibilityWorkoutType.repetitions,
    'RECOVERY' => CompatibilityWorkoutType.recovery,
    'RACE' => CompatibilityWorkoutType.race,
    'REST' => CompatibilityWorkoutType.rest,
    'CROSS_TRAIN' || 'CROSS' => CompatibilityWorkoutType.crossTrain,
    'RIDE' => CompatibilityWorkoutType.ride,
    'SWIM' => CompatibilityWorkoutType.swim,
    'STRENGTH' => CompatibilityWorkoutType.strength,
    'BRICK' => CompatibilityWorkoutType.brick,
    'OPEN_WATER_SWIM' || 'OWS' => CompatibilityWorkoutType.openWaterSwim,
    'LONG_RIDE' => CompatibilityWorkoutType.longRide,
    'RIDE_INTERVALS' => CompatibilityWorkoutType.rideIntervals,
    'SWIM_DRILL' => CompatibilityWorkoutType.swimDrill,
    'TRANSITION_PRACTICE' => CompatibilityWorkoutType.transitionPractice,
    'DOUBLE_DAY' => CompatibilityWorkoutType.doubleDay,
    _ => CompatibilityWorkoutType.other,
  };
}

String compatibilityWorkoutTypeToJson(CompatibilityWorkoutType value) {
  return switch (value) {
    CompatibilityWorkoutType.easy => 'EASY',
    CompatibilityWorkoutType.longRun => 'LONG_RUN',
    CompatibilityWorkoutType.tempo => 'TEMPO',
    CompatibilityWorkoutType.intervals => 'INTERVALS',
    CompatibilityWorkoutType.fartlek => 'FARTLEK',
    CompatibilityWorkoutType.repetitions => 'REPETITIONS',
    CompatibilityWorkoutType.recovery => 'RECOVERY',
    CompatibilityWorkoutType.race => 'RACE',
    CompatibilityWorkoutType.rest => 'REST',
    CompatibilityWorkoutType.crossTrain => 'CROSS_TRAIN',
    CompatibilityWorkoutType.ride => 'RIDE',
    CompatibilityWorkoutType.swim => 'SWIM',
    CompatibilityWorkoutType.strength => 'STRENGTH',
    CompatibilityWorkoutType.other => 'OTHER',
    CompatibilityWorkoutType.brick => 'BRICK',
    CompatibilityWorkoutType.openWaterSwim => 'OPEN_WATER_SWIM',
    CompatibilityWorkoutType.longRide => 'LONG_RIDE',
    CompatibilityWorkoutType.rideIntervals => 'RIDE_INTERVALS',
    CompatibilityWorkoutType.swimDrill => 'SWIM_DRILL',
    CompatibilityWorkoutType.transitionPractice => 'TRANSITION_PRACTICE',
    CompatibilityWorkoutType.doubleDay => 'DOUBLE_DAY',
  };
}
