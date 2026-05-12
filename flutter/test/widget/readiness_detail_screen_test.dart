import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/readiness_detail_screen.dart';

class _FakeReadinessNotifier extends ReadinessNotifier {
  _FakeReadinessNotifier(this._record);

  final DailyReadinessRecord? _record;

  @override
  Future<DailyReadinessRecord?> build() => SynchronousFuture(_record);

  @override
  Future<void> refresh() async {}

  @override
  Future<void> saveSubjectiveInput(SubjectiveInput input) async {}

  @override
  Future<void> acceptAdaptation(String workoutId) async {}

  @override
  Future<void> overrideHarder(String? note) async {}

  @override
  Future<void> overrideEasier(String? note) async {}
}

DailyReadinessRecord _testRecord() => DailyReadinessRecord(
      date: DateTime(2024, 6, 15),
      componentScores: const [
        ComponentScore(
          component: ReadinessComponent.hrr,
          score: 65,
          isAvailable: true,
        ),
        ComponentScore(
          component: ReadinessComponent.sleep,
          score: 72,
          isAvailable: true,
        ),
        ComponentScore(
          component: ReadinessComponent.load,
          score: 58,
          isAvailable: true,
        ),
        ComponentScore(
          component: ReadinessComponent.subjective,
          score: 0,
          isAvailable: false,
        ),
      ],
      compositeScore: 65,
      state: ReadinessState.good,
      confidence: DataConfidence.full,
      reasons: const [
        'RHR within normal range',
        'Good sleep quality',
      ],
      rhr: const RhrMetrics(
        todayRhr: 52,
        baselineRhr: 48,
        rhrDelta: 4,
      ),
      sleep: const SleepMetrics(
        totalDurationMinutes: 450,
        deepPercent: 18,
        remPercent: 22,
      ),
      load: const LoadMetrics(
        todayTrimp: 85,
        atl: 62,
        ctl: 78,
        tsb: 16,
        workloadRatio: 0.8,
      ),
    );

List<Object> _defaultOverrides({DailyReadinessRecord? record}) {
  return [
    // ignore: deprecated_member_use
    readinessProvider.overrideWith(() => _FakeReadinessNotifier(record)),
    readinessHistoryProvider.overrideWith(
      (ref, range) => <DailyReadinessRecord>[],
    ),
  ];
}

Future<void> _pumpAndSettle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}

void main() {
  group('ReadinessDetailScreen', () {
    testWidgets('renders score and state label', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);

      expect(find.text('Morning Readiness'), findsOneWidget);
      expect(find.text('65'), findsWidgets);
      expect(find.text('Good'), findsOneWidget);
      expect(find.text('Full'), findsOneWidget);
    });

    testWidgets('renders component breakdown', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);

      expect(find.text('HRR'), findsOneWidget);
      expect(find.text('Sleep'), findsOneWidget);
      expect(find.text('Load'), findsOneWidget);
      expect(find.text('Feel'), findsOneWidget);
    });

    testWidgets('renders RHR details', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);

      expect(find.textContaining('52 bpm'), findsOneWidget);
      expect(find.textContaining('48 bpm'), findsOneWidget);
    });

    testWidgets('renders reasons section', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);

      expect(find.text('Reasons'), findsOneWidget);
      expect(find.text('RHR within normal range'), findsOneWidget);
      expect(find.text('Good sleep quality'), findsOneWidget);
    });

    testWidgets('shows no history placeholder on empty data',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -600),
      );
      await tester.pumpAndSettle();

      expect(find.text('No history yet'), findsOneWidget);
    });

    testWidgets('history chart does not crash with empty data',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -600),
      );
      await tester.pumpAndSettle();

      expect(find.text('7-Day History'), findsOneWidget);
    });

    testWidgets('shows override buttons', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -1200),
      );
      await tester.pumpAndSettle();

      expect(find.text('Override'), findsOneWidget);
      expect(find.text('Harder'), findsOneWidget);
      expect(find.text('Easier'), findsOneWidget);
    });

    testWidgets('shows subjective feel input when not entered',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -1200),
      );
      await tester.pumpAndSettle();

      expect(find.text('How do you feel?'), findsOneWidget);
      expect(find.text('Submit'), findsOneWidget);
      expect(find.byType(Slider), findsOneWidget);
    });

    testWidgets('shows empty state when no record', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: null).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);

      expect(find.text('No readiness data'), findsOneWidget);
      expect(find.text('Refresh'), findsWidgets);
    });

    testWidgets('shows footer with refresh button', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: _defaultOverrides(record: _testRecord()).cast(),
          child: const MaterialApp(
            home: ReadinessDetailScreen(),
          ),
        ),
      );
      await _pumpAndSettle(tester);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, -1500),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.sync), findsOneWidget);
    });
  });
}
