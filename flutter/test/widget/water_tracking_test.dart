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

  Widget buildTestWidget({double water = 1.0}) {
    return ProviderScope(
      overrides: [
        // ignore: deprecated_member_use
        nutritionProvider.overrideWith(
          () => _FakeNutritionNotifier(
              AsyncValue.data(_testNutritionLog(water: water))),
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
    );
  }

  void main() {
  group('Water Tracking', () {
    testWidgets('renders water intake section with progress',
        (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(water: 1.0));
      await tester.pumpAndSettle();

      expect(find.text('Water Intake'), findsOneWidget);
      expect(find.text('1000ml / 2000ml'), findsOneWidget);
      expect(find.text('+250ml'), findsOneWidget);
      expect(find.text('Manual'), findsOneWidget);
    });

    testWidgets('shows full progress when target met',
        (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(water: 2.5));
      await tester.pumpAndSettle();

      expect(find.text('Water Intake'), findsOneWidget);
      expect(find.text('2500ml / 2000ml'), findsOneWidget);
    });

    testWidgets('shows zero water intake', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget(water: 0.0));
      await tester.pumpAndSettle();

      expect(find.text('Water Intake'), findsOneWidget);
      expect(find.text('0ml / 2000ml'), findsOneWidget);
    });

    testWidgets('shows scan button in nutrition tab',
        (WidgetTester tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Scan'), findsOneWidget);
      expect(find.text('Add Food'), findsOneWidget);
    });
  });
}
