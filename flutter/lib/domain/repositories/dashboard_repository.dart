import 'package:runflow_flutter/data/models/dashboard_models.dart';

abstract class DashboardRepository {
  bool get isCacheStale;

  Future<DashboardResponse> fetchDashboard();

  Future<SyncResult> triggerSync();

  Future<SyncStatus> getSyncStatus();
}
