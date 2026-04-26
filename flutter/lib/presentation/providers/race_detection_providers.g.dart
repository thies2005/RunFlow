// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'race_detection_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(detectedRaceActivities)
final detectedRaceActivitiesProvider = DetectedRaceActivitiesProvider._();

final class DetectedRaceActivitiesProvider
    extends $FunctionalProvider<List<Activity>, List<Activity>, List<Activity>>
    with $Provider<List<Activity>> {
  DetectedRaceActivitiesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'detectedRaceActivitiesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$detectedRaceActivitiesHash();

  @$internal
  @override
  $ProviderElement<List<Activity>> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  List<Activity> create(Ref ref) {
    return detectedRaceActivities(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<Activity> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<Activity>>(value),
    );
  }
}

String _$detectedRaceActivitiesHash() =>
    r'4551c7b4c668d87c57d9430c48cb897772c62286';

@ProviderFor(recentRaceCandidates)
final recentRaceCandidatesProvider = RecentRaceCandidatesProvider._();

final class RecentRaceCandidatesProvider
    extends $FunctionalProvider<List<Activity>, List<Activity>, List<Activity>>
    with $Provider<List<Activity>> {
  RecentRaceCandidatesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'recentRaceCandidatesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recentRaceCandidatesHash();

  @$internal
  @override
  $ProviderElement<List<Activity>> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  List<Activity> create(Ref ref) {
    return recentRaceCandidates(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<Activity> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<Activity>>(value),
    );
  }
}

String _$recentRaceCandidatesHash() =>
    r'70f632ea3297a860f035057b28a87ecc5109ec9d';
