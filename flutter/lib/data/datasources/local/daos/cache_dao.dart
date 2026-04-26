import 'package:drift/drift.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/data/datasources/local/tables.dart';

part 'cache_dao.g.dart';

@DriftAccessor(tables: [CachedDashboard, CachedActivities, CachedChatMessages])
class CacheDao extends DatabaseAccessor<AppDatabase> with _$CacheDaoMixin {
  CacheDao(super.db);

  Future<DbCachedDashboard?> getCachedDashboard() {
    return (select(cachedDashboard)..limit(1)).getSingleOrNull();
  }

  Future<void> cacheDashboard(CachedDashboardCompanion entry) async {
    await delete(cachedDashboard).go();
    await into(cachedDashboard).insert(entry);
  }

  Future<void> clearCachedDashboard() => delete(cachedDashboard).go();

  Future<List<DbCachedActivity>> getCachedActivities() =>
      select(cachedActivities).get();

  Future<void> cacheActivity(DbCachedActivity entry) =>
      into(cachedActivities).insertOnConflictUpdate(entry);

  Future<void> clearCachedActivities() => delete(cachedActivities).go();

  Future<DbCachedChatMessage?> getCachedChatMessages(String sessionId) {
    return (select(cachedChatMessages)
          ..where((t) => t.sessionId.equals(sessionId)))
        .getSingleOrNull();
  }

  Future<void> cacheChatMessages(DbCachedChatMessage entry) =>
      into(cachedChatMessages).insertOnConflictUpdate(entry);

  Future<void> clearCachedChatMessages(String sessionId) {
    return (delete(cachedChatMessages)..where((t) => t.sessionId.equals(sessionId))).go();
  }
}
