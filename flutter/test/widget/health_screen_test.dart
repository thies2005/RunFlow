import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/data/models/health_vitals_models.dart';
import 'package:runflow_flutter/data/repositories/health_api_repository_impl.dart';
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
  Future<List<HealthDataPoint>> readActiveCalories(DateTime start, DateTime end) async => [];
  @override
  Future<List<HealthDataPoint>> readWeight(DateTime start, DateTime end) async => [];
  @override
  Future<double?> readLatestWeight() async => null;
  @override
  Future<VitalsData> readVitals() async => const VitalsData();
  @override
  Future<SleepData> readSleep() async => SleepData();
}

void main() {
  group('HealthScreen', () {
    defaultOverrides() {
      return [
          // ignore: deprecated_member_use
          nutritionProvider.overrideWith(
            () => _FakeNutritionNotifier(_testNutritionLog()),
          ),
          // ignore: deprecated_member_use
          supplementListProvider.overrideWith(
            () => _FakeSupplementList([]),
          ),
          // ignore: deprecated_member_use
          fastingProvider.overrideWith(
            () => _FakeFasting(null),
          ),
          fastingHistoryProvider
              .overrideWithValue(const AsyncValue.data([])),
          bodyMeasurementsProvider
              .overrideWithValue(const AsyncValue.data([])),
          healthSyncServiceProvider.overrideWith((ref) {
            return HealthSyncService(
              healthConnect: _FakeHealthConnectService(),
              apiRepo: HealthApiRepositoryImpl(dio: Dio()),
            );
          }),
        ];
    }

    Future<void> pumpHealth(WidgetTester tester) async {
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 250));
      }
    }

    testWidgets('renders Health title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Health'), findsOneWidget);
    });

    testWidgets('renders Nutrition card', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Nutrition'), findsOneWidget);
    });

    testWidgets('renders Body card', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Body'), findsOneWidget);
    });

    testWidgets('renders Supplements card', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Supplements'), findsOneWidget);
    });

    testWidgets('renders Fasting card with Not fasting',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Fasting'), findsOneWidget);
      expect(find.text('Not fasting'), findsOneWidget);
    });

    testWidgets('renders Quick Actions section', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('Quick Actions'), findsOneWidget);
      expect(find.text('Scan Food'), findsOneWidget);
      expect(find.text('Log Food'), findsOneWidget);
    });

    testWidgets('shows nutrition calories and macros',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: defaultOverrides(),
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await pumpHealth(tester);

      expect(find.text('2000 / 2000'), findsOneWidget);
      expect(find.text('kcal eaten'), findsOneWidget);
    });
  });
}
