import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/health_screen.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';
import 'package:runflow_flutter/services/health_sync_service.dart';

class _FakeReadinessNotifier extends ReadinessNotifier {
  _FakeReadinessNotifier(this._record);

  final DailyReadinessRecord? _record;
  bool refreshCalled = false;

  @override
  Future<DailyReadinessRecord?> build() => SynchronousFuture(_record);

  @override
  Future<void> refresh() async {
    refreshCalled = true;
  }

  @override
  Future<void> saveSubjectiveInput(SubjectiveInput input) async {}

  @override
  Future<void> acceptAdaptation(String workoutId) async {}

  @override
  Future<void> overrideHarder(String? note) async {}

  @override
  Future<void> overrideEasier(String? note) async {}
}

class _FakeNutritionNotifier extends NutritionNotifier {
  _FakeNutritionNotifier(this._log);

  final NutritionLog _log;

  @override
  Future<NutritionLog> build(DateTime date) => SynchronousFuture(_log);

  @override
  Future<void> save(NutritionLog log) async {}
}

class _FakeSupplementList extends SupplementList {
  _FakeSupplementList(this._items);

  final List<Supplement> _items;

  @override
  Future<List<Supplement>> build() => SynchronousFuture(_items);

  @override
  Future<void> toggle(String id) async {}

  @override
  Future<void> add(Supplement supplement) async {}
}

class _FakeFasting extends Fasting {
  _FakeFasting(this._session);

  final FastingSession? _session;

  @override
  Future<FastingSession?> build() => SynchronousFuture(_session);

  @override
  Future<void> start() async {}

  @override
  Future<void> stop() async {}
}

class _FakeHealthConnectService implements HealthConnectService {
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<bool> requestPermissions() async => false;
  @override
  Future<List<Activity>> readActivities() async => [];
  @override
  Future<List<HealthDataPoint>> readHeartRate() async => [];
  @override
  Future<List<HealthDataPoint>> readSteps() async => [];
  @override
  Future<List<HealthDataPoint>> readActiveCalories(
    DateTime start,
    DateTime end,
  ) async => [];
  @override
  Future<List<HealthDataPoint>> readWeight(
    DateTime start,
    DateTime end,
  ) async => [];
  @override
  Future<double?> readLatestWeight() async => null;
  @override
  Future<List<NutritionHealthEntry>> readNutrition(
    DateTime start,
    DateTime end,
  ) async => [];
  @override
  Future<bool> writeNutritionEntry(FoodLogEntry entry, DateTime date) async =>
      false;
  @override
  Future<bool> deleteNutritionEntry(String clientRecordId) async => false;
  @override
  Future<VitalsData> readVitals() async => const VitalsData();
  @override
  Future<SleepData> readSleep() async => const SleepData();
  @override
  Future<Map<String, double>> readRestingHeartRateHistory(int days) async => {};
  @override
  Future<Map<String, SleepDayData>> readSleepHistory(int days) async => {};
}

NutritionLog _testNutritionLog() => NutritionLog(
  id: 1,
  date: DateTime(2024, 6, 15),
  calories: 2000,
  protein: 100,
  carbs: 250,
  fat: 55,
  water: 2.5,
  createdAt: DateTime(2024, 6, 15),
);

DailyReadinessRecord _testReadinessRecord() => DailyReadinessRecord(
  date: DateTime(2024, 6, 15),
  componentScores: const [
    ComponentScore(
      component: ReadinessComponent.hrr,
      score: 72,
      isAvailable: true,
    ),
    ComponentScore(
      component: ReadinessComponent.sleep,
      score: 80,
      isAvailable: true,
    ),
    ComponentScore(
      component: ReadinessComponent.load,
      score: 60,
      isAvailable: true,
    ),
    ComponentScore(
      component: ReadinessComponent.subjective,
      score: 0,
      isAvailable: false,
    ),
  ],
  compositeScore: 71,
  state: ReadinessState.good,
  confidence: DataConfidence.full,
  reasons: const ['RHR within normal range', 'Good sleep quality'],
  rhr: const RhrMetrics(todayRhr: 50, baselineRhr: 48, rhrDelta: 2),
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

Future<void> _pumpAndSettle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}

