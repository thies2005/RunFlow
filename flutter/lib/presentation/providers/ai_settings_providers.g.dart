// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_settings_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(AiSettings)
final aiSettingsProvider = AiSettingsProvider._();

final class AiSettingsProvider
    extends $NotifierProvider<AiSettings, AiSettingsState> {
  AiSettingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'aiSettingsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$aiSettingsHash();

  @$internal
  @override
  AiSettings create() => AiSettings();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AiSettingsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AiSettingsState>(value),
    );
  }
}

String _$aiSettingsHash() => r'f857254324cd971057265ec41d91f984ed9e9036';

abstract class _$AiSettings extends $Notifier<AiSettingsState> {
  AiSettingsState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AiSettingsState, AiSettingsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AiSettingsState, AiSettingsState>,
              AiSettingsState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
