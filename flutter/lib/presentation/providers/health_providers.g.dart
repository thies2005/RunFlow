// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(appDatabase)
final appDatabaseProvider = AppDatabaseProvider._();

final class AppDatabaseProvider
    extends $FunctionalProvider<AppDatabase, AppDatabase, AppDatabase>
    with $Provider<AppDatabase> {
  AppDatabaseProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'appDatabaseProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$appDatabaseHash();

  @$internal
  @override
  $ProviderElement<AppDatabase> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AppDatabase create(Ref ref) {
    return appDatabase(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AppDatabase value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AppDatabase>(value),
    );
  }
}

String _$appDatabaseHash() => r'c9b315997d4620b75f971a029620ab310c5b3296';

@ProviderFor(healthRepository)
final healthRepositoryProvider = HealthRepositoryProvider._();

final class HealthRepositoryProvider
    extends
        $FunctionalProvider<
          HealthRepository,
          HealthRepository,
          HealthRepository
        >
    with $Provider<HealthRepository> {
  HealthRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthRepositoryHash();

  @$internal
  @override
  $ProviderElement<HealthRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HealthRepository create(Ref ref) {
    return healthRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HealthRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthRepository>(value),
    );
  }
}

String _$healthRepositoryHash() => r'c012cc8e7f6b645434538e1c94cf1742314335ed';

@ProviderFor(activeFasting)
final activeFastingProvider = ActiveFastingProvider._();

final class ActiveFastingProvider
    extends
        $FunctionalProvider<
          AsyncValue<FastingSession?>,
          FastingSession?,
          FutureOr<FastingSession?>
        >
    with $FutureModifier<FastingSession?>, $FutureProvider<FastingSession?> {
  ActiveFastingProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'activeFastingProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$activeFastingHash();

  @$internal
  @override
  $FutureProviderElement<FastingSession?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<FastingSession?> create(Ref ref) {
    return activeFasting(ref);
  }
}

String _$activeFastingHash() => r'0b6fa1b3ae3cf93883d33ba69cda450722f5d23a';

@ProviderFor(fastingHistory)
final fastingHistoryProvider = FastingHistoryProvider._();

final class FastingHistoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<FastingSession>>,
          List<FastingSession>,
          FutureOr<List<FastingSession>>
        >
    with
        $FutureModifier<List<FastingSession>>,
        $FutureProvider<List<FastingSession>> {
  FastingHistoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'fastingHistoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$fastingHistoryHash();

  @$internal
  @override
  $FutureProviderElement<List<FastingSession>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<FastingSession>> create(Ref ref) {
    return fastingHistory(ref);
  }
}

String _$fastingHistoryHash() => r'f80bbd498c92537468a4fde0dfb7edc461719f15';

@ProviderFor(bodyMeasurements)
final bodyMeasurementsProvider = BodyMeasurementsProvider._();

final class BodyMeasurementsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<BodyMeasurement>>,
          List<BodyMeasurement>,
          FutureOr<List<BodyMeasurement>>
        >
    with
        $FutureModifier<List<BodyMeasurement>>,
        $FutureProvider<List<BodyMeasurement>> {
  BodyMeasurementsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'bodyMeasurementsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$bodyMeasurementsHash();

  @$internal
  @override
  $FutureProviderElement<List<BodyMeasurement>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<BodyMeasurement>> create(Ref ref) {
    return bodyMeasurements(ref);
  }
}

String _$bodyMeasurementsHash() => r'a2971c548d1ffb148da0e6e7cb2ddc5d5f55170e';

@ProviderFor(dailyHealth)
final dailyHealthProvider = DailyHealthFamily._();

