import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/widgets/training_paces_card.dart';

void main() {
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

  Widget buildTestWidget(AnalyticsStats stats) {
    return ProviderScope(
      overrides: [
        analyticsStatsProvider.overrideWith((ref) async => stats),
      ],
      child: MaterialApp(
        theme: buildDarkTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(child: TrainingPacesCard()),
        ),
      ),
    );
  }

  Widget buildLoadingWidget() {
    return ProviderScope(
      overrides: [
        analyticsStatsProvider.overrideWith(
          (ref) => Completer<AnalyticsStats>().future,
        ),
      ],
      child: MaterialApp(
        theme: buildDarkTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(child: TrainingPacesCard()),
        ),
      ),
    );
  }

  Widget buildErrorWidget() {
    return ProviderScope(
      overrides: [
        analyticsStatsProvider.overrideWith(
          (ref) async => throw Exception('fail'),
        ),
      ],
      child: MaterialApp(
        theme: buildDarkTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(child: TrainingPacesCard()),
        ),
      ),
    );
  }

  group('TrainingPacesCard', () {
    testWidgets('renders nothing when loading', (tester) async {
      await tester.pumpWidget(buildLoadingWidget());
      await tester.pump();

      expect(find.byType(TrainingPacesCard), findsOneWidget);
      expect(find.text('Training Paces & Heart Rate'), findsNothing);
    });

    testWidgets('renders nothing on error', (tester) async {
      await tester.pumpWidget(buildErrorWidget());
      await tester.pumpAndSettle();

      expect(find.text('Training Paces & Heart Rate'), findsNothing);
    });

    testWidgets('renders nothing when vdot is zero', (tester) async {
      const zeroStats = AnalyticsStats(
        currentWeekMileage: 0,
        effectiveVO2max: 0,
        rawVO2max: 0,
        vdotCorrectionFactor: 1.0,
        marathonShape: 0,
        currentVdot: null,
        ctl: 0,
        atl: 0,
        tsb: 0,
        workloadRatio: 0,
        easyTrimp: 0,
        hrMax: 0,
      );
      await tester.pumpWidget(buildTestWidget(zeroStats));
      await tester.pumpAndSettle();

      expect(find.text('Training Paces & Heart Rate'), findsNothing);
    });

    testWidgets('renders pace zones with valid data', (tester) async {
      await tester.pumpWidget(buildTestWidget(testStats));
      await tester.pumpAndSettle();

      expect(find.text('Training Paces & Heart Rate'), findsOneWidget);
      expect(find.text('EASY (E)'), findsOneWidget);
      expect(find.text('MARATHON (M)'), findsOneWidget);
      expect(find.text('THRESHOLD (T)'), findsOneWidget);
      expect(find.text('INTERVAL (I)'), findsOneWidget);
      expect(find.text('REPETITION (R)'), findsOneWidget);
    });

    testWidgets('shows VDOT value in header', (tester) async {
      await tester.pumpWidget(buildTestWidget(testStats));
      await tester.pumpAndSettle();

      expect(find.text('VDOT 52.1'), findsOneWidget);
    });

    testWidgets('shows heart rate ranges when hrMax is set', (tester) async {
      await tester.pumpWidget(buildTestWidget(testStats));
      await tester.pumpAndSettle();

      expect(find.textContaining('bpm'), findsWidgets);
      expect(find.textContaining('HRmax'), findsWidgets);
    });

    testWidgets('shows pace values with /km format', (tester) async {
      await tester.pumpWidget(buildTestWidget(testStats));
      await tester.pumpAndSettle();

      expect(find.textContaining('/km'), findsWidgets);
    });

    testWidgets('uses effectiveVO2max for paces', (tester) async {
      const statsWithVdot = AnalyticsStats(
        currentWeekMileage: 42.5,
        effectiveVO2max: 52.3,
        rawVO2max: 51.0,
        vdotCorrectionFactor: 1.0,
        marathonShape: 70,
        currentVdot: 55.0,
        ctl: 45.0,
        atl: 30.0,
        tsb: 15.0,
        workloadRatio: 1.2,
        easyTrimp: 100.0,
        hrMax: 190,
      );
      await tester.pumpWidget(buildTestWidget(statsWithVdot));
      await tester.pumpAndSettle();

      expect(find.text('VDOT 52.3'), findsOneWidget);
    });

    testWidgets('shows dash when hrMax is zero', (tester) async {
      const noHrStats = AnalyticsStats(
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
        hrMax: 0,
      );
      await tester.pumpWidget(buildTestWidget(noHrStats));
      await tester.pumpAndSettle();

      expect(find.text('65-79% HRmax'), findsOneWidget);
      expect(find.text('-'), findsWidgets);
    });

    testWidgets('shows easy pace range with two values', (tester) async {
      await tester.pumpWidget(buildTestWidget(testStats));
      await tester.pumpAndSettle();

      final paceText = find.textContaining(RegExp(r'\d+:\d+.*–.*\d+:\d+'));
      expect(paceText, findsWidgets);
    });
  });
}
