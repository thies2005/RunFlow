String formatPace(double? secondsPerKm) {
  if (secondsPerKm == null || secondsPerKm <= 0) return '--:--';
  final totalSeconds = secondsPerKm.round();
  final minutes = totalSeconds ~/ 60;
  final seconds = totalSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')} /km';
}

String formatPaceRange(
  double? minSecondsPerKm,
  double? maxSecondsPerKm, {
  double? fallbackSecondsPerKm,
}) {
  final min = minSecondsPerKm;
  final max = maxSecondsPerKm;
  if (min != null && min > 0 && max != null && max > 0) {
    if ((min - max).abs() < 0.5) return formatPace(min);
    return '${formatPace(min)} - ${formatPace(max)}';
  }
  return formatPace(fallbackSecondsPerKm);
}

String formatHrTarget(String? label, int? minBpm, int? maxBpm, int? fallbackZone) {
  final resolvedLabel = label ?? (fallbackZone != null ? 'Z$fallbackZone' : null);
  if (resolvedLabel == null) return '';
  if (minBpm != null && maxBpm != null) return '$resolvedLabel, $minBpm-$maxBpm bpm';
  if (minBpm != null) return '$resolvedLabel, $minBpm+ bpm';
  if (maxBpm != null) return '$resolvedLabel, up to $maxBpm bpm';
  return resolvedLabel;
}

String formatDistance(double meters) {
  if (meters >= 1000) {
    return '${(meters / 1000).toStringAsFixed(2)} km';
  }
  return '${meters.toStringAsFixed(0)} m';
}

String formatDuration(int seconds) {
  final hours = seconds ~/ 3600;
  final minutes = (seconds % 3600) ~/ 60;
  final secs = seconds % 60;

  if (hours > 0) {
    return '${hours}h ${minutes}m ${secs}s';
  }
  if (minutes > 0) {
    return '${minutes}m ${secs}s';
  }
  return '${secs}s';
}

String formatDurationClock(int seconds) {
  final hours = seconds ~/ 3600;
  final minutes = (seconds % 3600) ~/ 60;
  final secs = seconds % 60;
  if (hours > 0) {
    return '$hours:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }
  return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
}

String formatRelativeDate(DateTime date) {
  final now = DateTime.now();
  final difference = now.difference(date).inDays;

  if (difference == 0) return 'Today';
  if (difference == 1) return 'Yesterday';
  if (difference < 7) return '$difference days ago';
  if (difference < 30) {
    final weeks = difference ~/ 7;
    return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
  }
  return '${date.day}/${date.month}/${date.year}';
}

String formatSyncTime(DateTime? lastSyncAt) {
  if (lastSyncAt == null) return 'Never';
  return formatRelativeDate(lastSyncAt);
}
