import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/connectivity_helper.dart';

void main() {
  group('isOnlineProvider', () {
    test('returns true when connected to wifi', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider
              .overrideWithValue(const AsyncValue.data([ConnectivityResult.wifi])),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, true);
    });

    test('returns true when connected to mobile', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider.overrideWithValue(
              const AsyncValue.data([ConnectivityResult.mobile])),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, true);
    });

    test('returns false when no connectivity', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider
              .overrideWithValue(const AsyncValue.data([ConnectivityResult.none])),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, false);
    });

    test('returns true when loading', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider.overrideWithValue(const AsyncValue.loading()),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, true);
    });

    test('returns true on error', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider.overrideWithValue(
            AsyncValue.error(Exception('test'), StackTrace.empty),
          ),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, true);
    });

    test('returns true when connected to ethernet', () {
      final container = ProviderContainer(
        overrides: [
          connectivityProvider.overrideWithValue(
              const AsyncValue.data([ConnectivityResult.ethernet])),
        ],
      );

      final isOnline = container.read(isOnlineProvider);
      expect(isOnline, true);
    });
  });
}
