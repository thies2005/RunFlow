import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/domain/entities/settings_entities.dart';
import 'package:runflow_flutter/data/repositories/profile_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/profile_repository.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

final apiKeyRepositoryProvider = Provider<ProfileRepository>((ref) {
  final client = ref.watch(dioClientProvider);
  final cache = ref.read(cacheDatasourceProvider);
  return ProfileRepositoryImpl(dio: client.dio, cacheDatasource: cache);
});

final apiKeyInfoProvider = FutureProvider<ApiKeyInfo?>((ref) async {
  try {
    final repo = ref.read(apiKeyRepositoryProvider);
    return repo.getApiKeyInfo();
  } catch (_) {
    return null;
  }
});

class ApiKeyNotifier extends Notifier<AsyncValue<ApiKeyInfo?>> {
  @override
  AsyncValue<ApiKeyInfo?> build() {
    _load();
    return const AsyncValue.loading();
  }

  Future<void> _load() async {
    try {
      final repo = ref.read(apiKeyRepositoryProvider);
      final info = await repo.getApiKeyInfo();
      state = AsyncValue.data(info);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<GeneratedApiKey?> generate({String name = 'My API Key'}) async {
    try {
      final repo = ref.read(apiKeyRepositoryProvider);
      final result = await repo.generateApiKey(name: name);
      await _load();
      return result;
    } catch (_) {
      return null;
    }
  }

  Future<bool> revoke() async {
    try {
      final repo = ref.read(apiKeyRepositoryProvider);
      await repo.revokeApiKey();
      await _load();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final apiKeyNotifierProvider =
    NotifierProvider<ApiKeyNotifier, AsyncValue<ApiKeyInfo?>>(
  ApiKeyNotifier.new,
);
