import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/barcode_scanner_screen.dart';

void main() {
  group('BarcodeScannerScreen', () {
    testWidgets('renders scan title and close button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider
                .overrideWithValue(const AsyncValue<FoodItem?>.data(null)),
          ],
          child: const MaterialApp(
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
            barcodeScanProvider
                .overrideWithValue(const AsyncValue<FoodItem?>.data(null)),
          ],
          child: const MaterialApp(
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
            barcodeScanProvider
                .overrideWithValue(const AsyncValue<FoodItem?>.loading()),
          ],
          child: const MaterialApp(
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows network error on scan failure',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            barcodeScanProvider.overrideWithValue(
              AsyncValue<FoodItem?>.error(
                  Exception('Network error'), StackTrace.empty),
            ),
          ],
          child: const MaterialApp(
            home: BarcodeScannerScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Network Error'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });
  });
}
