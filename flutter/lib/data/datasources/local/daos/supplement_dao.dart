import 'package:drift/drift.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/tables.dart';

part 'supplement_dao.g.dart';

@DriftAccessor(tables: [Supplements])
class SupplementDao extends DatabaseAccessor<AppDatabase>
    with _$SupplementDaoMixin {
  SupplementDao(super.db);

  Future<List<DbSupplement>> getAllSupplements() =>
      select(supplements).get();

  Future<int> insertSupplement(SupplementsCompanion entry) =>
      into(supplements).insert(entry);

  Future<void> updateSupplement(SupplementsCompanion entry) {
    return (update(supplements)..where((t) => t.id.equals(entry.id.value)))
        .write(entry);
  }
}
