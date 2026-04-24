import 'package:runflow_flutter/data/models/dashboard_models.dart';

abstract class DashboardRepository {
  Future<DashboardResponse> fetchDashboard();

  Future<SyncResult> triggerSync();

  Future<SyncStatus> getSyncStatus();
}
