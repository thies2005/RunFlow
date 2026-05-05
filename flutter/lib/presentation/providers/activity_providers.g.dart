// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(localActivityDatasource)
final localActivityDatasourceProvider = LocalActivityDatasourceProvider._();

final class LocalActivityDatasourceProvider
    extends
        $FunctionalProvider<
          LocalActivityDatasource,
          LocalActivityDatasource,
          LocalActivityDatasource
        >
    with $Provider<LocalActivityDatasource> {
  LocalActivityDatasourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'localActivityDatasourceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$localActivityDatasourceHash();

  @$internal
  @override
  $ProviderElement<LocalActivityDatasource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LocalActivityDatasource create(Ref ref) {
    return localActivityDatasource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LocalActivityDatasource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LocalActivityDatasource>(value),
    );
  }
}

String _$localActivityDatasourceHash() =>
    r'b7aabd2c553b117b5f15735242ff40a88aebbaf6';

@ProviderFor(activityRepository)
final activityRepositoryProvider = ActivityRepositoryProvider._();

final class ActivityRepositoryProvider
    extends
        $FunctionalProvider<
          ActivityRepository,
          ActivityRepository,
          ActivityRepository
        >
    with $Provider<ActivityRepository> {
  ActivityRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'activityRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$activityRepositoryHash();

  @$internal
  @override
  $ProviderElement<ActivityRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ActivityRepository create(Ref ref) {
    return activityRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ActivityRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ActivityRepository>(value),
    );
  }
}

String _$activityRepositoryHash() =>
    r'f986cdec6f07e0987f87bdb3be395246288de9ac';

@ProviderFor(offlineSyncService)
final offlineSyncServiceProvider = OfflineSyncServiceProvider._();

final class OfflineSyncServiceProvider
    extends
        $FunctionalProvider<
          OfflineSyncService,
          OfflineSyncService,
          OfflineSyncService
        >
    with $Provider<OfflineSyncService> {
  OfflineSyncServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'offlineSyncServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$offlineSyncServiceHash();

  @$internal
  @override
  $ProviderElement<OfflineSyncService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OfflineSyncService create(Ref ref) {
    return offlineSyncService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OfflineSyncService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OfflineSyncService>(value),
    );
  }
}

String _$offlineSyncServiceHash() =>
    r'bde848ab3e073bf8ea95c408278c0290fc8b8602';

@ProviderFor(pendingSyncCount)
final pendingSyncCountProvider = PendingSyncCountProvider._();

final class PendingSyncCountProvider
    extends $FunctionalProvider<AsyncValue<int>, int, FutureOr<int>>
    with $FutureModifier<int>, $FutureProvider<int> {
  PendingSyncCountProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pendingSyncCountProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pendingSyncCountHash();

  @$internal
  @override
  $FutureProviderElement<int> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<int> create(Ref ref) {
    return pendingSyncCount(ref);
  }
}

String _$pendingSyncCountHash() => r'e83d56f215b98aa17fc5559675763ef1598cdef8';

@ProviderFor(Activities)
final activitiesProvider = ActivitiesProvider._();

final class ActivitiesProvider
    extends $AsyncNotifierProvider<Activities, ActivitiesState> {
  ActivitiesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'activitiesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$activitiesHash();

  @$internal
  @override
  Activities create() => Activities();
}

String _$activitiesHash() => r'a0c488522e49b2b1766effcf8b3c3014fe5c6691';

abstract class _$Activities extends $AsyncNotifier<ActivitiesState> {
  FutureOr<ActivitiesState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<ActivitiesState>, ActivitiesState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<ActivitiesState>, ActivitiesState>,
              AsyncValue<ActivitiesState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(activityDetail)
final activityDetailProvider = ActivityDetailFamily._();

final class ActivityDetailProvider
    extends
        $FunctionalProvider<AsyncValue<Activity>, Activity, FutureOr<Activity>>
    with $FutureModifier<Activity>, $FutureProvider<Activity> {
  ActivityDetailProvider._({
    required ActivityDetailFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'activityDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$activityDetailHash();

  @override
  String toString() {
    return r'activityDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Activity> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<Activity> create(Ref ref) {
    final argument = this.argument as String;
    return activityDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ActivityDetailProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$activityDetailHash() => r'1edb968e4ab4d8aa415224da918ca2c706ced3f6';

final class ActivityDetailFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Activity>, String> {
  ActivityDetailFamily._()
    : super(
        retry: null,
        name: r'activityDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ActivityDetailProvider call(String id) =>
      ActivityDetailProvider._(argument: id, from: this);

  @override
  String toString() => r'activityDetailProvider';
}
