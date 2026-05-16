import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/readiness_local_datasource.dart';
import 'package:runflow_flutter/data/datasources/remote/readiness_remote_datasource.dart';
import 'package:runflow_flutter/data/repositories/readiness_repository_impl.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/domain/repositories/readiness_repository.dart';
import 'package:runflow_flutter/domain/services/readiness/readiness_scoring_service.dart';
import 'package:runflow_flutter/domain/services/readiness/trimp_service.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/services/readiness_orchestrator.dart';

part 'readiness_providers.g.dart';

@Riverpod(keepAlive: true)
ReadinessScoringService readinessScoringService(Ref ref) {
  return const ReadinessScoringService();
}

@Riverpod(keepAlive: true)
TrimpService trimpService(Ref ref) {
  return const TrimpService();
}

@riverpod
ReadinessOrchestrator readinessOrchestrator(Ref ref) {
  return ReadinessOrchestrator(
    healthConnect: ref.watch(healthConnectServiceProvider),
    scoringService: ref.read(readinessScoringServiceProvider),
    trimpService: ref.read(trimpServiceProvider),
    activityRepository: ref.read(activityRepositoryProvider),
  );
}

@Riverpod(keepAlive: true)
Future<ReadinessRepository> readinessRepository(Ref ref) async {
  final appDb = ref.watch(appDatabaseProvider);
  final db = await appDb.database;
  final dio = ref.watch(dioClientProvider).dio;
  return ReadinessRepositoryImpl(
    localDatasource: ReadinessLocalDatasource(db: db),
    remoteDatasource: ReadinessRemoteDatasource(dio: dio),
  );
}

@riverpod
class ReadinessNotifier extends _$ReadinessNotifier {
  bool _isRefreshing = false;
  AdaptedWorkout? _adaptedWorkout;

  @override
  Future<DailyReadinessRecord?> build() async {
    final repo = await ref.read(readinessRepositoryProvider.future);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final record = await repo.getDailyRecord(today);

    if (record == null || _isStale(record)) {
      unawaited(Future.microtask(() => refresh()));
    }

    return record;
  }

  bool _isStale(DailyReadinessRecord record) {
    if (record.computedAt == null) return true;
    final age = DateTime.now().difference(record.computedAt!);
    return age.inHours >= 4;
  }

  DailyReadinessRecord? get todayRecord => state.value;

  AdaptedWorkout? get adaptedWorkout => _adaptedWorkout;

  bool get isRefreshing => _isRefreshing;

  DateTime? get lastSynced => state.value?.syncedAt;

  Future<void> refresh() async {
    _isRefreshing = true;
    try {
      final orchestrator = ref.read(readinessOrchestratorProvider);
      final inputs = await orchestrator.collectInputs(
        maxHr: null,
        restingHr: null,
        age: null,
      );
      final result = await orchestrator.computeReadiness(inputs: inputs);

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);

      final record = DailyReadinessRecord(
        date: today,
        rhr: inputs.rhr,
        sleep: inputs.sleep,
        load: inputs.load,
        subjective: inputs.subjective,
        componentScores: result.componentScores,
        compositeScore: result.compositeScore,
        state: result.state,
        confidence: result.confidence,
        reasons: result.reasons,
        result: result,
        computedAt: now,
        maxHr: inputs.maxHr,
        restingHr: inputs.restingHr,
      );

      final repo = await ref.read(readinessRepositoryProvider.future);
      final saved = await repo.saveDailyRecord(record);
      state = AsyncValue.data(saved);
    } catch (e, st) {
      if (state.value == null) {
        state = AsyncValue.error(e, st);
      }
    } finally {
      _isRefreshing = false;
    }
  }

  Future<void> saveSubjectiveInput(SubjectiveInput input) async {
    final current = state.value;
    if (current == null) return;

    final updated = current.copyWith(subjective: input);
    state = AsyncValue.data(updated);

    try {
      final repo = await ref.read(readinessRepositoryProvider.future);
      await repo.saveDailyRecord(updated);
    } catch (_) {}

    await refresh();
  }

  Future<void> acceptAdaptation(String workoutId) async {
    final repo = await ref.read(readinessRepositoryProvider.future);
    final adapted = await repo.getAdaptedWorkout(workoutId);
    if (adapted == null) return;
    final accepted = adapted.copyWith(isAccepted: true);
    await repo.saveAdaptedWorkout(accepted);
  }

  Future<void> overrideHarder(String? note) async {
    final current = state.value;
    if (current == null) return;

    final override = ReadinessOverride(
      state: OverrideState.harder,
      note: note,
      overriddenAt: DateTime.now(),
    );

    try {
      final repo = await ref.read(readinessRepositoryProvider.future);
      final updated = await repo.updateOverride(current.date, override);
      state = AsyncValue.data(updated);
    } catch (_) {}
  }

  Future<void> overrideEasier(String? note) async {
    final current = state.value;
    if (current == null) return;

    final override = ReadinessOverride(
      state: OverrideState.easier,
      note: note,
      overriddenAt: DateTime.now(),
    );

    try {
      final repo = await ref.read(readinessRepositoryProvider.future);
      final updated = await repo.updateOverride(current.date, override);
      state = AsyncValue.data(updated);
    } catch (_) {}
  }
}

class ReadinessHistoryRange {
  const ReadinessHistoryRange({required this.start, required this.end});

  final DateTime start;
  final DateTime end;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadinessHistoryRange &&
          start == other.start &&
          end == other.end;

  @override
  int get hashCode => Object.hash(start, end);
}

@riverpod
Future<List<DailyReadinessRecord>> readinessHistory(
  Ref ref,
  ReadinessHistoryRange range,
) async {
  final repo = await ref.read(readinessRepositoryProvider.future);
  final records = await repo.getHistory(range.start, range.end);

  final totalDays = range.end.difference(range.start).inDays + 1;
  final existingDates = <DateTime>{};
  for (final r in records) {
    existingDates.add(DateTime(r.date.year, r.date.month, r.date.day));
  }

  final missingDays = <DateTime>[];
  for (var i = 0; i < totalDays; i++) {
    final date = DateTime(
      range.start.year,
      range.start.month,
      range.start.day,
    ).add(Duration(days: i));
    if (!existingDates.contains(date)) {
      missingDays.add(date);
    }
  }

  if (missingDays.isEmpty) return records;

  try {
    final orchestrator = ref.read(readinessOrchestratorProvider);
    final rhrHistory =
        await orchestrator.healthConnect.readRestingHeartRateHistory(30);
    final sleepHistory =
        await orchestrator.healthConnect.readSleepHistory(28);

    for (final missingDate in missingDays) {
      final inputs = await orchestrator.collectInputsForDate(
        targetDate: missingDate,
        rhrHistory: rhrHistory,
        sleepHistory: sleepHistory,
      );
      final result = await orchestrator.computeReadiness(inputs: inputs);

      if (result.state == ReadinessState.unavailable) continue;

      final record = DailyReadinessRecord(
        date: missingDate,
        rhr: inputs.rhr,
        sleep: inputs.sleep,
        load: inputs.load,
        componentScores: result.componentScores,
        compositeScore: result.compositeScore,
        state: result.state,
        confidence: result.confidence,
        reasons: result.reasons,
        computedAt: DateTime.now(),
      );

      await repo.saveDailyRecord(record);
    }

    return repo.getHistory(range.start, range.end);
  } catch (_) {
    return records;
  }
}