final class DailyHealthProvider
    extends
        $FunctionalProvider<
          AsyncValue<DailyHealthLog>,
          DailyHealthLog,
          FutureOr<DailyHealthLog>
        >
    with $FutureModifier<DailyHealthLog>, $FutureProvider<DailyHealthLog> {
  DailyHealthProvider._({
    required DailyHealthFamily super.from,
    required DateTime super.argument,
  }) : super(
         retry: null,
         name: r'dailyHealthProvider',
         isAutoDispose: false,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$dailyHealthHash();

  @override
  String toString() {
    return r'dailyHealthProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<DailyHealthLog> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<DailyHealthLog> create(Ref ref) {
    final argument = this.argument as DateTime;
    return dailyHealth(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is DailyHealthProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$dailyHealthHash() => r'b79394cabda17982903a588495e5bb2bdcc02b43';

final class DailyHealthFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<DailyHealthLog>, DateTime> {
  DailyHealthFamily._()
    : super(
        retry: null,
        name: r'dailyHealthProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: false,
      );

  DailyHealthProvider call(DateTime date) =>
      DailyHealthProvider._(argument: date, from: this);

  @override
  String toString() => r'dailyHealthProvider';
}

@ProviderFor(takenSupplementIds)
final takenSupplementIdsProvider = TakenSupplementIdsProvider._();

final class TakenSupplementIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Set<String>>,
          Set<String>,
          FutureOr<Set<String>>
        >
    with $FutureModifier<Set<String>>, $FutureProvider<Set<String>> {
  TakenSupplementIdsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'takenSupplementIdsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$takenSupplementIdsHash();

  @$internal
  @override
  $FutureProviderElement<Set<String>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Set<String>> create(Ref ref) {
    return takenSupplementIds(ref);
  }
}

String _$takenSupplementIdsHash() =>
    r'0d43d53a82eb7e2ac2c782c8a8959c9cff463275';

@ProviderFor(Fasting)
final fastingProvider = FastingProvider._();

final class FastingProvider
    extends $AsyncNotifierProvider<Fasting, FastingSession?> {
  FastingProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'fastingProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$fastingHash();

  @$internal
  @override
  Fasting create() => Fasting();
}

String _$fastingHash() => r'8948cd1625a4260bc69ec972456e81e95b28ce1f';

abstract class _$Fasting extends $AsyncNotifier<FastingSession?> {
  FutureOr<FastingSession?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<FastingSession?>, FastingSession?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<FastingSession?>, FastingSession?>,
              AsyncValue<FastingSession?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(SupplementList)
final supplementListProvider = SupplementListProvider._();

final class SupplementListProvider
    extends $AsyncNotifierProvider<SupplementList, List<Supplement>> {
  SupplementListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'supplementListProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$supplementListHash();

  @$internal
  @override
  SupplementList create() => SupplementList();
}

String _$supplementListHash() => r'0dc9223c0d9a0ca422aec6568170833c62dc194f';

abstract class _$SupplementList extends $AsyncNotifier<List<Supplement>> {
  FutureOr<List<Supplement>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<List<Supplement>>, List<Supplement>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<Supplement>>, List<Supplement>>,
              AsyncValue<List<Supplement>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(NutritionNotifier)
final nutritionProvider = NutritionNotifierFamily._();

final class NutritionNotifierProvider
    extends $AsyncNotifierProvider<NutritionNotifier, NutritionLog> {
  NutritionNotifierProvider._({
    required NutritionNotifierFamily super.from,
    required DateTime super.argument,
  }) : super(
         retry: null,
         name: r'nutritionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$nutritionNotifierHash();

  @override
  String toString() {
    return r'nutritionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  NutritionNotifier create() => NutritionNotifier();

  @override
  bool operator ==(Object other) {
    return other is NutritionNotifierProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$nutritionNotifierHash() => r'73d02247d8c7fc99eadc632271f3b0be0c11deb0';

final class NutritionNotifierFamily extends $Family
    with
        $ClassFamilyOverride<
          NutritionNotifier,
          AsyncValue<NutritionLog>,
          NutritionLog,
          FutureOr<NutritionLog>,
          DateTime
        > {
  NutritionNotifierFamily._()
    : super(
        retry: null,
        name: r'nutritionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  NutritionNotifierProvider call(DateTime date) =>
      NutritionNotifierProvider._(argument: date, from: this);

  @override
  String toString() => r'nutritionProvider';
}

abstract class _$NutritionNotifier extends $AsyncNotifier<NutritionLog> {
  late final _$args = ref.$arg as DateTime;
  DateTime get date => _$args;

  FutureOr<NutritionLog> build(DateTime date);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<NutritionLog>, NutritionLog>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<NutritionLog>, NutritionLog>,
              AsyncValue<NutritionLog>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(BarcodeScan)
final barcodeScanProvider = BarcodeScanProvider._();

final class BarcodeScanProvider
    extends $AsyncNotifierProvider<BarcodeScan, FoodItem?> {
  BarcodeScanProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'barcodeScanProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$barcodeScanHash();

  @$internal
  @override
  BarcodeScan create() => BarcodeScan();
}

String _$barcodeScanHash() => r'3cf5cf00d0cdcbc64dfbb3198297615b7cdf2912';

abstract class _$BarcodeScan extends $AsyncNotifier<FoodItem?> {
  FutureOr<FoodItem?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<FoodItem?>, FoodItem?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<FoodItem?>, FoodItem?>,
              AsyncValue<FoodItem?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(nutritionAnalytics)
final nutritionAnalyticsProvider = NutritionAnalyticsProvider._();

final class NutritionAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<NutritionAnalytics>,
          NutritionAnalytics,
          FutureOr<NutritionAnalytics>
        >
    with
        $FutureModifier<NutritionAnalytics>,
        $FutureProvider<NutritionAnalytics> {
  NutritionAnalyticsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'nutritionAnalyticsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$nutritionAnalyticsHash();

  @$internal
  @override
  $FutureProviderElement<NutritionAnalytics> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<NutritionAnalytics> create(Ref ref) {
    return nutritionAnalytics(ref);
  }
}

String _$nutritionAnalyticsHash() =>
    r'4b5c3df4cd581b733d5ba0671cb12e8a6832249f';

@ProviderFor(supplementAnalytics)
final supplementAnalyticsProvider = SupplementAnalyticsProvider._();

final class SupplementAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<SupplementAnalytics>,
          SupplementAnalytics,
          FutureOr<SupplementAnalytics>
        >
    with
        $FutureModifier<SupplementAnalytics>,
        $FutureProvider<SupplementAnalytics> {
  SupplementAnalyticsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'supplementAnalyticsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$supplementAnalyticsHash();

  @$internal
  @override
  $FutureProviderElement<SupplementAnalytics> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<SupplementAnalytics> create(Ref ref) {
    return supplementAnalytics(ref);
  }
}

String _$supplementAnalyticsHash() =>
    r'b884a426f028ab559dfbcdc27dfe0856dd645f8d';

@ProviderFor(healthHistory)
final healthHistoryProvider = HealthHistoryFamily._();

final class HealthHistoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<HealthHistory>,
          HealthHistory,
          FutureOr<HealthHistory>
        >
    with $FutureModifier<HealthHistory>, $FutureProvider<HealthHistory> {
  HealthHistoryProvider._({
    required HealthHistoryFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'healthHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$healthHistoryHash();

  @override
  String toString() {
    return r'healthHistoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HealthHistory> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HealthHistory> create(Ref ref) {
    final argument = this.argument as String;
    return healthHistory(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HealthHistoryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$healthHistoryHash() => r'e189bcf6719737695a05ed28da098ee8febe41b9';

final class HealthHistoryFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HealthHistory>, String> {
  HealthHistoryFamily._()
    : super(
        retry: null,
        name: r'healthHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HealthHistoryProvider call(String range) =>
      HealthHistoryProvider._(argument: range, from: this);

  @override
  String toString() => r'healthHistoryProvider';
}

@ProviderFor(FoodSearch)
final foodSearchProvider = FoodSearchFamily._();

final class FoodSearchProvider
    extends $AsyncNotifierProvider<FoodSearch, List<FoodItem>> {
  FoodSearchProvider._({
    required FoodSearchFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'foodSearchProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$foodSearchHash();

  @override
  String toString() {
    return r'foodSearchProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  FoodSearch create() => FoodSearch();

  @override
  bool operator ==(Object other) {
    return other is FoodSearchProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$foodSearchHash() => r'3c1f9ec515cd5effebc67d410fd20583beae831d';

final class FoodSearchFamily extends $Family
    with
        $ClassFamilyOverride<
          FoodSearch,
          AsyncValue<List<FoodItem>>,
          List<FoodItem>,
          FutureOr<List<FoodItem>>,
          String
        > {
  FoodSearchFamily._()
    : super(
        retry: null,
        name: r'foodSearchProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  FoodSearchProvider call(String query) =>
      FoodSearchProvider._(argument: query, from: this);

  @override
  String toString() => r'foodSearchProvider';
}

abstract class _$FoodSearch extends $AsyncNotifier<List<FoodItem>> {
  late final _$args = ref.$arg as String;
  String get query => _$args;

  FutureOr<List<FoodItem>> build(String query);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<List<FoodItem>>, List<FoodItem>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<FoodItem>>, List<FoodItem>>,
              AsyncValue<List<FoodItem>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(AiScan)
final aiScanProvider = AiScanProvider._();

final class AiScanProvider
    extends $NotifierProvider<AiScan, AsyncValue<FoodItem?>> {
  AiScanProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'aiScanProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$aiScanHash();

  @$internal
  @override
  AiScan create() => AiScan();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<FoodItem?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<FoodItem?>>(value),
    );
  }
}

String _$aiScanHash() => r'2eb619ab76400490ab6db1fff958458f36cf7d56';

abstract class _$AiScan extends $Notifier<AsyncValue<FoodItem?>> {
  AsyncValue<FoodItem?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<FoodItem?>, AsyncValue<FoodItem?>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<FoodItem?>, AsyncValue<FoodItem?>>,
              AsyncValue<FoodItem?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
