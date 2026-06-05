// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'strength_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(strengthDatasource)
final strengthDatasourceProvider = StrengthDatasourceProvider._();

final class StrengthDatasourceProvider
    extends
        $FunctionalProvider<
          StrengthLocalDatasource,
          StrengthLocalDatasource,
          StrengthLocalDatasource
        >
    with $Provider<StrengthLocalDatasource> {
  StrengthDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'strengthDatasourceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$strengthDatasourceHash();

  @$internal
  @override
  $ProviderElement<StrengthLocalDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  StrengthLocalDatasource create(Ref ref) {
    return strengthDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StrengthLocalDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StrengthLocalDatasource>(value),
    );
  }
}

String _$strengthDatasourceHash() =>
    r'ed097f10e078e283ca0516043c1708bfd5caf754';

@ProviderFor(ExerciseLibrary)
final exerciseLibraryProvider = ExerciseLibraryProvider._();

final class ExerciseLibraryProvider
    extends $AsyncNotifierProvider<ExerciseLibrary, List<Exercise>> {
  ExerciseLibraryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exerciseLibraryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exerciseLibraryHash();

  @$internal
  @override
  ExerciseLibrary create() => ExerciseLibrary();
}

String _$exerciseLibraryHash() => r'46ab027210a969a618131738b25f9ff843b17b5f';

abstract class _$ExerciseLibrary extends $AsyncNotifier<List<Exercise>> {
  FutureOr<List<Exercise>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<List<Exercise>>, List<Exercise>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<Exercise>>, List<Exercise>>,
              AsyncValue<List<Exercise>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(StrengthTemplates)
final strengthTemplatesProvider = StrengthTemplatesProvider._();

final class StrengthTemplatesProvider
    extends
        $AsyncNotifierProvider<
          StrengthTemplates,
          List<StrengthWorkoutTemplate>
        > {
  StrengthTemplatesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'strengthTemplatesProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$strengthTemplatesHash();

  @$internal
  @override
  StrengthTemplates create() => StrengthTemplates();
}

String _$strengthTemplatesHash() => r'0b83f1217cf8f913605b351f04fd276916cbc652';

abstract class _$StrengthTemplates
    extends $AsyncNotifier<List<StrengthWorkoutTemplate>> {
  FutureOr<List<StrengthWorkoutTemplate>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<List<StrengthWorkoutTemplate>>,
              List<StrengthWorkoutTemplate>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<List<StrengthWorkoutTemplate>>,
                List<StrengthWorkoutTemplate>
              >,
              AsyncValue<List<StrengthWorkoutTemplate>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(StrengthHistory)
final strengthHistoryProvider = StrengthHistoryProvider._();

final class StrengthHistoryProvider
    extends $AsyncNotifierProvider<StrengthHistory, List<StrengthSession>> {
  StrengthHistoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'strengthHistoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$strengthHistoryHash();

  @$internal
  @override
  StrengthHistory create() => StrengthHistory();
}

String _$strengthHistoryHash() => r'24af31ec2467ada1961d7ff991c8dc5df47f59f0';

abstract class _$StrengthHistory extends $AsyncNotifier<List<StrengthSession>> {
  FutureOr<List<StrengthSession>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<List<StrengthSession>>, List<StrengthSession>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<List<StrengthSession>>,
                List<StrengthSession>
              >,
              AsyncValue<List<StrengthSession>>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(StrengthRecording)
final strengthRecordingProvider = StrengthRecordingProvider._();

final class StrengthRecordingProvider
    extends $NotifierProvider<StrengthRecording, StrengthRecordingState> {
  StrengthRecordingProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'strengthRecordingProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$strengthRecordingHash();

  @$internal
  @override
  StrengthRecording create() => StrengthRecording();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StrengthRecordingState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StrengthRecordingState>(value),
    );
  }
}

String _$strengthRecordingHash() => r'463bf1dbf3f01276667bccbfae7c484b1493c7b6';

abstract class _$StrengthRecording extends $Notifier<StrengthRecordingState> {
  StrengthRecordingState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<StrengthRecordingState, StrengthRecordingState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<StrengthRecordingState, StrengthRecordingState>,
              StrengthRecordingState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(RestTimer)
final restTimerProvider = RestTimerProvider._();

final class RestTimerProvider
    extends $NotifierProvider<RestTimer, RestTimerState> {
  RestTimerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'restTimerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$restTimerHash();

  @$internal
  @override
  RestTimer create() => RestTimer();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RestTimerState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RestTimerState>(value),
    );
  }
}

String _$restTimerHash() => r'3d532c294cedea386ff7242eecb6772fda34bf5c';

abstract class _$RestTimer extends $Notifier<RestTimerState> {
  RestTimerState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<RestTimerState, RestTimerState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RestTimerState, RestTimerState>,
              RestTimerState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(AnalyticsViewModeState)
final analyticsViewModeStateProvider = AnalyticsViewModeStateProvider._();

final class AnalyticsViewModeStateProvider
    extends $NotifierProvider<AnalyticsViewModeState, AnalyticsViewMode> {
  AnalyticsViewModeStateProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'analyticsViewModeStateProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$analyticsViewModeStateHash();

  @$internal
  @override
  AnalyticsViewModeState create() => AnalyticsViewModeState();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AnalyticsViewMode value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AnalyticsViewMode>(value),
    );
  }
}

String _$analyticsViewModeStateHash() =>
    r'2b1f81be75946fc7c26a34d3f283a0c78a0c9d29';

abstract class _$AnalyticsViewModeState extends $Notifier<AnalyticsViewMode> {
  AnalyticsViewMode build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AnalyticsViewMode, AnalyticsViewMode>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AnalyticsViewMode, AnalyticsViewMode>,
              AnalyticsViewMode,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(strengthAnalytics)
final strengthAnalyticsProvider = StrengthAnalyticsProvider._();

final class StrengthAnalyticsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, dynamic>>,
          Map<String, dynamic>,
          FutureOr<Map<String, dynamic>>
        >
    with
        $FutureModifier<Map<String, dynamic>>,
        $FutureProvider<Map<String, dynamic>> {
  StrengthAnalyticsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'strengthAnalyticsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$strengthAnalyticsHash();

  @$internal
  @override
  $FutureProviderElement<Map<String, dynamic>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, dynamic>> create(Ref ref) {
    return strengthAnalytics(ref);
  }
}

String _$strengthAnalyticsHash() => r'e228503cf4d4cfcd36a1856b230dbd45d801aace';
