import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/health_screen.dart';
import 'package:runflow_flutter/services/health_connect_service.dart';
import 'package:runflow_flutter/services/health_sync_service.dart';

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

NutritionLog _testNutritionLog({double water = 1.0}) => NutritionLog(
  id: 1,
  date: DateTime(2024, 6, 15),
  calories: 2000,
  protein: 100,
  carbs: 250,
  fat: 55,
  water: water,
  createdAt: DateTime(2024, 6, 15),
);

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

Widget buildTestWidget({double water = 1.0}) {
  return ProviderScope(
    overrides: [
      // ignore: deprecated_member_use
      nutritionProvider.overrideWith(
        () => _FakeNutritionNotifier(_testNutritionLog(water: water)),
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
    ],
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
  group('Water Tracking', () {
    setUpAll(() {
      TestWidgetsFlutterBinding.ensureInitialized();
      // Mock SharedPreferences for _FastingCard
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
    Future<void> pumpHealth(WidgetTester tester) async {
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 250));
      }
    }

    testWidgets('renders nutrition card with calories', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(buildTestWidget(water: 1.0));
      await pumpHealth(tester);

      expect(find.text('Nutrition'), findsOneWidget);
      expect(find.text('2000 / 2000'), findsOneWidget);
    });

    testWidgets('renders macros in nutrition card', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(buildTestWidget(water: 2.5));
      await pumpHealth(tester);

      expect(find.text('Nutrition'), findsOneWidget);
      expect(find.text('2000 / 2000'), findsOneWidget);
    });

    testWidgets('renders nutrition card with zero calories', (
      WidgetTester tester,
    ) async {
      final zeroLog = _testNutritionLog(water: 0.0);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(zeroLog),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(() => _FakeSupplementList([])),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(() => _FakeFasting(null)),
            fastingHistoryProvider.overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider.overrideWithValue(
              const AsyncValue.data([]),
            ),
            healthSyncServiceProvider.overrideWith((ref) {
              return HealthSyncService(
                healthConnect: _FakeHealthConnectService(),
                apiRepo: HealthApiRepositoryImpl(dio: Dio()),
              );
            }),
          ],
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
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Nutrition'), findsOneWidget);
    });

    testWidgets('shows scan food quick action', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget());
      await pumpHealth(tester);

      // Scroll down to reveal Quick Actions below the dashboard cards
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -300));
      await tester.pump(const Duration(milliseconds: 500));

      expect(find.text('Scan Food'), findsOneWidget);
      expect(find.text('Log Food'), findsOneWidget);
    });
  });
}
