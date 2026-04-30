import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

abstract class DashboardRepository {
  Future<DashboardResponse> fetchDashboard();

  Future<SyncResult> triggerSync();

  Future<SyncStatus> getSyncStatus();
}
