import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/data/services/recipe_integration_service.dart';

class NutritionLibraryScreen extends ConsumerStatefulWidget {
  const NutritionLibraryScreen({super.key});

  @override
  ConsumerState<NutritionLibraryScreen> createState() =>
      _NutritionLibraryScreenState();
}

class _NutritionLibraryScreenState extends ConsumerState<NutritionLibraryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _recipeSearchController = TextEditingController();

  // Recipe Integration State
  Timer? _debounceTimer;
  List<FoodItem> _recipeResults = [];
  bool _isLoadingRecipes = false;
  Map<String, String> _recipeSettings = {};
  bool _isRecipeEnabled = false;

  // Meal Expansion States
  final Set<String> _expandedMealIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadRecipeSettings();
  }

  Future<void> _loadRecipeSettings() async {
    final settings = await RecipeIntegrationService.instance.getSettings();
    if (mounted) {
      setState(() {
        _recipeSettings = settings;
        _isRecipeEnabled = settings['enabled'] == 'true';
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _recipeSearchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onRecipeSearchChanged(String query) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      if (query.trim().isEmpty) {
        setState(() {
          _recipeResults = [];
        });
        return;
      }
      setState(() {
        _isLoadingRecipes = true;
      });
      try {
        final results = await RecipeIntegrationService.instance.searchRecipes(
          query,
        );
        if (mounted) {
          setState(() {
            _recipeResults = results;
            _isLoadingRecipes = false;
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _isLoadingRecipes = false;
            _recipeResults = [];
          });
        }
      }
    });
  }

  // --- ACTIONS ---

  void _logFoodDirect(FoodItem food, double multiplier) {
    final today = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
    );
    final scaled = FoodItem(
      id: food.id,
      name: food.name,
      calories: (food.calories * multiplier).roundToDouble(),
      protein: (food.protein * multiplier).roundToDouble(),
      carbs: (food.carbs * multiplier).roundToDouble(),
      fat: (food.fat * multiplier).roundToDouble(),
      servingSize: (food.servingSize * multiplier).roundToDouble(),
      brand: food.brand,
      barcode: food.barcode,
    );

    ref.read(nutritionProvider(today).notifier).logFood(scaled);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Logged ${scaled.name} (${scaled.servingSize.round()}g) to today\'s nutrition log',
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _showAdjustPortionDialog(FoodItem food) {
    double multiplier = 1.0;
    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Theme.of(context).colorScheme.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: Text(
                'Adjust Portion for ${food.name}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Base Portion: ${food.servingSize.round()}g',
                    style: const TextStyle(color: AppColors.onSurfaceVariant),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Logged Portion: ${(food.servingSize * multiplier).round()}g',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Slider(
                    value: multiplier,
                    min: 0.1,
                    max: 5.0,
                    divisions: 49,
                    label: '${multiplier.toStringAsFixed(1)}x',
                    onChanged: (val) {
                      setDialogState(() {
                        multiplier = val;
                      });
                    },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: () => setDialogState(() => multiplier = 0.5),
                        child: const Text('0.5x'),
                      ),
                      TextButton(
                        onPressed: () => setDialogState(() => multiplier = 1.0),
                        child: const Text('1.0x'),
                      ),
                      TextButton(
                        onPressed: () => setDialogState(() => multiplier = 1.5),
                        child: const Text('1.5x'),
                      ),
                      TextButton(
                        onPressed: () => setDialogState(() => multiplier = 2.0),
                        child: const Text('2.0x'),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _logFoodDirect(food, multiplier);
                  },
                  child: const Text('Log Portion'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _logWholeSavedMeal(SavedMeal meal) {
    final today = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
    );
    ref
        .read(nutritionProvider(today).notifier)
        .logSavedMeal(meal, mealType: 'snack');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Logged Saved Meal: "${meal.name}" (${meal.totalCalories.round()} kcal)',
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _deleteSavedMeal(SavedMeal meal) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Saved Meal'),
        content: Text('Are you sure you want to delete "${meal.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(savedMealsProvider.notifier).delete(meal.id);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Deleted saved meal "${meal.name}"'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  void _editSavedMeal(SavedMeal meal) {
    final nameCtl = TextEditingController(text: meal.name);
    final itemCtrls = meal.items.map((item) {
      return {
        'name': TextEditingController(text: item.name),
        'grams': TextEditingController(
          text: item.estimatedGrams.toStringAsFixed(0),
        ),
        'calories': TextEditingController(
          text: item.calories.toStringAsFixed(0),
        ),
        'protein': TextEditingController(text: item.protein.toStringAsFixed(0)),
        'carbs': TextEditingController(text: item.carbs.toStringAsFixed(0)),
        'fat': TextEditingController(text: item.fat.toStringAsFixed(0)),
      };
    }).toList();
    final removed = <int>{};

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              20,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Edit Saved Meal',
                    style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtl,
                    decoration: const InputDecoration(
                      labelText: 'Meal name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...List.generate(itemCtrls.length, (index) {
                    if (removed.contains(index)) return const SizedBox.shrink();
                    final ctrls = itemCtrls[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: ctrls['name'],
                                  decoration: const InputDecoration(
                                    labelText: 'Food',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                              IconButton(
                                onPressed: () =>
                                    setDialogState(() => removed.add(index)),
                                icon: const Icon(
                                  Icons.delete_outline,
                                  color: AppColors.error,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _editNumberField(ctrls['grams']!, 'g'),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _editNumberField(
                                  ctrls['calories']!,
                                  'kcal',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _editNumberField(ctrls['protein']!, 'P'),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _editNumberField(ctrls['carbs']!, 'C'),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _editNumberField(ctrls['fat']!, 'F'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        final name = nameCtl.text.trim();
                        if (name.isEmpty) return;
                        final items = <FoodItem>[];
                        for (var i = 0; i < itemCtrls.length; i++) {
                          if (removed.contains(i)) continue;
                          final ctrls = itemCtrls[i];
                          final itemName = ctrls['name']!.text.trim();
                          if (itemName.isEmpty) continue;
                          items.add(
                            FoodItem(
                              id: 0,
                              name: itemName,
                              servingSize:
                                  double.tryParse(ctrls['grams']!.text) ?? 0,
                              calories:
                                  double.tryParse(ctrls['calories']!.text) ?? 0,
                              protein:
                                  double.tryParse(ctrls['protein']!.text) ?? 0,
                              carbs: double.tryParse(ctrls['carbs']!.text) ?? 0,
                              fat: double.tryParse(ctrls['fat']!.text) ?? 0,
                            ),
                          );
                        }
                        if (items.isEmpty) return;
                        ref
                            .read(savedMealsProvider.notifier)
                            .edit(meal.id, name, items);
                        Navigator.pop(ctx);
                      },
                      child: const Text('Save'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ).whenComplete(() {
      nameCtl.dispose();
      for (final ctrls in itemCtrls) {
        for (final controller in ctrls.values) {
          controller.dispose();
        }
      }
    });
  }

  Widget _editNumberField(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
    );
  }

  // --- UI BUILDING ---

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final favoritesAsync = ref.watch(foodFavoritesProvider);
    final savedMealsAsync = ref.watch(savedMealsProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text(
          'Nutrition Library',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Container(
              height: 48,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.5,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: theme.colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: theme.colorScheme.onPrimary,
                unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w500,
                ),
                dividerColor: Colors.transparent,
                tabs: const [
                  Tab(text: '★ Favorites'),
                  Tab(text: '🥣 Saved Meals'),
                  Tab(text: '📖 Recipes'),
                ],
              ),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Favorites Tab
          _buildFavoritesTab(favoritesAsync),

          // Saved Meals Tab
          _buildSavedMealsTab(savedMealsAsync),

          // Recipes Tab
          _buildRecipesTab(),
        ],
      ),
    );
  }

  // --- TAB 1: FAVORITES ---

  Widget _buildFavoritesTab(AsyncValue<List<FoodItem>> favoritesAsync) {
    return favoritesAsync.when(
      data: (favorites) {
        if (favorites.isEmpty) {
          return _buildEmptyPlaceholder(
            icon: Icons.star_border,
            title: 'No Favorites Yet',
            subtitle:
                'Tap the star icon when searching or viewing foods to save them here for single-tap logging.',
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: favorites.length,
          itemBuilder: (context, index) {
            final food = favorites[index];
            return Dismissible(
              key: Key('fav-${food.favoriteId ?? food.name}'),
              direction: DismissDirection.endToStart,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.delete_outline, color: Colors.white),
              ),
              onDismissed: (_) {
                final favNotifier = ref.read(foodFavoritesProvider.notifier);
                final currentFood = food.copyWith(
                  favoriteId: favNotifier.favoriteIdFor(
                    food.name,
                    brand: food.brand,
                  ),
                );
                favNotifier.toggleFavorite(currentFood);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Removed ${food.name} from Favorites'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: Theme.of(
                      context,
                    ).colorScheme.outlineVariant.withValues(alpha: 0.5),
                  ),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  title: Text(
                    food.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (food.brand != null && food.brand!.isNotEmpty)
                        Text(
                          food.brand!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          _buildMacroChip(
                            'P',
                            '${food.protein.round()}g',
                            AppColors.success,
                          ),
                          const SizedBox(width: 6),
                          _buildMacroChip(
                            'C',
                            '${food.carbs.round()}g',
                            AppColors.warning,
                          ),
                          const SizedBox(width: 6),
                          _buildMacroChip(
                            'F',
                            '${food.fat.round()}g',
                            AppColors.fatigued,
                          ),
                          const Spacer(),
                          Text(
                            '${food.servingSize.round()}g',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${food.calories.round()} kcal',
                          style: const TextStyle(
                            color: AppColors.warning,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        icon: const Icon(
                          Icons.tune_outlined,
                          color: AppColors.primary,
                        ),
                        onPressed: () => _showAdjustPortionDialog(food),
                        tooltip: 'Adjust portion',
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.add_circle,
                          color: AppColors.success,
                          size: 28,
                        ),
                        onPressed: () => _logFoodDirect(food, 1.0),
                        tooltip: 'Log directly',
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Failed to load favorites: $e')),
    );
  }

  // --- TAB 2: SAVED MEALS ---

  Widget _buildSavedMealsTab(AsyncValue<List<SavedMeal>> savedMealsAsync) {
    return savedMealsAsync.when(
      data: (meals) {
        if (meals.isEmpty) {
          return _buildEmptyPlaceholder(
            icon: Icons.restaurant_menu,
            title: 'No Saved Meals',
            subtitle:
                'You can save a whole day\'s logs as a meal by clicking "Save Today\'s Logs as Meal" on the main nutrition dashboard.',
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: meals.length,
          itemBuilder: (context, index) {
            final meal = meals[index];
            final isExpanded = _expandedMealIds.contains(meal.id);

            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: Theme.of(
                    context,
                  ).colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
              ),
              child: Theme(
                data: Theme.of(
                  context,
                ).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  key: PageStorageKey<String>('meal-${meal.id}'),
                  initiallyExpanded: isExpanded,
                  onExpansionChanged: (expanded) {
                    setState(() {
                      if (expanded) {
                        _expandedMealIds.add(meal.id);
                      } else {
                        _expandedMealIds.remove(meal.id);
                      }
                    });
                  },
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(
                      context,
                    ).colorScheme.primaryContainer,
                    child: Icon(
                      Icons.restaurant,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  title: Text(
                    meal.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Row(
                      children: [
                        Text(
                          '${meal.totalCalories.round()} kcal',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppColors.warning,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'P: ${meal.totalProtein.round()}g • C: ${meal.totalCarbs.round()}g • F: ${meal.totalFat.round()}g',
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      PopupMenuButton<String>(
                        onSelected: (value) {
                          if (value == 'edit') {
                            _editSavedMeal(meal);
                          } else if (value == 'delete') {
                            _deleteSavedMeal(meal);
                          }
                        },
                        itemBuilder: (context) => const [
                          PopupMenuItem(value: 'edit', child: Text('Edit')),
                          PopupMenuItem(value: 'delete', child: Text('Delete')),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          backgroundColor: AppColors.success,
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Log Meal'),
                        onPressed: () => _logWholeSavedMeal(meal),
                      ),
                    ],
                  ),
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest
                            .withValues(alpha: 0.3),
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(16),
                          bottomRight: Radius.circular(16),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(),
                          const Text(
                            'MEAL ITEMS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...meal.items.map(
                            (item) => Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 4.0,
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.radio_button_checked,
                                    size: 8,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      item.name,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${item.estimatedGrams.round()}g • ${item.calories.round()} kcal',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Failed to load saved meals: $e')),
    );
  }

  // --- TAB 3: RECIPES ---

  Widget _buildRecipesTab() {
    if (!_isRecipeEnabled) {
      return _buildEmptyPlaceholder(
        icon: Icons.cloud_off,
        title: 'Recipe Sync Disabled',
        subtitle:
            'Connect to your self-hosted Mealie or Tandoor instance in settings to sync recipes and custom planned food macros directly here.',
        action: ElevatedButton.icon(
          onPressed: () => context.push('/settings/recipe'),
          icon: const Icon(Icons.settings),
          label: const Text('Configure Integration'),
        ),
      );
    }

    final theme = Theme.of(context);

    return Column(
      children: [
        // Search bar & status card
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withValues(
                    alpha: 0.3,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.sync,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Connected to ${_recipeSettings['type']?.toUpperCase()}: ${_recipeSettings['url']}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    InkWell(
                      onTap: _loadRecipeSettings,
                      child: const Icon(Icons.refresh, size: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _recipeSearchController,
                onChanged: _onRecipeSearchChanged,
                decoration: InputDecoration(
                  hintText: 'Search Mealie/Tandoor recipes...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _recipeSearchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _recipeSearchController.clear();
                            setState(() {
                              _recipeResults = [];
                            });
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Results
        Expanded(
          child: _isLoadingRecipes
              ? const Center(child: CircularProgressIndicator())
              : _recipeResults.isEmpty
              ? _recipeSearchController.text.isEmpty
                    ? _buildEmptyPlaceholder(
                        icon: Icons.search,
                        title: 'Search Recipes',
                        subtitle:
                            'Type in the box above to find and search self-hosted recipes from Mealie/Tandoor.',
                      )
                    : _buildEmptyPlaceholder(
                        icon: Icons.no_food_outlined,
                        title: 'No Recipes Found',
                        subtitle:
                            'No recipes matched your search query. Try another term.',
                      )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _recipeResults.length,
                  itemBuilder: (context, index) {
                    final recipe = _recipeResults[index];
                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: Theme.of(
                            context,
                          ).colorScheme.outlineVariant.withValues(alpha: 0.5),
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        title: Text(
                          recipe.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              recipe.brand ?? 'Synced Recipe',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                _buildMacroChip(
                                  'P',
                                  '${recipe.protein.round()}g',
                                  AppColors.success,
                                ),
                                const SizedBox(width: 6),
                                _buildMacroChip(
                                  'C',
                                  '${recipe.carbs.round()}g',
                                  AppColors.warning,
                                ),
                                const SizedBox(width: 6),
                                _buildMacroChip(
                                  'F',
                                  '${recipe.fat.round()}g',
                                  AppColors.fatigued,
                                ),
                              ],
                            ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.warning.withValues(
                                  alpha: 0.15,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${recipe.calories.round()} kcal',
                                style: const TextStyle(
                                  color: AppColors.warning,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            IconButton(
                              icon: const Icon(
                                Icons.add_circle,
                                color: AppColors.success,
                                size: 28,
                              ),
                              onPressed: () => _logFoodDirect(recipe, 1.0),
                              tooltip: 'Log Recipe Food',
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // --- REUSABLE UTILITIES ---

  Widget _buildMacroChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildEmptyPlaceholder({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? action,
  }) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 72,
              color: Theme.of(
                context,
              ).colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[const SizedBox(height: 24), action],
          ],
        ),
      ),
    );
  }
}
