import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';

final nutritionTargetsProvider =
    FutureProvider<NutritionTargets>((ref) async {
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    final targets = await apiRepo.getNutritionTargets();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('nutrition_target_calories', targets.calories);
    await prefs.setInt('nutrition_target_protein', targets.protein);
    await prefs.setInt('nutrition_target_carbs', targets.carbs);
    await prefs.setInt('nutrition_target_fat', targets.fat);
    await prefs.setDouble('nutrition_target_water', targets.water);
    return targets;
  } catch (_) {
    final prefs = await SharedPreferences.getInstance();
    return NutritionTargets(
      calories: prefs.getInt('nutrition_target_calories') ?? NutritionTargets.defaults.calories,
      protein: prefs.getInt('nutrition_target_protein') ?? NutritionTargets.defaults.protein,
      carbs: prefs.getInt('nutrition_target_carbs') ?? NutritionTargets.defaults.carbs,
      fat: prefs.getInt('nutrition_target_fat') ?? NutritionTargets.defaults.fat,
      water: prefs.getDouble('nutrition_target_water') ?? NutritionTargets.defaults.water,
    );
  }
});

Future<void> updateNutritionTargets(
    WidgetRef ref, NutritionTargets targets) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt('nutrition_target_calories', targets.calories);
  await prefs.setInt('nutrition_target_protein', targets.protein);
  await prefs.setInt('nutrition_target_carbs', targets.carbs);
  await prefs.setInt('nutrition_target_fat', targets.fat);
  await prefs.setDouble('nutrition_target_water', targets.water);
  try {
    final apiRepo = ref.read(healthApiRepositoryProvider);
    await apiRepo.setNutritionTargets(targets);
  } catch (_) {}
  ref.invalidate(nutritionTargetsProvider);
}
