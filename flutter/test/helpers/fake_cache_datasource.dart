import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';

class FakeCacheDatasource implements CacheDatasource {
  final _cache = <String, CachedJson>{};

  @override
  Future<CachedJson?> get(String key) async => _cache[key];

  @override
  Future<void> set(String key, String json, {DateTime? updatedAt}) async {
    _cache[key] = CachedJson(
      data: json,
      updatedAt: updatedAt ?? DateTime.now(),
    );
  }

  @override
  Future<void> remove(String key) async => _cache.remove(key);

  @override
  Future<void> clearAll() async => _cache.clear();

  @override
  Future<void> removeWherePrefix(String prefix) async {
    _cache.removeWhere((key, _) => key.startsWith(prefix));
  }

  @override
  bool isExpired(CachedJson cached, Duration maxAge) {
    return DateTime.now().difference(cached.updatedAt) > maxAge;
  }
}
