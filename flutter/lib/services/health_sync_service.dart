import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';

class HealthSyncService {
  HealthSyncService({
    required HealthConnectService healthConnect,
    required HealthApiRepositoryImpl apiRepo,
  })  : _healthConnect = healthConnect,
        _apiRepo = apiRepo;

  final HealthConnectService _healthConnect;
  final HealthApiRepositoryImpl _apiRepo;
  Timer? _autoSyncTimer;

  Future<bool> isAvailable() => _healthConnect.isAvailable();

  Future<bool> requestAllPermissions() =>
      _healthConnect.requestPermissions();

  Future<void> syncDailyHealth(DateTime date) async {
    try {
      final available = await _healthConnect.isAvailable();
      if (!available) {
        debugPrint('[HealthSync] Health Connect not available, skipping sync');
        return;
      }

      final start = DateTime(date.year, date.month, date.day);
      final end = start.add(const Duration(days: 1));

      final steps = await _healthConnect.readSteps();
      int totalSteps = 0;
      for (final point in steps) {
        if (!point.dateFrom.isBefore(start) && point.dateFrom.isBefore(end)) {
          if (point.value is NumericHealthValue) {
            totalSteps += (point.value as NumericHealthValue).numericValue.toInt();
          }
        }
      }

      final weightData = await _healthConnect.readWeight(start, end);
      double? weight;
      if (weightData.isNotEmpty) {
        weightData.sort((a, b) => b.dateFrom.compareTo(a.dateFrom));
        final latest = weightData.first;
        if (latest.value is NumericHealthValue) {
          weight = (latest.value as NumericHealthValue).numericValue.toDouble();
        }
      }

      final caloriesData = await _healthConnect.readActiveCalories(start, end);
      int totalCalories = 0;
      for (final point in caloriesData) {
        if (point.value is NumericHealthValue) {
          totalCalories += (point.value as NumericHealthValue).numericValue.toInt();
        }
      }

      final payload = <String, dynamic>{
        'date': start.toIso8601String().split('T').first,
        'steps': totalSteps > 0 ? totalSteps : null,
        'weight': weight,
        'activeCalories': totalCalories > 0 ? totalCalories : null,
      }..removeWhere((_, value) => value == null);

      await _apiRepo.batchSync({
        'data': [payload],
      });
    } catch (e) {
      debugPrint('Health sync failed for $date: $e');
    }
  }

  Future<void> syncHistoricalHealth({int daysToSync = 7}) async {
    for (int i = 0; i < daysToSync; i++) {
      final date = DateTime.now().subtract(Duration(days: i));
      await syncDailyHealth(date);
    }
  }

  Future<void> writeWeight(double weightKg, DateTime date) async {
    try {
      final health = Health();
      await health.writeHealthData(
        type: HealthDataType.WEIGHT,
        value: weightKg,
        startTime: date,
        endTime: date,
      );
    } catch (e) {
      debugPrint('Failed to write weight: $e');
    }
  }

  void startAutoSync({Duration interval = const Duration(minutes: 15)}) {
    stopAutoSync();
    _autoSyncTimer = Timer.periodic(interval, (_) async {
      await syncDailyHealth(DateTime.now());
    });
  }

  void stopAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = null;
  }
}
