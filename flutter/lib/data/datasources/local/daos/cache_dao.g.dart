// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cache_dao.dart';

// ignore_for_file: type=lint
mixin _$CacheDaoMixin on DatabaseAccessor<AppDatabase> {
  $CachedDashboardTable get cachedDashboard => attachedDatabase.cachedDashboard;
  $CachedActivitiesTable get cachedActivities =>
      attachedDatabase.cachedActivities;
  $CachedChatMessagesTable get cachedChatMessages =>
      attachedDatabase.cachedChatMessages;
  CacheDaoManager get managers => CacheDaoManager(this);
}

class CacheDaoManager {
  final _$CacheDaoMixin _db;
  CacheDaoManager(this._db);
  $$CachedDashboardTableTableManager get cachedDashboard =>
      $$CachedDashboardTableTableManager(
        _db.attachedDatabase,
        _db.cachedDashboard,
      );
  $$CachedActivitiesTableTableManager get cachedActivities =>
      $$CachedActivitiesTableTableManager(
        _db.attachedDatabase,
        _db.cachedActivities,
      );
  $$CachedChatMessagesTableTableManager get cachedChatMessages =>
      $$CachedChatMessagesTableTableManager(
        _db.attachedDatabase,
        _db.cachedChatMessages,
      );
}
