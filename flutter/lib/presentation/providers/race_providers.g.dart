// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'race_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(raceCountdown)
final raceCountdownProvider = RaceCountdownProvider._();

final class RaceCountdownProvider
    extends
        $FunctionalProvider<
          RaceCountdownData?,
          RaceCountdownData?,
          RaceCountdownData?
        >
    with $Provider<RaceCountdownData?> {
  RaceCountdownProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'raceCountdownProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$raceCountdownHash();

  @$internal
  @override
  $ProviderElement<RaceCountdownData?> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  RaceCountdownData? create(Ref ref) {
    return raceCountdown(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RaceCountdownData? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RaceCountdownData?>(value),
    );
  }
}

String _$raceCountdownHash() => r'b8e722f45277d081fd3f572450f395dc5d60083c';

@ProviderFor(trainingStatus)
final trainingStatusProvider = TrainingStatusProvider._();

final class TrainingStatusProvider
    extends
        $FunctionalProvider<
          AsyncValue<TrainingStatusData>,
          TrainingStatusData,
          FutureOr<TrainingStatusData>
        >
    with
        $FutureModifier<TrainingStatusData>,
        $FutureProvider<TrainingStatusData> {
  TrainingStatusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'trainingStatusProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$trainingStatusHash();

  @$internal
  @override
  $FutureProviderElement<TrainingStatusData> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<TrainingStatusData> create(Ref ref) {
    return trainingStatus(ref);
  }
}

String _$trainingStatusHash() => r'27f93204539d33a066db1776598c7b2dea1ab419';

@ProviderFor(raceSuggestions)
final raceSuggestionsProvider = RaceSuggestionsFamily._();

final class RaceSuggestionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<RaceSuggestionResponse>,
          RaceSuggestionResponse,
          FutureOr<RaceSuggestionResponse>
        >
    with
        $FutureModifier<RaceSuggestionResponse>,
        $FutureProvider<RaceSuggestionResponse> {
  RaceSuggestionsProvider._({
    required RaceSuggestionsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'raceSuggestionsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$raceSuggestionsHash();

  @override
  String toString() {
    return r'raceSuggestionsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<RaceSuggestionResponse> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<RaceSuggestionResponse> create(Ref ref) {
    final argument = this.argument as String;
    return raceSuggestions(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is RaceSuggestionsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$raceSuggestionsHash() => r'3b7430d7ec4e58ad71bc040d09bc2f0838aa55ed';

final class RaceSuggestionsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<RaceSuggestionResponse>, String> {
  RaceSuggestionsFamily._()
    : super(
        retry: null,
        name: r'raceSuggestionsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  RaceSuggestionsProvider call(String goalId) =>
      RaceSuggestionsProvider._(argument: goalId, from: this);

  @override
  String toString() => r'raceSuggestionsProvider';
}

@ProviderFor(trainingCompletion)
final trainingCompletionProvider = TrainingCompletionFamily._();

final class TrainingCompletionProvider
    extends
        $FunctionalProvider<
          AsyncValue<TrainingCompletionSummary>,
          TrainingCompletionSummary,
          FutureOr<TrainingCompletionSummary>
        >
    with
        $FutureModifier<TrainingCompletionSummary>,
        $FutureProvider<TrainingCompletionSummary> {
  TrainingCompletionProvider._({
    required TrainingCompletionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'trainingCompletionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$trainingCompletionHash();

  @override
  String toString() {
    return r'trainingCompletionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<TrainingCompletionSummary> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<TrainingCompletionSummary> create(Ref ref) {
    final argument = this.argument as String;
    return trainingCompletion(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is TrainingCompletionProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$trainingCompletionHash() =>
    r'af210d587f8a0152c3821982fc87d32fb6a6b1b1';

final class TrainingCompletionFamily extends $Family
    with
        $FunctionalFamilyOverride<FutureOr<TrainingCompletionSummary>, String> {
  TrainingCompletionFamily._()
    : super(
        retry: null,
        name: r'trainingCompletionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  TrainingCompletionProvider call(String goalId) =>
      TrainingCompletionProvider._(argument: goalId, from: this);

  @override
  String toString() => r'trainingCompletionProvider';
}

@ProviderFor(RaceResultFlow)
final raceResultFlowProvider = RaceResultFlowFamily._();

final class RaceResultFlowProvider
    extends $NotifierProvider<RaceResultFlow, RaceResultFlowState> {
  RaceResultFlowProvider._({
    required RaceResultFlowFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'raceResultFlowProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$raceResultFlowHash();

  @override
  String toString() {
    return r'raceResultFlowProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  RaceResultFlow create() => RaceResultFlow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RaceResultFlowState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RaceResultFlowState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is RaceResultFlowProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$raceResultFlowHash() => r'd8c8cfb2d8ff2cbf3bfb0aede71d5eb92f13f057';

final class RaceResultFlowFamily extends $Family
    with
        $ClassFamilyOverride<
          RaceResultFlow,
          RaceResultFlowState,
          RaceResultFlowState,
          RaceResultFlowState,
          String
        > {
  RaceResultFlowFamily._()
    : super(
        retry: null,
        name: r'raceResultFlowProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  RaceResultFlowProvider call(String goalId) =>
      RaceResultFlowProvider._(argument: goalId, from: this);

  @override
  String toString() => r'raceResultFlowProvider';
}

abstract class _$RaceResultFlow extends $Notifier<RaceResultFlowState> {
  late final _$args = ref.$arg as String;
  String get goalId => _$args;

  RaceResultFlowState build(String goalId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<RaceResultFlowState, RaceResultFlowState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RaceResultFlowState, RaceResultFlowState>,
              RaceResultFlowState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
