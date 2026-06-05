// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'readiness_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(readinessScoringService)
final readinessScoringServiceProvider = ReadinessScoringServiceProvider._();

final class ReadinessScoringServiceProvider
    extends
        $FunctionalProvider<
          ReadinessScoringService,
          ReadinessScoringService,
          ReadinessScoringService
        >
    with $Provider<ReadinessScoringService> {
  ReadinessScoringServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'readinessScoringServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$readinessScoringServiceHash();

  @$internal
  @override
  $ProviderElement<ReadinessScoringService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReadinessScoringService create(Ref ref) {
    return readinessScoringService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReadinessScoringService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReadinessScoringService>(value),
    );
  }
}

String _$readinessScoringServiceHash() =>
    r'3b392cdeec264d493cddd2d659e2e8951eede91b';

@ProviderFor(trimpService)
final trimpServiceProvider = TrimpServiceProvider._();

final class TrimpServiceProvider
    extends $FunctionalProvider<TrimpService, TrimpService, TrimpService>
    with $Provider<TrimpService> {
  TrimpServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'trimpServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$trimpServiceHash();

  @$internal
  @override
  $ProviderElement<TrimpService> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  TrimpService create(Ref ref) {
    return trimpService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TrimpService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TrimpService>(value),
    );
  }
}

String _$trimpServiceHash() => r'6c55414580547de5a73e27d866da84b41c70d1ff';

@ProviderFor(readinessOrchestrator)
final readinessOrchestratorProvider = ReadinessOrchestratorProvider._();

final class ReadinessOrchestratorProvider
    extends
        $FunctionalProvider<
          ReadinessOrchestrator,
          ReadinessOrchestrator,
          ReadinessOrchestrator
        >
    with $Provider<ReadinessOrchestrator> {
  ReadinessOrchestratorProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'readinessOrchestratorProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$readinessOrchestratorHash();

  @$internal
  @override
  $ProviderElement<ReadinessOrchestrator> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ReadinessOrchestrator create(Ref ref) {
    return readinessOrchestrator(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReadinessOrchestrator value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReadinessOrchestrator>(value),
    );
  }
}

String _$readinessOrchestratorHash() =>
    r'97dafe18d2a697dcf747ffdee33dbcd5ffd875a5';

@ProviderFor(readinessRepository)
final readinessRepositoryProvider = ReadinessRepositoryProvider._();

final class ReadinessRepositoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<ReadinessRepository>,
          ReadinessRepository,
          FutureOr<ReadinessRepository>
        >
    with
        $FutureModifier<ReadinessRepository>,
        $FutureProvider<ReadinessRepository> {
  ReadinessRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'readinessRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$readinessRepositoryHash();

  @$internal
  @override
  $FutureProviderElement<ReadinessRepository> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ReadinessRepository> create(Ref ref) {
    return readinessRepository(ref);
  }
}

String _$readinessRepositoryHash() =>
    r'3205746a7108beaf2b60c33a97431c8911b500e8';

@ProviderFor(ReadinessNotifier)
final readinessProvider = ReadinessNotifierProvider._();

final class ReadinessNotifierProvider
    extends $AsyncNotifierProvider<ReadinessNotifier, DailyReadinessRecord?> {
  ReadinessNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'readinessProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$readinessNotifierHash();

  @$internal
  @override
  ReadinessNotifier create() => ReadinessNotifier();
}

String _$readinessNotifierHash() => r'630f6141ceeb19aa71adff69fd2e242593ee6d5a';

abstract class _$ReadinessNotifier
    extends $AsyncNotifier<DailyReadinessRecord?> {
  FutureOr<DailyReadinessRecord?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<DailyReadinessRecord?>, DailyReadinessRecord?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<DailyReadinessRecord?>,
                DailyReadinessRecord?
              >,
              AsyncValue<DailyReadinessRecord?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(readinessHistory)
final readinessHistoryProvider = ReadinessHistoryFamily._();

final class ReadinessHistoryProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<DailyReadinessRecord>>,
          List<DailyReadinessRecord>,
          FutureOr<List<DailyReadinessRecord>>
        >
    with
        $FutureModifier<List<DailyReadinessRecord>>,
        $FutureProvider<List<DailyReadinessRecord>> {
  ReadinessHistoryProvider._({
    required ReadinessHistoryFamily super.from,
    required ReadinessHistoryRange super.argument,
  }) : super(
         retry: null,
         name: r'readinessHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$readinessHistoryHash();

  @override
  String toString() {
    return r'readinessHistoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<DailyReadinessRecord>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<DailyReadinessRecord>> create(Ref ref) {
    final argument = this.argument as ReadinessHistoryRange;
    return readinessHistory(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ReadinessHistoryProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$readinessHistoryHash() => r'b3fc7ac2ae6da03a3c58fd8f79810bfbee0bd67b';

final class ReadinessHistoryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<DailyReadinessRecord>>,
          ReadinessHistoryRange
        > {
  ReadinessHistoryFamily._()
    : super(
        retry: null,
        name: r'readinessHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ReadinessHistoryProvider call(ReadinessHistoryRange range) =>
      ReadinessHistoryProvider._(argument: range, from: this);

  @override
  String toString() => r'readinessHistoryProvider';
}
