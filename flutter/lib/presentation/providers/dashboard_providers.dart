import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/repositories/dashboard_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/dashboard_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

part 'dashboard_providers.g.dart';

@Riverpod(keepAlive: true)
DashboardRepository dashboardRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  return DashboardRepositoryImpl(dio: client.dio);
}

@riverpod
class Dashboard extends _$Dashboard {
  @override
  Future<DashboardResponse> build() async {
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

  Future<void> triggerSync() async {
    final repo = ref.read(dashboardRepositoryProvider);
    try {
      await repo.triggerSync();
      await refresh();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

@riverpod
Future<SyncStatus> syncStatus(Ref ref) async {
  final repo = ref.read(dashboardRepositoryProvider);
  return repo.getSyncStatus();
}
