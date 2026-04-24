import 'package:workmanager/workmanager.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    return true;
  });
}

class BackgroundSyncService {
  BackgroundSyncService._();

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Workmanager().initialize(callbackDispatcher);
      _initialized = true;
    } catch (_) {}
  }

  static Future<void> registerPeriodicSync() async {
    if (!_initialized) return;

    try {
      await Workmanager().registerPeriodicTask(
        'runflow-background-sync',
        'backgroundSync',
        frequency: const Duration(minutes: 30),
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      );
    } catch (_) {}
  }

  static Future<void> cancel() async {
    if (!_initialized) return;

    try {
      await Workmanager().cancelByUniqueName('runflow-background-sync');
    } catch (_) {}
  }
}
