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
  long,
  tempo,
  interval,
  recovery,
  race,
  other,
}

CompatibilityWorkoutType compatibilityWorkoutTypeFromJson(Object? value) {
  final normalized = _asString(value)?.trim().toUpperCase();

  switch (normalized) {
    case 'EASY':
      return CompatibilityWorkoutType.easy;
    case 'LONG':
    case 'LONG_RUN':
      return CompatibilityWorkoutType.long;
    case 'TEMPO':
    case 'THRESHOLD':
      return CompatibilityWorkoutType.tempo;
    case 'INTERVAL':
    case 'INTERVALS':
    case 'REPETITIONS':
      return CompatibilityWorkoutType.interval;
    case 'RECOVERY':
    case 'REST':
      return CompatibilityWorkoutType.recovery;
    case 'RACE':
      return CompatibilityWorkoutType.race;
    default:
      return CompatibilityWorkoutType.other;
  }
}

String compatibilityWorkoutTypeToJson(CompatibilityWorkoutType value) {
  switch (value) {
    case CompatibilityWorkoutType.easy:
      return 'EASY';
    case CompatibilityWorkoutType.long:
      return 'LONG';
    case CompatibilityWorkoutType.tempo:
      return 'TEMPO';
    case CompatibilityWorkoutType.interval:
      return 'INTERVAL';
    case CompatibilityWorkoutType.recovery:
      return 'RECOVERY';
    case CompatibilityWorkoutType.race:
      return 'RACE';
    case CompatibilityWorkoutType.other:
      return 'OTHER';
  }
}
