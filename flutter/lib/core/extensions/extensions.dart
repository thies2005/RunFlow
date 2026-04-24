extension DateTimeExtensions on DateTime {
  String get toDateString =>
      '${day.toString().padLeft(2, '0')}/${month.toString().padLeft(2, '0')}/$year';

  String get toTimeString =>
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

  String get toIsoDateString => toIso8601String().split('T').first;

  DateTime get startOfDay => DateTime(year, month, day);

  DateTime get endOfDay => DateTime(year, month, day, 23, 59, 59);

  DateTime get startOfWeek => subtract(Duration(days: weekday - 1)).startOfDay;

  DateTime get startOfMonth => DateTime(year, month).startOfDay;

  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  int get daysSince => DateTime.now().difference(this).inDays;
}

extension StringExtensions on String {
  String get capitalized =>
      isEmpty ? '' : '${this[0].toUpperCase()}${substring(1)}';

  String get titleCase => split(' ').map((w) => w.capitalized).join(' ');
}

extension NumExtensions on num {
  String toPaceString() {
    if (this == 0) return '--:--';
    final totalSeconds = (this * 60).round();
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  String toDistanceString({bool metric = true}) {
    if (metric) {
      if (this >= 1000) {
        return '${(this / 1000).toStringAsFixed(1)} km';
      }
      return '${toStringAsFixed(0)} m';
    }
    final miles = this * 0.000621371;
    if (miles >= 0.1) {
      return '${miles.toStringAsFixed(1)} mi';
    }
    return '${(this * 3.28084).toStringAsFixed(0)} ft';
  }

  String toDurationString() {
    final totalSeconds = round();
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }
}
