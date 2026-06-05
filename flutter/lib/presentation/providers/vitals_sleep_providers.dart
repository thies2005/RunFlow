import 'package:health/health.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/data/services/health_connect_service.dart';

part 'vitals_sleep_providers.g.dart';

@Riverpod(keepAlive: true)
Health healthInstance(Ref ref) => Health();

@Riverpod(keepAlive: true)
HealthConnectService healthConnectService(Ref ref) {
  return HealthConnectServiceImpl(health: ref.watch(healthInstanceProvider));
}

@riverpod
Future<bool> healthConnectAvailable(Ref ref) async {
  return ref.watch(healthConnectServiceProvider).isAvailable();
}

@riverpod
class HealthPermissions extends _$HealthPermissions {
  @override
  Future<bool> build() async {
    final service = ref.read(healthConnectServiceProvider);
    return service.isAvailable();
  }

  Future<bool> requestPermissions() async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(healthConnectServiceProvider);
      final granted = await service.requestPermissions();
      state = AsyncValue.data(granted);
      return granted;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

@riverpod
class VitalsNotifier extends _$VitalsNotifier {
  @override
  Future<VitalsData> build() async {
    final service = ref.read(healthConnectServiceProvider);
    return service.readVitals();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(healthConnectServiceProvider);
      final data = await service.readVitals();
      state = AsyncValue.data(data);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

@riverpod
class SleepNotifier extends _$SleepNotifier {
  @override
  Future<SleepData> build() async {
    final service = ref.read(healthConnectServiceProvider);
    return service.readSleep();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(healthConnectServiceProvider);
      final data = await service.readSleep();
      state = AsyncValue.data(data);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
