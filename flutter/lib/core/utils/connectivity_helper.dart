import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (results) => results.any((r) => r != ConnectivityResult.none),
    loading: () => true,
    error: (_, _) => true,
  );
});

final connectivitySyncListenerProvider = Provider<void>((ref) {
  ref.listen<AsyncValue<List<ConnectivityResult>>>(
    connectivityProvider,
    (previous, next) {
      final wasOnline = previous?.when(
        data: (results) => results.any((r) => r != ConnectivityResult.none),
        loading: () => true,
        error: (_, _) => true,
      ) ?? true;

      final isNowOnline = next.when(
        data: (results) => results.any((r) => r != ConnectivityResult.none),
        loading: () => true,
        error: (_, _) => true,
      );

      if (!wasOnline && isNowOnline) {
        _triggerOfflineSync(ref);
      }
    },
  );
});

void _triggerOfflineSync(Ref ref) {
  try {
    final syncService = ref.read(offlineSyncServiceProvider);
    syncService.flushPendingSync().then((synced) {
      if (synced > 0) {
        logger.info('[ConnectivityHelper] Synced $synced pending activities on reconnect');
        ref.invalidate(pendingSyncCountProvider);
      }
    }).catchError((e) {
      logger.warning('[ConnectivityHelper] Failed to flush pending sync on reconnect: $e');
    });
  } catch (e) {
    logger.warning('[ConnectivityHelper] Could not trigger offline sync: $e');
  }
}
