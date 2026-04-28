// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(healthConnectService)
final healthConnectServiceProvider = HealthConnectServiceProvider._();

final class HealthConnectServiceProvider
    extends
        $FunctionalProvider<
          HealthConnectService,
          HealthConnectService,
          HealthConnectService
        >
    with $Provider<HealthConnectService> {
  HealthConnectServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'healthConnectServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$healthConnectServiceHash();

  @$internal
  @override
  $ProviderElement<HealthConnectService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HealthConnectService create(Ref ref) {
    return healthConnectService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HealthConnectService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HealthConnectService>(value),
    );
  }
}

String _$healthConnectServiceHash() =>
    r'f577b315fe35dd8f4828f41d60a07374b7ddf5a6';

@ProviderFor(Onboarding)
final onboardingProvider = OnboardingProvider._();

final class OnboardingProvider
    extends $NotifierProvider<Onboarding, OnboardingState> {
  OnboardingProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'onboardingProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$onboardingHash();

  @$internal
  @override
  Onboarding create() => Onboarding();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OnboardingState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OnboardingState>(value),
    );
  }
}

String _$onboardingHash() => r'480c583fcf1c5b1f306d183d6ed58d000f7f7da6';

abstract class _$Onboarding extends $Notifier<OnboardingState> {
  OnboardingState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<OnboardingState, OnboardingState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<OnboardingState, OnboardingState>,
              OnboardingState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
