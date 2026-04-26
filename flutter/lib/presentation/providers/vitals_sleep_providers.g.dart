// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vitals_sleep_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(healthInstance)
final healthInstanceProvider = HealthInstanceProvider._();

final class HealthInstanceProvider
    extends $FunctionalProvider<Health, Health, Health>
    with $Provider<Health> {
  HealthInstanceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthInstanceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthInstanceHash();

  @$internal
  @override
  $ProviderElement<Health> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Health create(Ref ref) {
    return healthInstance(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Health value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Health>(value),
    );
  }
}

String _$healthInstanceHash() => r'c6d534b72418fe7f98d3e97a072354940a071cd4';

@ProviderFor(healthConnectService)
final healthConnectServiceProvider = HealthConnectServiceProvider._();

final class HealthConnectServiceProvider
    extends
        $FunctionalProvider<
          HealthConnectService,
          HealthConnectService,
          HealthConnectService
        >
    with $Provider<HealthConnectService> {
  HealthConnectServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthConnectServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthConnectServiceHash();

  @$internal
  @override
  $ProviderElement<HealthConnectService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HealthConnectService create(Ref ref) {
    return healthConnectService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HealthConnectService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthConnectService>(value),
    );
  }
}

String _$healthConnectServiceHash() =>
    r'11f15a17f7839ce6f698e07717cc1cd68bc7f0fd';

@ProviderFor(healthConnectAvailable)
final healthConnectAvailableProvider = HealthConnectAvailableProvider._();

final class HealthConnectAvailableProvider
    extends $FunctionalProvider<AsyncValue<bool>, bool, FutureOr<bool>>
    with $FutureModifier<bool>, $FutureProvider<bool> {
  HealthConnectAvailableProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthConnectAvailableProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthConnectAvailableHash();

  @$internal
  @override
  $FutureProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<bool> create(Ref ref) {
    return healthConnectAvailable(ref);
  }
}

String _$healthConnectAvailableHash() =>
    r'1068c192cebd18197b5ac6b33749d3269e8587ab';

@ProviderFor(HealthPermissions)
final healthPermissionsProvider = HealthPermissionsProvider._();

final class HealthPermissionsProvider
    extends $AsyncNotifierProvider<HealthPermissions, bool> {
  HealthPermissionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthPermissionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthPermissionsHash();

  @$internal
  @override
  HealthPermissions create() => HealthPermissions();
}

String _$healthPermissionsHash() => r'dc3db1a64e533f6f6645a7ae8baff538811b19be';

abstract class _$HealthPermissions extends $AsyncNotifier<bool> {
  FutureOr<bool> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<bool>, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<bool>, bool>,
              AsyncValue<bool>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(VitalsNotifier)
final vitalsProvider = VitalsNotifierProvider._();

final class VitalsNotifierProvider
    extends $AsyncNotifierProvider<VitalsNotifier, VitalsData> {
  VitalsNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'vitalsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$vitalsNotifierHash();

  @$internal
  @override
  VitalsNotifier create() => VitalsNotifier();
}

String _$vitalsNotifierHash() => r'fc5f7233516fb7d93eb2b08b4ab678b412e2052a';

abstract class _$VitalsNotifier extends $AsyncNotifier<VitalsData> {
  FutureOr<VitalsData> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<VitalsData>, VitalsData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<VitalsData>, VitalsData>,
              AsyncValue<VitalsData>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(SleepNotifier)
final sleepProvider = SleepNotifierProvider._();

final class SleepNotifierProvider
    extends $AsyncNotifierProvider<SleepNotifier, SleepData> {
  SleepNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'sleepProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$sleepNotifierHash();

  @$internal
  @override
  SleepNotifier create() => SleepNotifier();
}

String _$sleepNotifierHash() => r'e3d2832f83c82b00b7ac83be80f55c47d62cfde6';

abstract class _$SleepNotifier extends $AsyncNotifier<SleepData> {
  FutureOr<SleepData> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<SleepData>, SleepData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<SleepData>, SleepData>,
              AsyncValue<SleepData>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
