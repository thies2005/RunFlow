import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/widgets/charts/hr_zone_distribution_chart.dart';

void main() {
  Widget buildTestWidget(List<int> zoneTimes) {
    return MaterialApp(
      theme: buildDarkTheme(),
      home: Scaffold(
        body: SingleChildScrollView(
          child: HrZoneDistributionChart(zoneTimes: zoneTimes),
        ),
      ),
    );
  }

  group('HrZoneDistributionChart', () {
    testWidgets('renders nothing when all zone times are zero',
        (tester) async {
      await tester.pumpWidget(buildTestWidget([0, 0, 0, 0, 0, 0, 0]));
      await tester.pumpAndSettle();

      expect(find.text('HR Zone Distribution'), findsNothing);
    });

    testWidgets('renders nothing with empty list', (tester) async {
      await tester.pumpWidget(buildTestWidget([]));
      await tester.pumpAndSettle();

      expect(find.text('HR Zone Distribution'), findsNothing);
    });

    testWidgets('renders chart with zone data', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([300, 600, 900, 400, 200, 100, 50]),
      );
      await tester.pumpAndSettle();

      expect(find.text('HR Zone Distribution'), findsOneWidget);
    });

    testWidgets('shows zone labels for zones with time', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([300, 600, 900, 400, 200, 0, 0]),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Z1 Recovery'), findsOneWidget);
      expect(find.textContaining('Z2 Aerobic'), findsOneWidget);
      expect(find.textContaining('Z3 Tempo'), findsOneWidget);
      expect(find.textContaining('Z4 Threshold'), findsOneWidget);
      expect(find.textContaining('Z5 VO2max'), findsOneWidget);
    });

    testWidgets('hides labels for zones with zero time', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([0, 600, 0, 400, 0, 0, 0]),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Z1 Recovery'), findsNothing);
      expect(find.textContaining('Z2 Aerobic'), findsOneWidget);
      expect(find.textContaining('Z3 Tempo'), findsNothing);
      expect(find.textContaining('Z4 Threshold'), findsOneWidget);
    });

    testWidgets('shows percentage labels in legend', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([500, 500, 0, 0, 0, 0, 0]),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Z1 Recovery'), findsOneWidget);
      expect(find.textContaining('50%'), findsWidgets);
    });

    testWidgets('handles single zone with all time', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([1000, 0, 0, 0, 0, 0, 0]),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Z1 Recovery'), findsOneWidget);
      expect(find.textContaining('100%'), findsOneWidget);
    });

    testWidgets('renders with partial zone data', (tester) async {
      await tester.pumpWidget(buildTestWidget([100, 200, 300]));
      await tester.pumpAndSettle();

      expect(find.text('HR Zone Distribution'), findsOneWidget);
    });

    testWidgets('shows correct percentage for each zone', (tester) async {
      await tester.pumpWidget(
        buildTestWidget([300, 700, 0, 0, 0, 0, 0]),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Z1 Recovery'), findsOneWidget);
      expect(find.textContaining('30%'), findsOneWidget);
      expect(find.textContaining('Z2 Aerobic'), findsOneWidget);
      expect(find.textContaining('70%'), findsOneWidget);
    });
  });
}
