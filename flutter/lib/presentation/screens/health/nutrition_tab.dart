import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/widgets/circular_gauge.dart';

class NutritionTab extends ConsumerWidget {
  const NutritionTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = DateTime.now();
    final nutritionAsync = ref.watch(nutritionProvider(today));
    final theme = Theme.of(context);

    return nutritionAsync.when(
      data: (nutrition) {
        final proteinPct = nutrition.protein > 0 && nutrition.calories > 0
            ? (nutrition.protein * 4) / nutrition.calories
            : 0.0;
        final carbsPct = nutrition.carbs > 0 && nutrition.calories > 0
            ? (nutrition.carbs * 4) / nutrition.calories
            : 0.0;
        final fatPct = nutrition.fat > 0 && nutrition.calories > 0
            ? (nutrition.fat * 9) / nutrition.calories
            : 0.0;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Daily Nutrition',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  CircularGauge(
                    value: nutrition.calories,
                    label: 'Calories',
                    maxValue: 2500,
                    color: AppColors.primary,
                  ),
                  CircularGauge(
                    value: nutrition.protein,
                    label: 'Protein (g)',
                    maxValue: 150,
                    color: AppColors.success,
                  ),
                  CircularGauge(
                    value: nutrition.carbs,
                    label: 'Carbs (g)',
                    maxValue: 300,
                    color: AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  CircularGauge(
                    value: nutrition.fat,
                    label: 'Fat (g)',
                    maxValue: 80,
                    color: AppColors.fatigued,
                  ),
                  CircularGauge(
                    value: nutrition.water,
                    label: 'Water (L)',
                    maxValue: 3,
                    color: AppColors.peaked,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Macro Breakdown',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _MacroBar(label: 'Protein', percent: proteinPct, color: AppColors.success),
                      const SizedBox(height: 8),
                      _MacroBar(label: 'Carbs', percent: carbsPct, color: AppColors.warning),
                      const SizedBox(height: 8),
                      _MacroBar(label: 'Fat', percent: fatPct, color: AppColors.fatigued),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _WaterTracker(
                currentWater: nutrition.water,
                onAdd: () {
                  final updated = nutrition.copyWith(
                    water: nutrition.water + 0.25,
                  );
                  ref.read(nutritionProvider(today).notifier).save(updated);
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _showAddFoodDialog(context, ref, nutrition),
                  icon: const Icon(Icons.add),
                  label: const Text('Add Food'),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: $e', style: theme.textTheme.bodyMedium),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => ref.invalidate(nutritionProvider(today)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddFoodDialog(BuildContext context, WidgetRef ref, NutritionLog nutrition) {
    final nameCtl = TextEditingController();
    final calCtl = TextEditingController();
    final proteinCtl = TextEditingController();
    final carbsCtl = TextEditingController();
    final fatCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Food'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtl, decoration: const InputDecoration(labelText: 'Food Name')),
              const SizedBox(height: 8),
              TextField(controller: calCtl, decoration: const InputDecoration(labelText: 'Calories'), keyboardType: TextInputType.number),
              const SizedBox(height: 8),
              TextField(controller: proteinCtl, decoration: const InputDecoration(labelText: 'Protein (g)'), keyboardType: TextInputType.number),
              const SizedBox(height: 8),
              TextField(controller: carbsCtl, decoration: const InputDecoration(labelText: 'Carbs (g)'), keyboardType: TextInputType.number),
              const SizedBox(height: 8),
              TextField(controller: fatCtl, decoration: const InputDecoration(labelText: 'Fat (g)'), keyboardType: TextInputType.number),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final updated = nutrition.copyWith(
                calories: nutrition.calories + (double.tryParse(calCtl.text) ?? 0),
                protein: nutrition.protein + (double.tryParse(proteinCtl.text) ?? 0),
                carbs: nutrition.carbs + (double.tryParse(carbsCtl.text) ?? 0),
                fat: nutrition.fat + (double.tryParse(fatCtl.text) ?? 0),
              );
              ref.read(nutritionProvider(nutrition.date).notifier).save(updated);
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({
    required this.label,
    required this.percent,
    required this.color,
  });

  final String label;
  final double percent;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        SizedBox(
          width: 60,
          child: Text(label, style: theme.textTheme.bodySmall),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent.clamp(0.0, 1.0),
              backgroundColor: AppColors.surfaceDarkVariant,
              color: color,
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 40,
          child: Text(
            '${(percent * 100).toStringAsFixed(0)}%',
            style: theme.textTheme.bodySmall,
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _WaterTracker extends StatelessWidget {
  const _WaterTracker({
    required this.currentWater,
    required this.onAdd,
  });

  final double currentWater;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final glasses = (currentWater / 0.25).floor();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Water Intake',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${currentWater.toStringAsFixed(2)}L / 3.0L',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: List.generate(
                12,
                (i) => Expanded(
                  child: GestureDetector(
                    onTap: onAdd,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1),
                      child: Icon(
                        Icons.water_drop,
                        size: 20,
                        color: i < glasses ? AppColors.peaked : AppColors.surfaceDarkVariant,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
