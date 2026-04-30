import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/domain/entities/meal_suggestion_entities.dart';
import 'package:runflow_flutter/domain/repositories/health_api_repository.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';

class MealSuggestionNotifier extends Notifier<AsyncValue<AiMealSuggestion?>> {
  @override
  AsyncValue<AiMealSuggestion?> build() {
    return const AsyncValue.data(null);
  }

  HealthApiRepository get _repo => ref.read(healthApiRepositoryProvider);

  Future<void> getSuggestion({
    required double remainingCalories,
    required double remainingProtein,
    required double remainingCarbs,
    required double remainingFats,
  }) async {
    state = const AsyncValue.loading();
    try {
      final suggestion = await _repo.getMealSuggestion(
        remainingCalories: remainingCalories,
        remainingProtein: remainingProtein,
        remainingCarbs: remainingCarbs,
        remainingFats: remainingFats,
      );
      state = AsyncValue.data(suggestion);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final mealSuggestionProvider =
    NotifierProvider<MealSuggestionNotifier, AsyncValue<AiMealSuggestion?>>(
  MealSuggestionNotifier.new,
);
