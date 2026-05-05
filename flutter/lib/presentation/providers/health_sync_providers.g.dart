// GENERATED CODE - DO NOT MODIFY BY HAND
// This file was manually created to match Riverpod codegen patterns.
// Run `dart run build_runner build --delete-conflicting-outputs` to regenerate properly.

part of 'health_sync_providers.dart';

String _$healthSyncStateHash() => r'manually_added_health_sync_state';

@ProviderFor(HealthSyncState)
final healthSyncStateProvider = HealthSyncStateProvider._();

typedef HealthSyncStateValue = ({
  bool isSyncing,
  DateTime? lastSyncTime,
  String? error
});

final class HealthSyncStateProvider
    extends $NotifierProvider<HealthSyncState, HealthSyncStateValue> {
  HealthSyncStateProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthSyncStateProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthSyncStateHash();

  @$internal
  @override
  HealthSyncState create() => HealthSyncState();

  Override overrideWithValue(HealthSyncStateValue value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthSyncStateValue>(value),
    );
  }
}

abstract class _$HealthSyncState extends $Notifier<HealthSyncStateValue> {
  HealthSyncStateValue build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<HealthSyncStateValue, HealthSyncStateValue>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HealthSyncStateValue, HealthSyncStateValue>,
              HealthSyncStateValue,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
