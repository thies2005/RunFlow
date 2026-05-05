import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';
import 'package:runflow_flutter/services/health_sync_service.dart';

part 'health_sync_providers.g.dart';

final healthApiRepositoryProvider = Provider<HealthApiRepositoryImpl>((ref) {
  final client = ref.watch(dioClientProvider);
  return HealthApiRepositoryImpl(dio: client.dio);
});

final healthSyncServiceProvider = Provider<HealthSyncService>((ref) {
  return HealthSyncService(
    healthConnect: ref.watch(healthConnectServiceProvider),
    apiRepo: ref.watch(healthApiRepositoryProvider),
  );
});

@Riverpod(keepAlive: true)
class HealthSyncState extends _$HealthSyncState {
  @override
  ({bool isSyncing, DateTime? lastSyncTime, String? error}) build() {
    return (isSyncing: false, lastSyncTime: null, error: null);
  }

  Future<void> syncNow() async {
    state = (isSyncing: true, lastSyncTime: state.lastSyncTime, error: null);
    try {
      final syncService = ref.read(healthSyncServiceProvider);
      final available = await syncService.isAvailable();
      if (!available) {
        state = (isSyncing: false, lastSyncTime: state.lastSyncTime, error: 'Health Connect not available');
        return;
      }
      await syncService.syncHistoricalHealth();
      final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
      ref.invalidate(nutritionProvider(today));
      ref.invalidate(supplementListProvider);
      ref.invalidate(bodyMeasurementsProvider);
      ref.invalidate(fastingProvider);
      state = (isSyncing: false, lastSyncTime: DateTime.now(), error: null);
    } catch (e) {
      state = (isSyncing: false, lastSyncTime: state.lastSyncTime, error: e.toString());
    }
  }
}
