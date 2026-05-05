// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'heatmap_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(heatmapRoutes)
final heatmapRoutesProvider = HeatmapRoutesFamily._();

final class HeatmapRoutesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<List<LatLng>>>,
          List<List<LatLng>>,
          FutureOr<List<List<LatLng>>>
        >
    with
        $FutureModifier<List<List<LatLng>>>,
        $FutureProvider<List<List<LatLng>>> {
  HeatmapRoutesProvider._({
    required HeatmapRoutesFamily super.from,
    required int super.argument,
  }) : super(
         retry: null,
         name: r'heatmapRoutesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$heatmapRoutesHash();

  @override
  String toString() {
    return r'heatmapRoutesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<List<LatLng>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<List<LatLng>>> create(Ref ref) {
    final argument = this.argument as int;
    return heatmapRoutes(ref, days: argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HeatmapRoutesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$heatmapRoutesHash() => r'3b5bb6f622a79f541142bb618bc3e5ee1d38635d';

final class HeatmapRoutesFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<List<List<LatLng>>>, int> {
  HeatmapRoutesFamily._()
    : super(
        retry: null,
        name: r'heatmapRoutesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HeatmapRoutesProvider call({int days = 365}) =>
      HeatmapRoutesProvider._(argument: days, from: this);

  @override
  String toString() => r'heatmapRoutesProvider';
}
