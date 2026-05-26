import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/domain/entities/meal_suggestion_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/meal_suggestion_providers.dart';
import 'package:runflow_flutter/presentation/providers/nutrition_targets_provider.dart';
import 'package:runflow_flutter/presentation/widgets/ai_meal_suggestion_sheet.dart';
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
        title: Text(S.of(context).healthNutrition),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            onPressed: () => _showTargetsDialog(context, ref),
            icon: const Icon(Icons.settings_outlined, color: AppColors.onSurfaceVariant),
            tooltip: S.of(context).nutritionSetTargets,
          ),
          IconButton(
            onPressed: () => _showMealSuggestion(context, ref),
            icon: const Icon(Icons.auto_awesome, color: AppColors.primary),
            tooltip: S.of(context).nutritionAiMealSuggestion,
          ),
          IconButton(
            onPressed: () => context.push('/health/scan'),
            icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
            tooltip: S.of(context).healthScanBarcode,
          ),
        ],
      ),
      body: nutritionAsync.when(
        data: (nutrition) {
          final targetsAsync = ref.watch(nutritionTargetsProvider);
          final rawTargets = targetsAsync.asData?.value ??
              NutritionTargets.defaults;
          final targets = rawTargets.water > 20
              ? rawTargets.copyWith(water: rawTargets.water / 1000)
              : rawTargets;
          return _NutritionContent(
              nutrition: nutrition, ref: ref, today: today, targets: targets);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('${S.of(context).actionError}: $e', style: theme.textTheme.bodyMedium),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(nutritionProvider(today)),
                child: Text(S.of(context).actionRetry),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/health/food-search'),
        icon: const Icon(Icons.add),
        label: Text(S.of(context).nutritionAddFood),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _showTargetsDialog(BuildContext context, WidgetRef ref) {
    final targetsAsync = ref.read(nutritionTargetsProvider);
    final rawTargets = targetsAsync.asData?.value ??
        NutritionTargets.defaults;
    final targets = rawTargets.water > 20
        ? rawTargets.copyWith(water: rawTargets.water / 1000)
        : rawTargets;
    final calCtl = TextEditingController(text: targets.calories.toString());
    final proteinCtl =
        TextEditingController(text: targets.protein.toString());
    final carbsCtl = TextEditingController(text: targets.carbs.toString());
    final fatCtl = TextEditingController(text: targets.fat.toString());
    final waterCtl = TextEditingController(text: targets.water.toString());
    var waterTrackingEnabled = targets.waterTrackingEnabled;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return Padding(
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
                Text(S.of(context).nutritionTargetsTitle,
                    style: Theme.of(ctx)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                TextField(
                    controller: calCtl,
                    decoration: InputDecoration(
                        labelText: S.of(context).nutritionCaloriesKcal),
                    keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                Text(
                  S.of(context).nutritionMacroPresets,
                  style: Theme.of(ctx).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildPresetChip(
                        context: ctx,
                        label: S.of(context).nutritionBalancedPreset,
                        onTap: () {
                          final cal = double.tryParse(calCtl.text) ?? 2000.0;
                          setDialogState(() {
                            proteinCtl.text = ((cal * 0.30) / 4).round().toString();
                            carbsCtl.text = ((cal * 0.40) / 4).round().toString();
                            fatCtl.text = ((cal * 0.30) / 9).round().toString();
                          });
                        },
                      ),
                      const SizedBox(width: 8),
                      _buildPresetChip(
                        context: ctx,
                        label: S.of(context).nutritionLowCarbPreset,
                        onTap: () {
                          final cal = double.tryParse(calCtl.text) ?? 2000.0;
                          setDialogState(() {
                            proteinCtl.text = ((cal * 0.30) / 4).round().toString();
                            carbsCtl.text = ((cal * 0.10) / 4).round().toString();
                            fatCtl.text = ((cal * 0.60) / 9).round().toString();
                          });
                        },
                      ),
                      const SizedBox(width: 8),
                      _buildPresetChip(
                        context: ctx,
                        label: S.of(context).nutritionHighProteinPreset,
                        onTap: () {
                          final cal = double.tryParse(calCtl.text) ?? 2000.0;
                          setDialogState(() {
                            proteinCtl.text = ((cal * 0.40) / 4).round().toString();
                            carbsCtl.text = ((cal * 0.35) / 4).round().toString();
                            fatCtl.text = ((cal * 0.25) / 9).round().toString();
                          });
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                        child: TextField(
                            controller: proteinCtl,
                            decoration: InputDecoration(
                                labelText: S.of(context).nutritionProteinG),
                            keyboardType: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(
                        child: TextField(
                            controller: carbsCtl,
                            decoration: InputDecoration(
                                labelText: S.of(context).nutritionCarbsG),
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
                                InputDecoration(labelText: S.of(context).nutritionFatG),
                            keyboardType: TextInputType.number)),
                    if (waterTrackingEnabled) ...[
                      const SizedBox(width: 8),
                      Expanded(
                          child: TextField(
                              controller: waterCtl,
                              decoration: InputDecoration(
                                  labelText: S.of(context).nutritionWaterL),
                              keyboardType: TextInputType.number)),
                    ],
                  ],
                ),
                const SizedBox(height: 10),
                SwitchListTile(
                  title: Text(S.of(context).nutritionTrackWater),
                  value: waterTrackingEnabled,
                  onChanged: (val) => setDialogState(() => waterTrackingEnabled = val),
                  contentPadding: EdgeInsets.zero,
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
                        waterTrackingEnabled: waterTrackingEnabled,
                      );
                      updateNutritionTargets(ref, newTargets);
                      Navigator.pop(ctx);
                    },
                    child: Text(S.of(context).actionSave),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    ).whenComplete(() {
      calCtl.dispose();
      proteinCtl.dispose();
      carbsCtl.dispose();
      fatCtl.dispose();
      waterCtl.dispose();
    });
  }

  void _showMealSuggestion(BuildContext context, WidgetRef ref) {
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final nutrition = ref.read(nutritionProvider(today)).asData?.value;
    final targets = ref.read(nutritionTargetsProvider).asData?.value ?? NutritionTargets.defaults;

    if (nutrition == null) return;

    final remainingCalories = (targets.calories - nutrition.calories).clamp(0.0, double.infinity);
    final remainingProtein = (targets.protein - nutrition.protein).clamp(0.0, double.infinity);
    final remainingCarbs = (targets.carbs - nutrition.carbs).clamp(0.0, double.infinity);
    final remainingFats = (targets.fat - nutrition.fat).clamp(0.0, double.infinity);

    ref.read(mealSuggestionProvider.notifier).reset();

    showModalBottomSheet<AiMealSuggestion>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AiMealSuggestionSheet(
        remainingCalories: remainingCalories,
        remainingProtein: remainingProtein,
        remainingCarbs: remainingCarbs,
        remainingFats: remainingFats,
      ),
    ).then((suggestion) {
      if (suggestion != null) {
        final food = FoodItem(
          id: 0,
          name: suggestion.suggestionName,
          calories: suggestion.totalCalories,
          protein: suggestion.totalProtein,
          carbs: suggestion.totalCarbs,
          fat: suggestion.totalFats,
          servingSize: 100,
        );
        ref.read(nutritionProvider(today).notifier).logFood(food);
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).nutritionMealLogged)),
        );
      }
    });
  }

  Widget _buildPresetChip({
    required BuildContext context,
    required String label,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
      labelStyle: theme.textTheme.labelMedium?.copyWith(
        fontSize: 11,
        color: AppColors.primary,
        fontWeight: FontWeight.w600,
      ),
      backgroundColor: theme.colorScheme.surfaceContainerHighest,
      side: const BorderSide(color: AppColors.primary, width: 0.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
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
              CircularGauge(value: nutrition.protein, label: S.of(context).nutritionProteinG, maxValue: targets.protein.toDouble(), color: AppColors.success),
              CircularGauge(value: nutrition.carbs, label: S.of(context).nutritionCarbsG, maxValue: targets.carbs.toDouble(), color: AppColors.warning),
              CircularGauge(value: nutrition.fat, label: S.of(context).nutritionFatG, maxValue: targets.fat.toDouble(), color: AppColors.fatigued),
            ],
          ),
          const SizedBox(height: 8),
          if (targets.waterTrackingEnabled)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                CircularGauge(value: nutrition.water, label: S.of(context).nutritionWaterL, maxValue: targets.water, color: AppColors.peaked),
              ],
            ),
          const SizedBox(height: 20),
          // Macro breakdown
          _SectionCard(
            title: S.of(context).nutritionMacroBreakdown,
            child: Column(
              children: [
                _MacroBar(label: S.of(context).nutritionProteinG, percent: proteinPct, grams: nutrition.protein, color: AppColors.success),
                const SizedBox(height: 8),
                _MacroBar(label: S.of(context).nutritionCarbs, percent: carbsPct, grams: nutrition.carbs, color: AppColors.warning),
                const SizedBox(height: 8),
                _MacroBar(label: S.of(context).nutritionFatLabel, percent: fatPct, grams: nutrition.fat, color: AppColors.fatigued),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (targets.waterTrackingEnabled) ...[
            _WaterTracker(
              currentWater: nutrition.water,
              waterGoal: targets.water,
              onUpdate: (amount) {
                final updated = nutrition.copyWith(
                  water: (nutrition.water + amount).clamp(0.0, double.infinity),
                );
                ref.read(nutritionProvider(today).notifier).save(updated);
              },
            ),
            const SizedBox(height: 12),
          ],
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
    final isDark = theme.brightness == Brightness.dark;
    final goal = targets.calories.toDouble();
    final pct = (nutrition.calories / goal).clamp(0.0, 1.0);

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, value, childWidget) {
        return Transform.translate(
          offset: Offset(0.0, 30.0 * (1.0 - value)),
          child: Opacity(
            opacity: value,
            child: childWidget,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          // Glassmorphic background
          color: isDark
              ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.65)
              : theme.colorScheme.surface.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(
                value: pct,
                strokeWidth: 8,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
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
                  S.of(context).nutritionKcalRemaining((goal - nutrition.calories).clamp(0, goal).toInt()),
                  style: theme.textTheme.bodySmall?.copyWith(color: AppColors.primary),
                ),
              ],
            ),
          ],
        ),
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

