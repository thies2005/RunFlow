import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/models/ai_feedback_models.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

part 'ai_feedback_providers.g.dart';

@riverpod
class AiFeedback extends _$AiFeedback {
  @override
  Future<AiActivityFeedback> build(String activityId) async {
    final repo = ref.read(activityRepositoryProvider);
    try {
      return repo.getAiFeedback(activityId);
    } catch (_) {
      return const AiActivityFeedback();
    }
  }

  Future<void> generate(String activityId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(activityRepositoryProvider);
      return repo.generateAiFeedback(activityId);
    });
  }
}
