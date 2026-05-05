// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_sync_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HealthSyncState)
final healthSyncStateProvider = HealthSyncStateProvider._();

final class HealthSyncStateProvider
    extends
        $NotifierProvider<
          HealthSyncState,
          ({String? error, bool isSyncing, DateTime? lastSyncTime})
        > {
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

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    ({String? error, bool isSyncing, DateTime? lastSyncTime}) value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<
            ({String? error, bool isSyncing, DateTime? lastSyncTime})
          >(value),
    );
  }
}

String _$healthSyncStateHash() => r'e03be9c6468f06437cf9dce71916a187bf68cac2';

abstract class _$HealthSyncState
    extends
        $Notifier<({String? error, bool isSyncing, DateTime? lastSyncTime})> {
  ({String? error, bool isSyncing, DateTime? lastSyncTime}) build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              ({String? error, bool isSyncing, DateTime? lastSyncTime}),
              ({String? error, bool isSyncing, DateTime? lastSyncTime})
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                ({String? error, bool isSyncing, DateTime? lastSyncTime}),
                ({String? error, bool isSyncing, DateTime? lastSyncTime})
              >,
              ({String? error, bool isSyncing, DateTime? lastSyncTime}),
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
