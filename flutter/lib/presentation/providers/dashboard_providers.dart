import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/data/repositories/dashboard_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/dashboard_repository.dart';

import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

part 'dashboard_providers.g.dart';

@Riverpod(keepAlive: true)
DashboardRepository dashboardRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final cache = ref.read(cacheDatasourceProvider);
  return DashboardRepositoryImpl(dio: client.dio, cacheDatasource: cache);
}

@Riverpod(keepAlive: true)
class Dashboard extends _$Dashboard {
  Timer? _syncPollTimer;

  @override
  Future<DashboardResponse> build() async {
    ref.onDispose(() {
      _syncPollTimer?.cancel();
    });
    final repo = ref.read(dashboardRepositoryProvider);
    return repo.fetchDashboard();
  }

  Future<void> refresh() async {
    final previous = state.value;
    if (previous != null) {
      state = AsyncData<DashboardResponse>(previous);
    } else {
      state = const AsyncLoading<DashboardResponse>();
    }
    final repo = ref.read(dashboardRepositoryProvider);
    state = await AsyncValue.guard(repo.fetchDashboard);
  }

  Future<bool> triggerSync() async {
    final repo = ref.read(dashboardRepositoryProvider);
    try {
      await repo.triggerSync();
    } catch (e) {
      logger.error('[Dashboard] Sync trigger failed: $e');
      await refresh();
      return false;
    }
    await refresh();
    _startSyncPolling();
    return true;
  }

  void _startSyncPolling() {
    _syncPollTimer?.cancel();
    _syncPollTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      final current = state.value;
      if (current == null || !current.syncStatus.syncInProgress) {
        timer.cancel();
        return;
      }
      await refresh();
    });
  }
}

@riverpod
Future<SyncStatus> syncStatus(Ref ref) async {
  final repo = ref.read(dashboardRepositoryProvider);
  return repo.getSyncStatus();
}
