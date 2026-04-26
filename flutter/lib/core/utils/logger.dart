import 'package:flutter/foundation.dart';

class AppLogger {
  static final AppLogger _instance = AppLogger._internal();
  factory AppLogger() => _instance;
  AppLogger._internal();

  final List<String> _logs = [];

  List<String> get logs => List.unmodifiable(_logs);

  void log(String message) {
    final timestamp = DateTime.now().toIso8601String();
    final logMessage = '[$timestamp] $message';
    _logs.add(logMessage);
    if (kDebugMode) {
      print(logMessage);
    }
  }

  void clear() {
    _logs.clear();
  }
}

final logger = AppLogger();
