// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'analytics_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(analyticsRepository)
final analyticsRepositoryProvider = AnalyticsRepositoryProvider._();

final class AnalyticsRepositoryProvider
    extends
        $FunctionalProvider<
          AnalyticsRepository,
          AnalyticsRepository,
          AnalyticsRepository
        >
    with $Provider<AnalyticsRepository> {
  AnalyticsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'analyticsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$analyticsRepositoryHash();

  @$internal
  @override
  $ProviderElement<AnalyticsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AnalyticsRepository create(Ref ref) {
    return analyticsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AnalyticsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AnalyticsRepository>(value),
    );
  }
}

String _$analyticsRepositoryHash() =>
    r'3c7408e5bab83156606ba89fe70d7b35757a4fef';

@ProviderFor(analyticsStats)
final analyticsStatsProvider = AnalyticsStatsProvider._();

final class AnalyticsStatsProvider
    extends
        $FunctionalProvider<
          AsyncValue<AnalyticsStats>,
          AnalyticsStats,
          FutureOr<AnalyticsStats>
        >
    with $FutureModifier<AnalyticsStats>, $FutureProvider<AnalyticsStats> {
  AnalyticsStatsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'analyticsStatsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$analyticsStatsHash();

  @$internal
  @override
  $FutureProviderElement<AnalyticsStats> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<AnalyticsStats> create(Ref ref) {
    return analyticsStats(ref);
  }
}

String _$analyticsStatsHash() => r'750b829f261f0389ebf86b64a75fe3aaa26c0be5';

@ProviderFor(analyticsHistory)
final analyticsHistoryProvider = AnalyticsHistoryFamily._();

final class AnalyticsHistoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<FitnessHistory>>,
          List<FitnessHistory>,
          FutureOr<List<FitnessHistory>>
        >
    with
        $FutureModifier<List<FitnessHistory>>,
        $FutureProvider<List<FitnessHistory>> {
  AnalyticsHistoryProvider._({
    required AnalyticsHistoryFamily super.from,
    required int super.argument,
  }) : super(
         retry: null,
         name: r'analyticsHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$analyticsHistoryHash();

  @override
  String toString() {
    return r'analyticsHistoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<FitnessHistory>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<FitnessHistory>> create(Ref ref) {
    final argument = this.argument as int;
    return analyticsHistory(ref, days: argument);
  }

  @override
  bool operator ==(Object other) {
    return other is AnalyticsHistoryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$analyticsHistoryHash() => r'd3586bc9c04af1ebb0dab897177d1fda6d409ad4';

final class AnalyticsHistoryFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<FitnessHistory>>, int> {
  AnalyticsHistoryFamily._()
    : super(
        retry: null,
        name: r'analyticsHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  AnalyticsHistoryProvider call({required int days}) =>
      AnalyticsHistoryProvider._(argument: days, from: this);

  @override
  String toString() => r'analyticsHistoryProvider';
}

@ProviderFor(weeklyMileage)
final weeklyMileageProvider = WeeklyMileageProvider._();

final class WeeklyMileageProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<WeeklyMileage>>,
          List<WeeklyMileage>,
          FutureOr<List<WeeklyMileage>>
        >
    with
        $FutureModifier<List<WeeklyMileage>>,
        $FutureProvider<List<WeeklyMileage>> {
  WeeklyMileageProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'weeklyMileageProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$weeklyMileageHash();

  @$internal
  @override
  $FutureProviderElement<List<WeeklyMileage>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<WeeklyMileage>> create(Ref ref) {
    return weeklyMileage(ref);
  }
}

String _$weeklyMileageHash() => r'f9c0864d8fd43f9d48741f334df67f4adbca5cc0';

@ProviderFor(SelectedDateRange)
final selectedDateRangeProvider = SelectedDateRangeProvider._();

final class SelectedDateRangeProvider
    extends $NotifierProvider<SelectedDateRange, int> {
  SelectedDateRangeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'selectedDateRangeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$selectedDateRangeHash();

  @$internal
  @override
  SelectedDateRange create() => SelectedDateRange();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }
}

String _$selectedDateRangeHash() => r'5bb0fc6d52d6c631264747ae0e61c60f84e37bf9';

abstract class _$SelectedDateRange extends $Notifier<int> {
  int build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(racePredictions)
final racePredictionsProvider = RacePredictionsProvider._();

final class RacePredictionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, Duration>>,
          Map<String, Duration>,
          FutureOr<Map<String, Duration>>
        >
    with
        $FutureModifier<Map<String, Duration>>,
        $FutureProvider<Map<String, Duration>> {
  RacePredictionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'racePredictionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$racePredictionsHash();

  @$internal
  @override
  $FutureProviderElement<Map<String, Duration>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, Duration>> create(Ref ref) {
    return racePredictions(ref);
  }
}

String _$racePredictionsHash() => r'356dd14eeb14facd7370108eb1f6829ba3a02702';
