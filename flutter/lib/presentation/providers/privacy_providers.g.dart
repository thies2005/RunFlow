// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'privacy_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(PrivacyConsent)
final privacyConsentProvider = PrivacyConsentProvider._();

final class PrivacyConsentProvider
    extends $NotifierProvider<PrivacyConsent, PrivacyConsentState> {
  PrivacyConsentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'privacyConsentProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$privacyConsentHash();

  @$internal
  @override
  PrivacyConsent create() => PrivacyConsent();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PrivacyConsentState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PrivacyConsentState>(value),
    );
  }
}

String _$privacyConsentHash() => r'5e1383ab366c3c2d30b5d2a9780b37a052f3841a';

abstract class _$PrivacyConsent extends $Notifier<PrivacyConsentState> {
  PrivacyConsentState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<PrivacyConsentState, PrivacyConsentState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<PrivacyConsentState, PrivacyConsentState>,
              PrivacyConsentState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
