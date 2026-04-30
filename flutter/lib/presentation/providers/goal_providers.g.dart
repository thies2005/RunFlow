// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'goal_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(goalRepository)
final goalRepositoryProvider = GoalRepositoryProvider._();

final class GoalRepositoryProvider
    extends $FunctionalProvider<GoalRepository, GoalRepository, GoalRepository>
    with $Provider<GoalRepository> {
  GoalRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'goalRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$goalRepositoryHash();

  @$internal
  @override
  $ProviderElement<GoalRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoalRepository create(Ref ref) {
    return goalRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoalRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoalRepository>(value),
    );
  }
}

String _$goalRepositoryHash() => r'807deb997953e6ee889c3bfc0865d03d894d0bda';

@ProviderFor(Goals)
final goalsProvider = GoalsProvider._();

final class GoalsProvider extends $AsyncNotifierProvider<Goals, GoalsResponse> {
  GoalsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'goalsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$goalsHash();

  @$internal
  @override
  Goals create() => Goals();
}

String _$goalsHash() => r'be2235a31a20929d4538f2e48bad002049fee5d3';

abstract class _$Goals extends $AsyncNotifier<GoalsResponse> {
  FutureOr<GoalsResponse> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<GoalsResponse>, GoalsResponse>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<GoalsResponse>, GoalsResponse>,
              AsyncValue<GoalsResponse>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

@ProviderFor(goalDetail)
final goalDetailProvider = GoalDetailFamily._();

final class GoalDetailProvider
    extends $FunctionalProvider<AsyncValue<Goal>, Goal, FutureOr<Goal>>
    with $FutureModifier<Goal>, $FutureProvider<Goal> {
  GoalDetailProvider._({
    required GoalDetailFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'goalDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$goalDetailHash();

  @override
  String toString() {
    return r'goalDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<Goal> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<Goal> create(Ref ref) {
    final argument = this.argument as String;
    return goalDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is GoalDetailProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$goalDetailHash() => r'ec99c6266bcba86cae44652526394e343a1fddb0';

final class GoalDetailFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<Goal>, String> {
  GoalDetailFamily._()
    : super(
        retry: null,
        name: r'goalDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  GoalDetailProvider call(String id) =>
      GoalDetailProvider._(argument: id, from: this);

  @override
  String toString() => r'goalDetailProvider';
}

@ProviderFor(workouts)
final workoutsProvider = WorkoutsFamily._();

final class WorkoutsProvider
    extends
        $FunctionalProvider<
          AsyncValue<WorkoutsResponse>,
          WorkoutsResponse,
          FutureOr<WorkoutsResponse>
        >
    with $FutureModifier<WorkoutsResponse>, $FutureProvider<WorkoutsResponse> {
  WorkoutsProvider._({
    required WorkoutsFamily super.from,
    required ({String? goalId, DateTime? weekStart, DateTime? weekEnd})
    super.argument,
  }) : super(
         retry: null,
         name: r'workoutsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$workoutsHash();

  @override
  String toString() {
    return r'workoutsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<WorkoutsResponse> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<WorkoutsResponse> create(Ref ref) {
    final argument =
        this.argument
            as ({String? goalId, DateTime? weekStart, DateTime? weekEnd});
    return workouts(
      ref,
      goalId: argument.goalId,
      weekStart: argument.weekStart,
      weekEnd: argument.weekEnd,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is WorkoutsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$workoutsHash() => r'bd6181ecf5e1fe4287cf717d9becf6d61c29849f';

final class WorkoutsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<WorkoutsResponse>,
          ({String? goalId, DateTime? weekStart, DateTime? weekEnd})
        > {
  WorkoutsFamily._()
    : super(
        retry: null,
        name: r'workoutsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WorkoutsProvider call({
    String? goalId,
    DateTime? weekStart,
    DateTime? weekEnd,
  }) => WorkoutsProvider._(
    argument: (goalId: goalId, weekStart: weekStart, weekEnd: weekEnd),
    from: this,
  );

  @override
  String toString() => r'workoutsProvider';
}