class _WaterTracker extends StatefulWidget {
  const _WaterTracker({
    required this.currentWater,
    required this.waterGoal,
    required this.onUpdate,
  });

  final double currentWater;
  final double waterGoal;
  final ValueChanged<double> onUpdate;

  @override
  State<_WaterTracker> createState() => _WaterTrackerState();
}

class _WaterTrackerState extends State<_WaterTracker> {
  double _selectedGlassSize = 0.25; // default 250ml

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goal = widget.waterGoal;
    final current = widget.currentWater;
    
    // Number of cups/drops to show
    final totalDrops = (goal / _selectedGlassSize).ceil().clamp(1, 16);
    final filledDrops = (current / _selectedGlassSize).floor();

    return _SectionCard(
      title: S.of(context).nutritionWaterIntake,
      trailing: Text(
        '${current.toStringAsFixed(2)}L / ${goal.toStringAsFixed(1)}L',
        style: theme.textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.bold,
          color: AppColors.peaked,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick glass size selector
          Row(
            children: [
              Text(
                S.of(context).nutritionCupSize,
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
              ),
              const SizedBox(width: 8),
              Wrap(
                spacing: 6,
                children: [0.25, 0.33, 0.50].map((size) {
                  final isSelected = (_selectedGlassSize - size).abs() < 0.01;
                  final sizeName = size >= 1.0 ? '${size}L' : '${(size * 1000).round()}ml';
                  return ChoiceChip(
                    label: Text(sizeName),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) {
                        setState(() {
                          _selectedGlassSize = size;
                        });
                      }
                    },
                    visualDensity: VisualDensity.compact,
                    labelStyle: theme.textTheme.labelSmall?.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : AppColors.onSurfaceVariant,
                    ),
                    selectedColor: AppColors.peaked,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                    side: BorderSide.none,
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Interactive dynamic water drops grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 8,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
            ),
            itemCount: totalDrops,
            itemBuilder: (context, i) {
              final isFilled = i < filledDrops;
              return GestureDetector(
                onTap: () {
                  if (isFilled) {
                    widget.onUpdate(-_selectedGlassSize);
                  } else {
                    widget.onUpdate(_selectedGlassSize);
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: isFilled 
                        ? AppColors.peaked.withValues(alpha: 0.15) 
                        : theme.colorScheme.surfaceContainerHighest,
                    border: Border.all(
                      color: isFilled ? AppColors.peaked : Colors.transparent,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.water_drop,
                    size: 20,
                    color: isFilled 
                        ? AppColors.peaked 
                        : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          // Quick action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => widget.onUpdate(_selectedGlassSize),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.peaked),
                    foregroundColor: AppColors.peaked,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.add, size: 16),
                  label: Text(S.of(context).nutritionAddMl(( _selectedGlassSize * 1000 ).round())),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: current > 0 ? () => widget.onUpdate(-current) : null,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(S.of(context).nutritionReset),
              ),
            ],
          ),
        ],
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
          title: S.of(context).nutrition7DayCalories,
          trailing: analytics.macroAdherenceScore > 0
              ? Text(
                  S.of(context).nutritionAdherence(analytics.macroAdherenceScore.toStringAsFixed(0)),
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
    final isDark = theme.brightness == Brightness.dark;
    final trailingWidgets = trailing == null ? const <Widget>[] : <Widget>[trailing!];

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, value, childWidget) {
        return Transform.translate(
          offset: Offset(0.0, 30.0 * (1.0 - value)),
          child: Opacity(
            opacity: value,
            child: childWidget,
          ),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          // Glassmorphic background
          color: isDark
              ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.65)
              : theme.colorScheme.surface.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
                const Spacer(),
                ...trailingWidgets,
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}
