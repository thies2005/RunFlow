import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
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
      calories: prefs.getInt('nutrition_target_calories') ?? 2000,
      protein: prefs.getInt('nutrition_target_protein') ?? 150,
      carbs: prefs.getInt('nutrition_target_carbs') ?? 300,
      fat: prefs.getInt('nutrition_target_fat') ?? 80,
      water: prefs.getDouble('nutrition_target_water') ?? 3.0,
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
