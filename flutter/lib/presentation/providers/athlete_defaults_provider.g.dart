// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'athlete_defaults_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(athleteDefaults)
final athleteDefaultsProvider = AthleteDefaultsProvider._();

final class AthleteDefaultsProvider
    extends
        $FunctionalProvider<AthleteDefaults, AthleteDefaults, AthleteDefaults>
    with $Provider<AthleteDefaults> {
  AthleteDefaultsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'athleteDefaultsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$athleteDefaultsHash();

  @$internal
  @override
  $ProviderElement<AthleteDefaults> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AthleteDefaults create(Ref ref) {
    return athleteDefaults(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AthleteDefaults value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AthleteDefaults>(value),
    );
  }
}

String _$athleteDefaultsHash() => r'8a553d9578d0f98f0f727389f7d02be5eca720eb';
