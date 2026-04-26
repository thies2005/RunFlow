import 'package:drift/drift.dart';

@DataClassName('DbNutritionLog')
class NutritionLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get date => integer()();
  RealColumn get calories => real().withDefault(const Constant(0.0))();
  RealColumn get protein => real().withDefault(const Constant(0.0))();
  RealColumn get carbs => real().withDefault(const Constant(0.0))();
  RealColumn get fat => real().withDefault(const Constant(0.0))();
  RealColumn get water => real().withDefault(const Constant(0.0))();
  TextColumn get notes => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('DbFoodItem')
class FoodItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  RealColumn get calories => real()();
  RealColumn get protein => real()();
  RealColumn get carbs => real()();
  RealColumn get fat => real()();
  RealColumn get servingSize => real()();
  TextColumn get barcode => text().nullable()();
}

@DataClassName('DbSupplement')
class Supplements extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  TextColumn get dosage => text()();
  TextColumn get frequency => text()();
  IntColumn get isActive => integer().withDefault(const Constant(1))();
}

@DataClassName('DbSupplementStack')
class SupplementStacks extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  IntColumn get isActive => integer().withDefault(const Constant(1))();
}

@DataClassName('DbSupplementStackItem')
class SupplementStackItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get stackId => integer().references(SupplementStacks, #id)();
  IntColumn get supplementId => integer().references(Supplements, #id)();
}

@DataClassName('DbDailyHealthLog')
class DailyHealthLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get date => integer()();
  IntColumn get nutritionLogId =>
      integer().nullable().references(NutritionLogs, #id)();
  RealColumn get weight => real().withDefault(const Constant(0.0))();
  RealColumn get bodyFat => real().withDefault(const Constant(0.0))();
  TextColumn get notes => text().nullable()();
}

@DataClassName('DbFastingSession')
class FastingSessions extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get startTime => integer()();
  IntColumn get endTime => integer().nullable()();
  IntColumn get duration => integer().withDefault(const Constant(0))();
  IntColumn get isActive => integer().withDefault(const Constant(1))();
}

@DataClassName('DbBodyMeasurement')
class BodyMeasurements extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get date => integer()();
  RealColumn get weight => real()();
  RealColumn get bodyFat => real()();
  RealColumn get chest => real().nullable()();
  RealColumn get waist => real().nullable()();
  RealColumn get hips => real().nullable()();
  TextColumn get notes => text().nullable()();
}

@DataClassName('DbCachedDashboard')
class CachedDashboard extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get jsonData => text()();
  IntColumn get cachedAt => integer()();
}

@DataClassName('DbCachedActivity')
class CachedActivities extends Table {
  TextColumn get activityId => text()();
  TextColumn get jsonData => text()();
  IntColumn get cachedAt => integer()();

  @override
  Set<Column> get primaryKey => {activityId};
}

@DataClassName('DbCachedChatMessage')
class CachedChatMessages extends Table {
  TextColumn get sessionId => text()();
  TextColumn get jsonData => text()();
  IntColumn get cachedAt => integer()();

  @override
  Set<Column> get primaryKey => {sessionId};
}
