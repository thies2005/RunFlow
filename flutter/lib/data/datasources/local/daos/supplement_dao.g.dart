// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'supplement_dao.dart';

// ignore_for_file: type=lint
mixin _$SupplementDaoMixin on DatabaseAccessor<AppDatabase> {
  $SupplementsTable get supplements => attachedDatabase.supplements;
  SupplementDaoManager get managers => SupplementDaoManager(this);
}

class SupplementDaoManager {
  final _$SupplementDaoMixin _db;
  SupplementDaoManager(this._db);
  $$SupplementsTableTableManager get supplements =>
      $$SupplementsTableTableManager(_db.attachedDatabase, _db.supplements);
}
