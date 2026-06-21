import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
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
      isConnected: prefs.getBool(_connectedKey) ?? false,
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
    // The server does not currently expose a mobile Strava-status endpoint, so
    // there is nothing to refresh remotely. Strava connection state is tracked
    // locally (set via setConnected/setAuthExpired during login) and is the
    // source of truth until a GET /api/mobile/v1/user/strava/status route
    // exists. Avoid firing a request that would always 404.
    logger.debug(
      '[StravaStatus] refreshFromServer is a no-op; no server endpoint yet.',
    );
  }
}

class StravaStatusState {
  const StravaStatusState({
    this.isConnected = false,
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
