import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/nutrition_targets_provider.dart';
import 'package:runflow_flutter/presentation/widgets/circular_gauge.dart';

class NutritionScreen extends ConsumerWidget {
  const NutritionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final nutritionAsync = ref.watch(nutritionProvider(today));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nutrition'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            onPressed: () => _showTargetsDialog(context, ref),
            icon: const Icon(Icons.settings_outlined, color: AppColors.onSurfaceVariant),
            tooltip: 'Set Targets',
          ),
          IconButton(
            onPressed: () => context.push('/health/scan'),
            icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
            tooltip: 'Scan Barcode',
          ),
        ],
      ),
      body: nutritionAsync.when(
        data: (nutrition) {
          final targetsAsync = ref.watch(nutritionTargetsProvider);
          final targets = targetsAsync.asData?.value ??
              const NutritionTargets(
                  calories: 2000, protein: 150, carbs: 300, fat: 80, water: 3.0);
          return _NutritionContent(
              nutrition: nutrition, ref: ref, today: today, targets: targets);
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
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => nutritionAsync.whenData(
          (n) => _showAddFoodDialog(context, ref, n),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Add Food'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _showTargetsDialog(BuildContext context, WidgetRef ref) {
    final targetsAsync = ref.read(nutritionTargetsProvider);
    final targets = targetsAsync.asData?.value ??
        const NutritionTargets(
            calories: 2000, protein: 150, carbs: 300, fat: 80, water: 3.0);
    final calCtl = TextEditingController(text: targets.calories.toString());
    final proteinCtl =
        TextEditingController(text: targets.protein.toString());
    final carbsCtl = TextEditingController(text: targets.carbs.toString());
    final fatCtl = TextEditingController(text: targets.fat.toString());
    final waterCtl = TextEditingController(text: targets.water.toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.onSurfaceVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text('Nutrition Targets',
                style: Theme.of(ctx)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(
                controller: calCtl,
                decoration: const InputDecoration(
                    labelText: 'Calories (kcal)'),
                keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                    child: TextField(
                        controller: proteinCtl,
                        decoration: const InputDecoration(
                            labelText: 'Protein (g)'),
                        keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(
                    child: TextField(
                        controller: carbsCtl,
                        decoration: const InputDecoration(
                            labelText: 'Carbs (g)'),
                        keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                    child: TextField(
                        controller: fatCtl,
                        decoration:
                            const InputDecoration(labelText: 'Fat (g)'),
                        keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(
                    child: TextField(
                        controller: waterCtl,
                        decoration: const InputDecoration(
                            labelText: 'Water (L)'),
                        keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  final newTargets = NutritionTargets(
                    calories:
                        int.tryParse(calCtl.text) ?? targets.calories,
                    protein: int.tryParse(proteinCtl.text) ??
                        targets.protein,
                    carbs: int.tryParse(carbsCtl.text) ?? targets.carbs,
                    fat: int.tryParse(fatCtl.text) ?? targets.fat,
                    water: double.tryParse(waterCtl.text) ??
                        targets.water,
                  );
                  updateNutritionTargets(ref, newTargets);
                  Navigator.pop(ctx);
                },
                child: const Text('Save'),
              ),
            ),
          ],
        ),
      ),
    ).whenComplete(() {
      calCtl.dispose();
      proteinCtl.dispose();
      carbsCtl.dispose();
      fatCtl.dispose();
      waterCtl.dispose();
    });
  }

  void _showAddFoodDialog(BuildContext context, WidgetRef ref, NutritionLog nutrition) {
    final nameCtl = TextEditingController();
    final calCtl = TextEditingController();
    final proteinCtl = TextEditingController();
    final carbsCtl = TextEditingController();
    final fatCtl = TextEditingController();
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.onSurfaceVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text('Add Food', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(controller: nameCtl, decoration: const InputDecoration(labelText: 'Food Name', prefixIcon: Icon(Icons.restaurant))),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: calCtl, decoration: const InputDecoration(labelText: 'Calories'), keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: proteinCtl, decoration: const InputDecoration(labelText: 'Protein (g)'), keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: TextField(controller: carbsCtl, decoration: const InputDecoration(labelText: 'Carbs (g)'), keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: fatCtl, decoration: const InputDecoration(labelText: 'Fat (g)'), keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final result = await ctx.push<FoodItem?>('/health/scan');
                      if (result != null) {
                        nameCtl.text = result.name;
                        calCtl.text = result.calories.toString();
                        proteinCtl.text = result.protein.toString();
                        carbsCtl.text = result.carbs.toString();
                        fatCtl.text = result.fat.toString();
                      }
                    },
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final result = await ctx.push<FoodItem?>('/health/ai-scan');
                      if (result != null) {
                        nameCtl.text = result.name;
                        calCtl.text = result.calories.toString();
                        proteinCtl.text = result.protein.toString();
                        carbsCtl.text = result.carbs.toString();
                        fatCtl.text = result.fat.toString();
                      }
                    },
                    icon: const Icon(Icons.auto_awesome),
                    label: const Text('AI Scan'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  final updated = nutrition.copyWith(
                    calories: nutrition.calories + (double.tryParse(calCtl.text) ?? 0),
                    protein: nutrition.protein + (double.tryParse(proteinCtl.text) ?? 0),
                    carbs: nutrition.carbs + (double.tryParse(carbsCtl.text) ?? 0),
                    fat: nutrition.fat + (double.tryParse(fatCtl.text) ?? 0),
                  );
                  ref.read(nutritionProvider(today).notifier).save(updated);
                  Navigator.pop(ctx);
                },
                child: const Text('Add'),
              ),
            ),
          ],
        ),
      ),
    ).whenComplete(() {
      nameCtl.dispose();
      calCtl.dispose();
      proteinCtl.dispose();
      carbsCtl.dispose();
      fatCtl.dispose();
    });
  }
}

