import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/screens/health/health_screen.dart';

class _FakeNutritionNotifier extends NutritionNotifier {
  _FakeNutritionNotifier(this.fakeState);

  final AsyncValue<NutritionLog> fakeState;

  @override
  AsyncValue<NutritionLog> get state => fakeState;

  @override
  set state(AsyncValue<NutritionLog> value) {}

  @override
  Future<NutritionLog> build(DateTime date) async {
    return fakeState.value!;
  }

  @override
  Future<void> save(NutritionLog log) async {}
}

class _FakeSupplementList extends SupplementList {
  _FakeSupplementList(this.fakeState);

  final AsyncValue<List<Supplement>> fakeState;

  @override
  AsyncValue<List<Supplement>> get state => fakeState;

  @override
  set state(AsyncValue<List<Supplement>> value) {}

  @override
  Future<List<Supplement>> build() async {
    return fakeState.value!;
  }

  @override
  Future<void> toggle(int id) async {}

  @override
  Future<void> add(Supplement supplement) async {}
}

class _FakeFasting extends Fasting {
  _FakeFasting(this.fakeState);

  final AsyncValue<FastingSession?> fakeState;

  @override
  AsyncValue<FastingSession?> get state => fakeState;

  @override
  set state(AsyncValue<FastingSession?> value) {}

  @override
  Future<FastingSession?> build() async {
    return fakeState.value;
  }

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

void main() {
  group('HealthScreen', () {
    testWidgets('renders tab bar with all tabs', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(const AsyncValue.data([])),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Health'), findsOneWidget);
      expect(find.text('Nutrition'), findsOneWidget);
      expect(find.text('Supplements'), findsOneWidget);
      expect(find.text('Fasting'), findsOneWidget);
      expect(find.text('Body'), findsOneWidget);
    });

    testWidgets('nutrition tab shows daily nutrition', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(const AsyncValue.data([])),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Daily Nutrition'), findsOneWidget);
      expect(find.text('Calories'), findsOneWidget);
      expect(find.text('Protein (g)'), findsOneWidget);
      expect(find.text('Carbs (g)'), findsOneWidget);
      expect(find.text('Add Food'), findsOneWidget);
      expect(find.text('Water Intake'), findsOneWidget);
    });

    testWidgets('supplements tab shows empty state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(const AsyncValue.data([])),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Supplements'));
      await tester.pumpAndSettle();

      expect(find.text('No supplements yet'), findsOneWidget);
      expect(find.text('Add Supplement'), findsOneWidget);
    });

    testWidgets('supplements tab shows supplements', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(
                const AsyncValue.data([
                  Supplement(
                    id: 1,
                    name: 'Vitamin D',
                    dosage: '2000 IU',
                    frequency: 'Daily',
                    isActive: true,
                  ),
                ]),
              ),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Supplements'));
      await tester.pumpAndSettle();

      expect(find.text('Vitamin D'), findsOneWidget);
      expect(find.text('2000 IU - Daily'), findsOneWidget);
    });

    testWidgets('fasting tab shows start button when not fasting', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(const AsyncValue.data([])),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Fasting'));
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await tester.pump(const Duration(milliseconds: 500));

      expect(find.text('Not fasting'), findsOneWidget);
    });

    testWidgets('body tab shows empty state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            // ignore: deprecated_member_use
            nutritionProvider.overrideWith(
              () => _FakeNutritionNotifier(AsyncValue.data(_testNutritionLog())),
            ),
            // ignore: deprecated_member_use
            supplementListProvider.overrideWith(
              () => _FakeSupplementList(const AsyncValue.data([])),
            ),
            // ignore: deprecated_member_use
            fastingProvider.overrideWith(
              () => _FakeFasting(const AsyncValue.data(null)),
            ),
            fastingHistoryProvider
                .overrideWithValue(const AsyncValue.data([])),
            bodyMeasurementsProvider
                .overrideWithValue(const AsyncValue.data([])),
          ],
          child: const MaterialApp(
            home: HealthScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Body'));
      await tester.pumpAndSettle();

      expect(find.text('No measurements yet'), findsOneWidget);
      expect(find.text('Add First Measurement'), findsOneWidget);
    });
  });
}
