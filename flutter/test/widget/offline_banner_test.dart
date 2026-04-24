import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/connectivity_helper.dart';
import 'package:runflow_flutter/presentation/widgets/offline_banner.dart';

void main() {
  group('OfflineBanner', () {
    testWidgets('is hidden when online', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            connectivityProvider
                .overrideWithValue(const AsyncValue.data([ConnectivityResult.wifi])),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Column(
                children: [OfflineBanner(), Text('Content')],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('You are offline. Showing cached data.'), findsNothing);
      expect(find.text('Content'), findsOneWidget);
    });

    testWidgets('is visible when offline', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            connectivityProvider.overrideWithValue(
                const AsyncValue.data([ConnectivityResult.none])),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Column(
                children: [OfflineBanner(), Text('Content')],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('You are offline. Showing cached data.'), findsOneWidget);
      expect(find.text('Content'), findsOneWidget);
    });

    testWidgets('contains accessibility text when offline', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            connectivityProvider.overrideWithValue(
                const AsyncValue.data([ConnectivityResult.none])),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: Column(
                children: [OfflineBanner()],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('You are offline. Showing cached data.'), findsOneWidget);
    });
  });
}
