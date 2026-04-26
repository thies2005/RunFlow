import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';
import 'package:runflow_flutter/services/health_sync_service.dart';

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
