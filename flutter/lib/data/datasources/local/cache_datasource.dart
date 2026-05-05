import 'package:runflow_flutter/data/datasources/local/app_database.dart';

class CachedJson {
  const CachedJson({required this.data, required this.updatedAt});

  final String data;
  final DateTime updatedAt;
}

class CacheDatasource {
  CacheDatasource({required AppDatabase database}) : _db = database;

  final AppDatabase _db;

  Future<CachedJson?> get(String key) async {
    final db = await _db.database;
    final rows = db.select(
      'SELECT data, updated_at FROM api_cache WHERE key = ?',
      [key],
    );
    if (rows.isEmpty) return null;
    return CachedJson(
      data: rows.first['data'] as String,
      updatedAt: DateTime.fromMillisecondsSinceEpoch(rows.first['updated_at'] as int),
    );
  }

  Future<void> set(String key, String json, {DateTime? updatedAt}) async {
    final db = await _db.database;
    final ts = (updatedAt ?? DateTime.now()).millisecondsSinceEpoch;
    db.execute(
      'INSERT OR REPLACE INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)',
      [key, json, ts],
    );
  }

  Future<void> remove(String key) async {
    final db = await _db.database;
    db.execute('DELETE FROM api_cache WHERE key = ?', [key]);
  }

  Future<void> clearAll() async {
    final db = await _db.database;
    db.execute('DELETE FROM api_cache');
  }

  Future<void> removeWherePrefix(String prefix) async {
    final db = await _db.database;
    db.execute('DELETE FROM api_cache WHERE key LIKE ?', ['$prefix%']);
  }

  bool isExpired(CachedJson cached, Duration maxAge) {
    return DateTime.now().difference(cached.updatedAt) > maxAge;
  }
}
