// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'calibration_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(Calibration)
final calibrationProvider = CalibrationProvider._();

final class CalibrationProvider
    extends $NotifierProvider<Calibration, CalibrationState> {
  CalibrationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'calibrationProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$calibrationHash();

  @$internal
  @override
  Calibration create() => Calibration();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CalibrationState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CalibrationState>(value),
    );
  }
}

String _$calibrationHash() => r'a5cdfb46964361acb12a5b9510c7efd031f99c78';

abstract class _$Calibration extends $Notifier<CalibrationState> {
  CalibrationState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<CalibrationState, CalibrationState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CalibrationState, CalibrationState>,
              CalibrationState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