class _NutritionContent extends StatelessWidget {
  const _NutritionContent({required this.nutrition, required this.ref, required this.today, required this.targets});

  final NutritionLog nutrition;
  final WidgetRef ref;
  final DateTime today;
  final NutritionTargets targets;

  @override
  Widget build(BuildContext context) {
    final proteinPct = nutrition.protein > 0 && nutrition.calories > 0
        ? (nutrition.protein * 4) / nutrition.calories : 0.0;
    final carbsPct = nutrition.carbs > 0 && nutrition.calories > 0
        ? (nutrition.carbs * 4) / nutrition.calories : 0.0;
    final fatPct = nutrition.fat > 0 && nutrition.calories > 0
        ? (nutrition.fat * 9) / nutrition.calories : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Calorie ring summary
          _CalorieRing(nutrition: nutrition, targets: targets),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              CircularGauge(value: nutrition.protein, label: 'Protein (g)', maxValue: targets.protein.toDouble(), color: AppColors.success),
              CircularGauge(value: nutrition.carbs, label: 'Carbs (g)', maxValue: targets.carbs.toDouble(), color: AppColors.warning),
              CircularGauge(value: nutrition.fat, label: 'Fat (g)', maxValue: targets.fat.toDouble(), color: AppColors.fatigued),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              CircularGauge(value: nutrition.water, label: 'Water (L)', maxValue: targets.water, color: AppColors.peaked),
            ],
          ),
          const SizedBox(height: 20),
          // Macro breakdown
          _SectionCard(
            title: 'Macro Breakdown',
            child: Column(
              children: [
                _MacroBar(label: 'Protein', percent: proteinPct, grams: nutrition.protein, color: AppColors.success),
                const SizedBox(height: 8),
                _MacroBar(label: 'Carbs', percent: carbsPct, grams: nutrition.carbs, color: AppColors.warning),
                const SizedBox(height: 8),
                _MacroBar(label: 'Fat', percent: fatPct, grams: nutrition.fat, color: AppColors.fatigued),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Water tracker
          _WaterTracker(
            currentWater: nutrition.water,
            waterGoal: targets.water,
            onAdd: () {
              final updated = nutrition.copyWith(water: nutrition.water + 0.25);
              ref.read(nutritionProvider(today).notifier).save(updated);
            },
          ),
          const SizedBox(height: 12),
          // 7-day trends
          _NutritionTrendsSection(),
        ],
      ),
    );
  }
}

class _CalorieRing extends StatelessWidget {
  const _CalorieRing({required this.nutrition, required this.targets});
  final NutritionLog nutrition;
  final NutritionTargets targets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goal = targets.calories.toDouble();
    final pct = (nutrition.calories / goal).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: CircularProgressIndicator(
              value: pct,
              strokeWidth: 8,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${nutrition.calories.toInt()} / ${goal.toInt()}',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text('kcal eaten', style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 4),
              Text(
                '${(goal - nutrition.calories).clamp(0, goal).toInt()} kcal remaining',
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({required this.label, required this.percent, required this.grams, required this.color});
  final String label;
  final double percent;
  final double grams;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        SizedBox(
          width: 56,
          child: Text(label, style: theme.textTheme.bodySmall),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent.clamp(0.0, 1.0),
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              color: color,
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 44,
          child: Text(
            '${grams.toInt()}g',
            style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: color),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _WaterTracker extends StatelessWidget {
  const _WaterTracker({required this.currentWater, required this.onAdd, required this.waterGoal});
  final double currentWater;
  final VoidCallback onAdd;
  final double waterGoal;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final glasses = (currentWater / 0.25).floor();
    return _SectionCard(
      title: 'Water Intake',
      trailing: Text(
        '${currentWater.toStringAsFixed(2)}L / ${waterGoal.toStringAsFixed(1)}L',
        style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
      ),
      child: Row(
        children: List.generate(12, (i) => Expanded(
          child: GestureDetector(
            onTap: onAdd,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Icon(Icons.water_drop, size: 20,
                  color: i < glasses ? AppColors.peaked : Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5)),
            ),
          ),
        )),
      ),
    );
  }
}

class _NutritionTrendsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(nutritionAnalyticsProvider);
    final theme = Theme.of(context);

    return analyticsAsync.when(
      data: (analytics) {
        if (analytics.dailyData.isEmpty) return const SizedBox.shrink();
        return _SectionCard(
          title: '7-Day Calories',
          trailing: analytics.macroAdherenceScore > 0
              ? Text(
                  '${analytics.macroAdherenceScore.toStringAsFixed(0)}% adherence',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: analytics.macroAdherenceScore >= 80 ? AppColors.success : AppColors.warning,
                  ),
                )
              : null,
          child: SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: analytics.dailyData.length,
              itemBuilder: (context, index) {
                final day = analytics.dailyData[index];
                final barH = (day.calories / 3000 * 80).clamp(4.0, 80.0);
                return Container(
                  width: 44,
                  margin: const EdgeInsets.only(right: 6),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('${day.calories.toInt()}',
                          style: theme.textTheme.labelSmall?.copyWith(fontSize: 8)),
                      const SizedBox(height: 2),
                      Container(
                        width: 28,
                        height: barH,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('${day.date.day}/${day.date.month}',
                          style: theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.onSurfaceVariant, fontSize: 8)),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}

// ─── Shared section card ──────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.trailing});
  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trailingWidgets = trailing == null ? const <Widget>[] : <Widget>[trailing!];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const Spacer(),
              ...trailingWidgets,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
