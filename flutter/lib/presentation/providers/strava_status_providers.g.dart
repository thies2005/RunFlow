// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'strava_status_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(StravaStatus)
final stravaStatusProvider = StravaStatusProvider._();

final class StravaStatusProvider
    extends $NotifierProvider<StravaStatus, StravaStatusState> {
  StravaStatusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'stravaStatusProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$stravaStatusHash();

  @$internal
  @override
  StravaStatus create() => StravaStatus();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StravaStatusState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StravaStatusState>(value),
    );
  }
}

String _$stravaStatusHash() => r'a33096eda8ed98fd717c8127c95eed4110b2e970';

abstract class _$StravaStatus extends $Notifier<StravaStatusState> {
  StravaStatusState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<StravaStatusState, StravaStatusState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<StravaStatusState, StravaStatusState>,
              StravaStatusState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
