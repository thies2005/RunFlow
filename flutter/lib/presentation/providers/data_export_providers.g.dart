// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'data_export_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(DataExport)
final dataExportProvider = DataExportProvider._();

final class DataExportProvider
    extends $NotifierProvider<DataExport, DataExportState> {
  DataExportProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dataExportProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dataExportHash();

  @$internal
  @override
  DataExport create() => DataExport();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DataExportState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DataExportState>(value),
    );
  }
}

String _$dataExportHash() => r'bb2cc1323b657695a70f49fc5a83c2396fd62634';

abstract class _$DataExport extends $Notifier<DataExportState> {
  DataExportState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<DataExportState, DataExportState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<DataExportState, DataExportState>,
              DataExportState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
