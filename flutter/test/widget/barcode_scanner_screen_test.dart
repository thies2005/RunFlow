import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/barcode_scanner_screen.dart';

class _FakeBarcodeScanData extends BarcodeScan {
  _FakeBarcodeScanData(this.value);
  final FoodItem? value;

  @override
  FutureOr<FoodItem?> build() => value;
}

class _FakeBarcodeScanLoading extends BarcodeScan {
  @override
  FutureOr<FoodItem?> build() =>
      Future<FoodItem?>.delayed(const Duration(days: 1));
}

class _FakeBarcodeScanError extends BarcodeScan {
  @override
  FutureOr<FoodItem?> build() => throw Exception('Network error');
}

void main() {
  group('BarcodeScannerScreen', () {
    testWidgets('renders scan title and close button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider.overrideWith(() => _FakeBarcodeScanData(null)),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Scan Barcode'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
    });

    testWidgets('shows scanning prompt when no barcode scanned',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider.overrideWith(() => _FakeBarcodeScanData(null)),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Point camera at a barcode'), findsOneWidget);
    });

    testWidgets('shows loading indicator when scanning',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider.overrideWith(() => _FakeBarcodeScanLoading()),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsWidgets);

      await tester.pump(const Duration(hours: 25));
    });

    testWidgets('shows network error on scan failure',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider.overrideWith(() => _FakeBarcodeScanError()),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Network Error'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
