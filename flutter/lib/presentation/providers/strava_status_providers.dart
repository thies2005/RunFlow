import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'strava_status_providers.g.dart';

@Riverpod(keepAlive: true)
class StravaStatus extends _$StravaStatus {
  static const _lastSyncKey = 'strava_last_sync';
  static const _connectedKey = 'strava_connected';
  static const _authExpiredKey = 'strava_auth_expired';

  @override
  StravaStatusState build() {
    _loadState();
    return const StravaStatusState();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    state = StravaStatusState(
      isConnected: prefs.getBool(_connectedKey) ?? true,
      lastSyncAt: prefs.getString(_lastSyncKey) != null
          ? DateTime.tryParse(prefs.getString(_lastSyncKey)!)
          : null,
      isAuthExpired: prefs.getBool(_authExpiredKey) ?? false,
    );
  }

  Future<void> setConnected(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_connectedKey, value);
    await prefs.setBool(_authExpiredKey, false);
    state = state.copyWith(isConnected: value, isAuthExpired: false);
  }

  Future<void> setAuthExpired(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_authExpiredKey, value);
    state = state.copyWith(isAuthExpired: value);
  }

  Future<void> updateLastSync() async {
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    await prefs.setString(_lastSyncKey, now.toIso8601String());
    state = state.copyWith(lastSyncAt: now);
  }

  Future<void> refreshFromServer() async {
    try {
      final client = ref.read(dioClientProvider);
      final response = await client.dio.get('/user/strava/status');
      final data = response.data as Map<String, dynamic>;
      final connected = data['connected'] as bool? ?? true;
      final authExpired = data['authExpired'] as bool? ?? false;
      final lastSync = data['lastSyncAt'] as String?;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_connectedKey, connected);
      await prefs.setBool(_authExpiredKey, authExpired);
      if (lastSync != null) {
        await prefs.setString(_lastSyncKey, lastSync);
      }

      state = StravaStatusState(
        isConnected: connected,
        isAuthExpired: authExpired,
        lastSyncAt:
            lastSync != null ? DateTime.tryParse(lastSync) : state.lastSyncAt,
      );
    } catch (e) {
      logger.error('[StravaStatus] Refresh from server failed: $e');
    }
  }
}

class StravaStatusState {
  const StravaStatusState({
    this.isConnected = true,
    this.isAuthExpired = false,
    this.lastSyncAt,
  });

  final bool isConnected;
  final bool isAuthExpired;
  final DateTime? lastSyncAt;

  StravaStatusState copyWith({
    bool? isConnected,
    bool? isAuthExpired,
    DateTime? lastSyncAt,
  }) {
    return StravaStatusState(
      isConnected: isConnected ?? this.isConnected,
      isAuthExpired: isAuthExpired ?? this.isAuthExpired,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }
}
