import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/data/repositories/health_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/health_repository.dart';

part 'health_providers.g.dart';

@Riverpod(keepAlive: true)
AppDatabase appDatabase(Ref ref) {
  return AppDatabase.instance;
}

@Riverpod(keepAlive: true)
HealthRepository healthRepository(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return HealthRepositoryImpl(database: db);
}

@riverpod
Future<List<Supplement>> supplements(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getSupplements();
}

@riverpod
Future<FastingSession?> activeFasting(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getActiveFasting();
}

@riverpod
Future<List<FastingSession>> fastingHistory(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getFastingHistory();
}

@riverpod
Future<List<BodyMeasurement>> bodyMeasurements(Ref ref) async {
  final repo = ref.read(healthRepositoryProvider);
  return repo.getBodyMeasurements();
}

@riverpod
class Fasting extends _$Fasting {
  @override
  Future<FastingSession?> build() async {
    final repo = ref.read(healthRepositoryProvider);
    return repo.getActiveFasting();
  }

  Future<void> start() async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.startFasting();
    state = const AsyncValue.data(null);
    ref.invalidate(fastingHistoryProvider);
    ref.invalidateSelf();
  }

  Future<void> stop() async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.stopFasting();
    state = const AsyncValue.data(null);
    ref.invalidate(fastingHistoryProvider);
  }
}

@riverpod
class SupplementList extends _$SupplementList {
  @override
  Future<List<Supplement>> build() async {
    final repo = ref.read(healthRepositoryProvider);
    return repo.getSupplements();
  }

  Future<void> toggle(int id) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.toggleSupplement(id);
    ref.invalidateSelf();
  }

  Future<void> add(Supplement supplement) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.saveSupplement(supplement);
    ref.invalidateSelf();
  }
}

@riverpod
class NutritionNotifier extends _$NutritionNotifier {
  @override
  Future<NutritionLog> build(DateTime date) async {
    final repo = ref.read(healthRepositoryProvider);
    return repo.getNutritionLog(date);
  }

  Future<void> save(NutritionLog log) async {
    final repo = ref.read(healthRepositoryProvider);
    await repo.saveNutritionLog(log);
    ref.invalidateSelf();
  }
}
