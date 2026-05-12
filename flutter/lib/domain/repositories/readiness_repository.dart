import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';

abstract class ReadinessRepository {
  Future<DailyReadinessRecord?> getDailyRecord(DateTime date);

  Future<DailyReadinessRecord> saveDailyRecord(DailyReadinessRecord record);

  Future<DailyReadinessRecord> updateOverride(
    DateTime date,
    ReadinessOverride override,
  );

  Future<List<DailyReadinessRecord>> getHistory(DateTime start, DateTime end);

  Future<ReadinessBaseline?> getBaseline();

  Future<ReadinessBaseline> saveBaseline(ReadinessBaseline baseline);

  Future<AdaptedWorkout?> getAdaptedWorkout(String originalWorkoutId);

  Future<AdaptedWorkout> saveAdaptedWorkout(AdaptedWorkout adapted);

  Future<WeeklyReconciliationRecord?> getWeeklyRecord(DateTime weekStartDate);

  Future<WeeklyReconciliationRecord> saveWeeklyRecord(
    WeeklyReconciliationRecord record,
  );

  Future<void> syncPendingRecords();
}
