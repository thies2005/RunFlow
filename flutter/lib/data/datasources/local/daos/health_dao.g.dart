// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_dao.dart';

// ignore_for_file: type=lint
mixin _$HealthDaoMixin on DatabaseAccessor<AppDatabase> {
  $FastingSessionsTable get fastingSessions => attachedDatabase.fastingSessions;
  $BodyMeasurementsTable get bodyMeasurements =>
      attachedDatabase.bodyMeasurements;
  HealthDaoManager get managers => HealthDaoManager(this);
}

class HealthDaoManager {
  final _$HealthDaoMixin _db;
  HealthDaoManager(this._db);
  $$FastingSessionsTableTableManager get fastingSessions =>
      $$FastingSessionsTableTableManager(
        _db.attachedDatabase,
        _db.fastingSessions,
      );
  $$BodyMeasurementsTableTableManager get bodyMeasurements =>
      $$BodyMeasurementsTableTableManager(
        _db.attachedDatabase,
        _db.bodyMeasurements,
      );
}
