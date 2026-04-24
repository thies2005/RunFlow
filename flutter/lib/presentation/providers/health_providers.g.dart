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

@ProviderFor(supplements)
final supplementsProvider = SupplementsProvider._();

final class SupplementsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Supplement>>,
          List<Supplement>,
          FutureOr<List<Supplement>>
        >
    with $FutureModifier<List<Supplement>>, $FutureProvider<List<Supplement>> {
  SupplementsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'supplementsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$supplementsHash();

  @$internal
  @override
  $FutureProviderElement<List<Supplement>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Supplement>> create(Ref ref) {
    return supplements(ref);
  }
}

String _$supplementsHash() => r'67162666b6188a306f0a2ae4ba8029e4bc891275';

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
        isAutoDispose: true,
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

String _$bodyMeasurementsHash() => r'0db6bac0ce9e5489559cf46a8eea83c549e420da';

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

String _$fastingHash() => r'd208b1eedfb9edb13654037ae21b2fc3972bf31f';

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
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$supplementListHash();

  @$internal
  @override
  SupplementList create() => SupplementList();
}

String _$supplementListHash() => r'99c1c1c6c95c03b0993287451772723b2f6e216a';

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

String _$nutritionNotifierHash() => r'a2631bcb930029a39f377feedcec6a2ea65f75b2';

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
