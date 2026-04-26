// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_feedback_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(AiFeedback)
final aiFeedbackProvider = AiFeedbackFamily._();

final class AiFeedbackProvider
    extends $AsyncNotifierProvider<AiFeedback, AiActivityFeedback> {
  AiFeedbackProvider._({
    required AiFeedbackFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'aiFeedbackProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$aiFeedbackHash();

  @override
  String toString() {
    return r'aiFeedbackProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  AiFeedback create() => AiFeedback();

  @override
  bool operator ==(Object other) {
    return other is AiFeedbackProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$aiFeedbackHash() => r'cabe1898a42e39493dc00bfabfa1ad272b488f94';

final class AiFeedbackFamily extends $Family
    with
        $ClassFamilyOverride<
          AiFeedback,
          AsyncValue<AiActivityFeedback>,
          AiActivityFeedback,
          FutureOr<AiActivityFeedback>,
          String
        > {
  AiFeedbackFamily._()
    : super(
        retry: null,
        name: r'aiFeedbackProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  AiFeedbackProvider call(String activityId) =>
      AiFeedbackProvider._(argument: activityId, from: this);

  @override
  String toString() => r'aiFeedbackProvider';
}

abstract class _$AiFeedback extends $AsyncNotifier<AiActivityFeedback> {
  late final _$args = ref.$arg as String;
  String get activityId => _$args;

  FutureOr<AiActivityFeedback> build(String activityId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<AiActivityFeedback>, AiActivityFeedback>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<AiActivityFeedback>, AiActivityFeedback>,
              AsyncValue<AiActivityFeedback>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
