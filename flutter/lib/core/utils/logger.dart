import 'package:flutter/foundation.dart';

enum LogLevel {
  debug,
  info,
  warning,
  error,
}

class AppLogger {
  static final AppLogger _instance = AppLogger._internal();
  factory AppLogger() => _instance;
  AppLogger._internal();

  final List<String> _logs = [];
  LogLevel _minLevel = LogLevel.debug;

  List<String> get logs => List.unmodifiable(_logs);

  void setMinLevel(LogLevel level) {
    _minLevel = level;
  }

  void log(String message, {LogLevel level = LogLevel.info}) {
    if (level.index < _minLevel.index) return;

    final timestamp = DateTime.now().toIso8601String();
    final levelStr = switch (level) {
      LogLevel.debug => 'DEBUG',
      LogLevel.info => 'INFO',
      LogLevel.warning => 'WARN',
      LogLevel.error => 'ERROR',
    };
    final logMessage = '[$timestamp] [$levelStr] $message';
    _logs.add(logMessage);

    if (kDebugMode) {
      switch (level) {
        case LogLevel.debug:
        case LogLevel.info:
          debugPrint(logMessage);
        case LogLevel.warning:
          debugPrint('\x1B[33m$logMessage\x1B[0m');
        case LogLevel.error:
          debugPrint('\x1B[31m$logMessage\x1B[0m');
      }
    }
  }

  void debug(String message) => log(message, level: LogLevel.debug);
  void info(String message) => log(message, level: LogLevel.info);
  void warning(String message) => log(message, level: LogLevel.warning);
  void error(String message) => log(message, level: LogLevel.error);

  void clear() {
    _logs.clear();
  }
}

final logger = AppLogger();
