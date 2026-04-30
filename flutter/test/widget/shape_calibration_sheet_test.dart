import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/calibration_providers.dart';
import 'package:runflow_flutter/presentation/widgets/shape_calibration_sheet.dart';

const testStats = AnalyticsStats(
  currentWeekMileage: 42.5,
  effectiveVO2max: 52.3,
  rawVO2max: 51.0,
  vdotCorrectionFactor: 1.0,
  marathonShape: 70,
  currentVdot: 52.1,
  ctl: 45.0,
  atl: 30.0,
  tsb: 15.0,
  workloadRatio: 1.2,
  easyTrimp: 100.0,
  hrMax: 190,
);

void main() {
  Widget buildTestWidget() {
    return MaterialApp(
      theme: buildDarkTheme(),
      home: Scaffold(
        body: ProviderScope(
          overrides: [
            calibrationProvider.overrideWith(() => Calibration()),
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            activitiesProvider.overrideWith(() => _FakeActivities()),
          ],
          child: const ShapeCalibrationSheet(),
        ),
      ),
    );
  }

  group('ShapeCalibrationSheet', () {
    testWidgets('renders calibration header', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Calibration'), findsOneWidget);
      expect(find.byIcon(Icons.calculate), findsOneWidget);
    });

    testWidgets('renders close button', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.close), findsOneWidget);
    });

    testWidgets('renders three mode tabs', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('VDOT Correction'), findsOneWidget);
      expect(find.text('Shape Factor'), findsOneWidget);
      expect(find.text('Manual'), findsOneWidget);
    });

    testWidgets('default mode is VDOT Correction', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Calibrate your global Effective VO2max'),
        findsOneWidget,
      );
    });

    testWidgets('tapping Shape Factor tab switches mode', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final shapeFactorTabs = find.text('Shape Factor');
      await tester.tap(shapeFactorTabs.first);
      await tester.pumpAndSettle();

      expect(
        find.text('Enter a long-distance race to calibrate the shape penalty.'),
        findsOneWidget,
      );
    });

    testWidgets('tapping Manual tab shows slider', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final manualTabs = find.text('Manual');
      await tester.tap(manualTabs.first);
      await tester.pumpAndSettle();

      expect(find.byType(Slider), findsOneWidget);
      expect(
        find.textContaining('1.0 = Slower than predicted'),
        findsOneWidget,
      );
    });

    testWidgets('renders Cancel and Apply buttons', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Apply Calibration'), findsOneWidget);
    });

    testWidgets('VDOT correction tab shows time inputs', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.byType(TextFormField), findsWidgets);
    });

    testWidgets('Shape Factor tab shows race chips', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final shapeFactorTabs = find.text('Shape Factor');
      await tester.tap(shapeFactorTabs.first);
      await tester.pumpAndSettle();

      expect(find.text('Marathon'), findsOneWidget);
      expect(find.text('Half Marathon'), findsOneWidget);
    });

    testWidgets('Manual tab shows slider with text input', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final manualTabs = find.text('Manual');
      await tester.tap(manualTabs.first);
      await tester.pumpAndSettle();

      expect(find.byType(Slider), findsOneWidget);
      final textFields = tester.widgetList<TextFormField>(
        find.byType(TextFormField),
      );
      expect(textFields.length, greaterThanOrEqualTo(1));
    });
  });
}

class _FakeActivities extends Activities {
  @override
  Future<ActivitiesState> build() async {
    return const ActivitiesState(
      activities: [],
      hasMore: false,
      isLoadingMore: false,
      filterType: null,
    );
  }
}
