import 'package:drift/drift.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/tables.dart';

part 'health_dao.g.dart';

@DriftAccessor(tables: [FastingSessions, BodyMeasurements])
class HealthDao extends DatabaseAccessor<AppDatabase>
    with _$HealthDaoMixin {
  HealthDao(super.db);

  Future<DbFastingSession?> getActiveFastingSession() {
    return (select(fastingSessions)..where((t) => t.isActive.equals(1)))
        .getSingleOrNull();
  }

  Future<List<DbFastingSession>> getFastingHistory() {
    return (select(fastingSessions)
          ..where((t) => t.isActive.equals(0))
          ..orderBy([
            (t) => OrderingTerm.desc(t.startTime),
          ]))
        .get();
  }

  Future<int> insertFastingSession(FastingSessionsCompanion entry) =>
      into(fastingSessions).insert(entry);

  Future<void> updateFastingSession(FastingSessionsCompanion entry) {
    return (update(fastingSessions)
          ..where((t) => t.id.equals(entry.id.value)))
        .write(entry);
  }

  Future<List<DbBodyMeasurement>> getBodyMeasurements({
    DateTime? startDate,
    DateTime? endDate,
  }) {
    final query = select(bodyMeasurements)
      ..orderBy([(t) => OrderingTerm.desc(t.date)]);
    if (startDate != null && endDate != null) {
      query.where((t) => t.date.isBetweenValues(
            startDate.millisecondsSinceEpoch,
            endDate.millisecondsSinceEpoch,
          ));
    } else if (startDate != null) {
      query.where((t) => t.date.isBiggerOrEqualValue(
            startDate.millisecondsSinceEpoch,
          ));
    } else if (endDate != null) {
      query.where(
          (t) => t.date.isSmallerOrEqualValue(endDate.millisecondsSinceEpoch));
    }
    return query.get();
  }

  Future<int> insertBodyMeasurement(BodyMeasurementsCompanion entry) =>
      into(bodyMeasurements).insert(entry);
}