List<Object> _defaultOverrides({_FakeReadinessNotifier? readinessNotifier}) {
  return [
    // ignore: deprecated_member_use
    nutritionProvider.overrideWith(
      () => _FakeNutritionNotifier(_testNutritionLog()),
    ),
    // ignore: deprecated_member_use
    supplementListProvider.overrideWith(() => _FakeSupplementList([])),
    // ignore: deprecated_member_use
    fastingProvider.overrideWith(() => _FakeFasting(null)),
    fastingHistoryProvider.overrideWithValue(const AsyncValue.data([])),
    bodyMeasurementsProvider.overrideWithValue(const AsyncValue.data([])),
    healthSyncServiceProvider.overrideWith((ref) {
      return HealthSyncService(
        healthConnect: _FakeHealthConnectService(),
        apiRepo: HealthApiRepositoryImpl(dio: Dio()),
      );
    }),
    // ignore: deprecated_member_use
    readinessProvider.overrideWith(
      () => readinessNotifier ?? _FakeReadinessNotifier(_testReadinessRecord()),
    ),
    readinessHistoryProvider.overrideWith(
      (ref, range) => <DailyReadinessRecord>[],
    ),
  ];
}

Widget _testWidget(List<Object> overrides) {
  return ProviderScope(
    overrides: overrides.cast(),
    child: const MaterialApp(
      localizationsDelegates: [
        S.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: S.supportedLocales,
      home: HealthScreen(),
    ),
  );
}

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/shared_preferences'),
          (MethodCall methodCall) async {
            if (methodCall.method == 'getAll') {
              return <String, Object>{};
            }
            return null;
          },
        );
  });

  group('Readiness Integration', () {
    testWidgets('renders readiness card on health screen', (tester) async {
      await tester.pumpWidget(_testWidget(_defaultOverrides()));
      await _pumpAndSettle(tester);

      expect(find.text('Readiness'), findsOneWidget);
    });

    testWidgets('renders readiness score and state when data available', (
      tester,
    ) async {
      await tester.pumpWidget(_testWidget(_defaultOverrides()));
      await _pumpAndSettle(tester);

      expect(find.text('71'), findsOneWidget);
      expect(find.text('Good'), findsOneWidget);
    });

    testWidgets('renders component minis in readiness card', (tester) async {
      await tester.pumpWidget(_testWidget(_defaultOverrides()));
      await _pumpAndSettle(tester);

      expect(find.text('HRR'), findsOneWidget);
      expect(find.text('Load'), findsOneWidget);
      expect(find.text('Feel'), findsOneWidget);
    });

    testWidgets('shows unavailable card when readiness is null', (
      tester,
    ) async {
      final notifier = _FakeReadinessNotifier(null);
      await tester.pumpWidget(
        _testWidget(_defaultOverrides(readinessNotifier: notifier)),
      );
      await _pumpAndSettle(tester);

      expect(find.text('Readiness'), findsOneWidget);
      expect(find.text('Check your readiness'), findsOneWidget);
      expect(find.text('Check'), findsOneWidget);
    });

    testWidgets('pull-to-refresh rebuilds readiness card', (tester) async {
      await tester.pumpWidget(_testWidget(_defaultOverrides()));
      await _pumpAndSettle(tester);

      expect(find.text('71'), findsOneWidget);

      await tester.fling(
        find.byType(CustomScrollView),
        const Offset(0, 300),
        1000,
      );
      await tester.pump();
      await _pumpAndSettle(tester);

      expect(find.text('Readiness'), findsOneWidget);
    });

    testWidgets('readiness card is first content below app bar', (
      tester,
    ) async {
      await tester.pumpWidget(_testWidget(_defaultOverrides()));
      await _pumpAndSettle(tester);

      final readinessCard = find.text('Readiness');
      expect(readinessCard, findsOneWidget);

      final nutritionCard = find.text('Nutrition');
      expect(nutritionCard, findsOneWidget);

      final readinessY = tester.getTopLeft(readinessCard).dy;
      final nutritionY = tester.getTopLeft(nutritionCard).dy;

      expect(readinessY, lessThan(nutritionY));
    });
  });
}
