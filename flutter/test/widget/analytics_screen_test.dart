import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/remote/dio_client.dart';
import 'package:runflow_flutter/domain/entities/analytics_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/analytics/analytics_screen.dart';

import '../helpers/test_analytics_data.dart';

void main() {
  group('AnalyticsScreen', () {
    late AnalyticsStats testStats;
    late List<FitnessHistory> testHistory;

    setUp(() {
      testStats = const AnalyticsStats(
        currentWeekMileage: 42.5,
        effectiveVO2max: 52.3,
        rawVO2max: 51.0,
        vdotCorrectionFactor: 1.02,
        marathonShape: 6.5,
        currentVdot: 52.1,
        ctl: 45.0,
        atl: 30.0,
        tsb: 15.0,
        workloadRatio: 1.2,
        easyTrimp: 100.0,
        hrMax: 190,
      );
      testHistory = TestAnalyticsData.createHistory(days: 30);
    });

    Future<void> pumpAnimated(WidgetTester tester) async {
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 250));
      }
    }

    testWidgets('renders analytics content with data',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await pumpAnimated(tester);

      expect(find.text('Endurance'), findsOneWidget);
      expect(find.text('Strength'), findsOneWidget);
      expect(find.text('VDOT'), findsOneWidget);
      expect(find.text('CTL'), findsWidgets);
      expect(find.text('ATL'), findsWidgets);
      expect(find.text('TSB'), findsWidgets);
    });

    testWidgets('shows date range selector', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await pumpAnimated(tester);

      expect(find.text('30D'), findsOneWidget);
      expect(find.text('60D'), findsOneWidget);
      expect(find.text('90D'), findsOneWidget);
      expect(find.text('1Y'), findsOneWidget);
    });

    testWidgets('shows loading skeleton', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await tester.pump();

      expect(find.byType(Scaffold), findsOneWidget);
    });

    testWidgets('shows error state with retry button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsStatsProvider.overrideWithValue(
              AsyncValue.error(Exception('Network error'), StackTrace.current),
            ),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('displays marathon shape after scrolling',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await pumpAnimated(tester);

      final gestures = find.byType(Scrollable);
      for (var i = 0; i < 15; i++) {
        await tester.fling(gestures.first, const Offset(0, -300), 500);
        await tester.pumpAndSettle();
        if (find.text('Calibrate').evaluate().isNotEmpty) break;
      }

      expect(find.text('Calibrate'), findsOneWidget);
    });

    testWidgets('displays weekly mileage after scrolling',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            dioClientProvider.overrideWithValue(DioClient(dio: Dio())),
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            analyticsHistoryProvider.overrideWith(
              (ref, arg) async => testHistory,
            ),
            selectedDateRangeProvider.overrideWith(() => _FakeDateRange()),
            racePredictionsProvider.overrideWith((ref) async => {}),
          ],
          child: _localizedApp(const AnalyticsScreen()),
        ),
      );
      await pumpAnimated(tester);

      final target = find.text('Weekly Mileage');
      await tester.scrollUntilVisible(
        target,
        500,
        scrollable: find.byType(Scrollable).first,
      );
      await pumpAnimated(tester);

      expect(target, findsOneWidget);
    });
  });
}

Widget _localizedApp(Widget home) {
  return MaterialApp(
    localizationsDelegates: const [
      S.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: S.supportedLocales,
    home: home,
  );
}

class _FakeDateRange extends SelectedDateRange {
  @override
  int build() => 30;

  @override
  set state(int value) {}

  @override
  void setDays(int days) {}
}
