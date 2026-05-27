import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/services/recipe_integration_service.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/widgets/add_food_bottom_sheet.dart';

class FoodSearchScreen extends ConsumerStatefulWidget {
  const FoodSearchScreen({super.key});

  @override
  ConsumerState<FoodSearchScreen> createState() => _FoodSearchScreenState();
}

class _FoodSearchScreenState extends ConsumerState<FoodSearchScreen> {
  final _searchCtl = TextEditingController();
  final _searchFocus = FocusNode();
  String _debouncedQuery = '';
  Timer? _debounce;

  // Recipe Integration variables
  bool _recipeEnabled = false;
  List<FoodItem> _recipeResults = [];
  bool _loadingRecipes = false;

  @override
  void initState() {
    super.initState();
    _searchCtl.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _searchFocus.requestFocus();
      _checkRecipeEnabled();
    });
  }

  Future<void> _checkRecipeEnabled() async {
    final settings = await RecipeIntegrationService.instance.getSettings();
    if (mounted) {
      setState(() {
        _recipeEnabled = settings['enabled'] == 'true';
      });
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtl.removeListener(_onSearchChanged);
    _searchCtl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        final query = _searchCtl.text.trim();
        setState(() {
          _debouncedQuery = query;
        });

        // Trigger recipe search if enabled
        if (_recipeEnabled && query.isNotEmpty) {
          setState(() => _loadingRecipes = true);
          RecipeIntegrationService.instance.searchRecipes(query).then((recipes) {
            if (mounted && _searchCtl.text.trim() == query) {
              setState(() {
                _recipeResults = recipes;
                _loadingRecipes = false;
              });
            }
          }).catchError((_) {
            if (mounted) {
              setState(() => _loadingRecipes = false);
            }
          });
        } else {
          setState(() {
            _recipeResults = [];
            _loadingRecipes = false;
          });
        }
      }
    });
  }

  void _logFood(FoodItem food, double multiplier) {
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final scaled = FoodItem(
      id: food.id,
      name: food.name,
      calories: (food.calories * multiplier).roundToDouble(),
      protein: (food.protein * multiplier).roundToDouble(),
      carbs: (food.carbs * multiplier).roundToDouble(),
      fat: (food.fat * multiplier).roundToDouble(),
      servingSize: (food.servingSize * multiplier).roundToDouble(),
      barcode: food.barcode,
    );
    ref.read(nutritionProvider(today).notifier).logFood(scaled);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(S.of(context).scanAddedToLog(scaled.name))),
    );
    context.pop();
  }

  void _toggleFavorite(FoodItem food) {
    final favProvider = ref.read(foodFavoritesProvider.notifier);
    final currentFood = food.copyWith(
      favoriteId: favProvider.favoriteIdFor(food.name, brand: food.brand),
    );
    favProvider.toggleFavorite(currentFood);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resultsAsync = _debouncedQuery.isEmpty
        ? const AsyncValue<List<FoodItem>>.data([])
        : ref.watch(foodSearchProvider(_debouncedQuery));
    final favoritesAsync = ref.watch(foodFavoritesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).foodSearchTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: SearchBar(
              controller: _searchCtl,
              focusNode: _searchFocus,
              hintText: S.of(context).foodSearchHint,
              leading: const Icon(Icons.search),
              trailing: [
                if (_searchCtl.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear, size: 20),
                    onPressed: () {
                      _searchCtl.clear();
                      setState(() {
                        _debouncedQuery = '';
                      });
                    },
                  ),
              ],
              onChanged: (_) => setState(() {}),
            ),
          ),
          if (_loadingRecipes)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 3),
              child: LinearProgressIndicator(minHeight: 2, backgroundColor: Colors.transparent),
            )
          else
            const SizedBox(height: 8),
          Expanded(
            child: resultsAsync.when(
              data: (results) {
                if (_debouncedQuery.isEmpty) {
                  return _buildInitialState(theme, favoritesAsync);
                }
                if (results.isEmpty) {
                  return _buildNoResultsState(theme);
                }
                return _buildResultsList(results, theme);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _buildErrorState(e, theme),
            ),
          ),
          _buildActionButtons(theme),
        ],
      ),
    );
  }

  Widget _buildInitialState(ThemeData theme, AsyncValue<List<FoodItem>> favoritesAsync) {
    return favoritesAsync.when(
      data: (favorites) {
        if (favorites.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.search, size: 48, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
                const SizedBox(height: 12),
                Text(
                  S.of(context).foodSearchHint,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Row(
                children: [
                  const Icon(Icons.star, size: 18, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    'Favorites',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${favorites.length}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                itemCount: favorites.length,
                itemBuilder: (context, index) {
                  final food = favorites[index];
                  return _FoodResultTile(
                    food: food.copyWith(favoriteId: food.favoriteId),
                    onLog: (m) => _logFood(food, m),
                    onToggleFavorite: () => _toggleFavorite(food),
                  );
                },
              ),
            ),
          ],
        );
      },
      loading: () => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 48, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              S.of(context).foodSearchHint,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
      error: (_, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 48, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              S.of(context).foodSearchHint,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoResultsState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 48, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              S.of(context).foodSearchNoResults,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              S.of(context).foodSearchNoResultsMessage,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => showAddFoodBottomSheet(context, ref),
              icon: const Icon(Icons.edit_note),
              label: Text(S.of(context).foodAddManually),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsList(List<FoodItem> results, ThemeData theme) {
    final favNotifier = ref.read(foodFavoritesProvider.notifier);
    final allResults = [..._recipeResults, ...results];

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      itemCount: allResults.length + 1 + (_recipeResults.isNotEmpty ? 1 : 0),
      itemBuilder: (context, index) {
        if (_recipeResults.isNotEmpty) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.receipt_long, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    S.of(context).recipeMatchesTitle,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            );
          }
          index = index - 1;
        }

        if (index == allResults.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: OutlinedButton.icon(
                onPressed: () => showAddFoodBottomSheet(context, ref),
                icon: const Icon(Icons.edit_note),
                label: Text(S.of(context).foodAddManually),
              ),
            ),
          );
        }
        final food = allResults[index];
        final enrichedFood = food.copyWith(
          favoriteId: favNotifier.favoriteIdFor(food.name, brand: food.brand),
        );
        return _FoodResultTile(
          food: enrichedFood,
          onLog: (m) => _logFood(food, m),
          onToggleFavorite: () => _toggleFavorite(food),
        );
      },
    );
  }

  Widget _buildErrorState(Object error, ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, size: 48, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              S.of(context).foodSearchNoResults,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              S.of(context).foodSearchNoResultsMessage,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => showAddFoodBottomSheet(context, ref),
              icon: const Icon(Icons.edit_note),
              label: Text(S.of(context).foodAddManually),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: theme.dividerColor, width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => showAddFoodBottomSheet(context, ref),
                icon: const Icon(Icons.edit_note, size: 18),
                label: Text(S.of(context).nutritionManual),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final result = await context.push<FoodItem?>('/health/scan');
                  if (result != null && mounted) {
                    _logFood(result, 1.0);
                  }
                },
                icon: const Icon(Icons.qr_code_scanner, size: 18),
                label: Text(S.of(context).nutritionScan),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final result = await context.push<FoodItem?>('/health/ai-scan');
                  if (result != null && mounted) {
                    _logFood(result, 1.0);
                  }
                },
                icon: const Icon(Icons.auto_awesome, size: 18),
                label: Text(S.of(context).healthAiScan),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FoodResultTile extends StatefulWidget {
  const _FoodResultTile({
    required this.food,
    required this.onLog,
    required this.onToggleFavorite,
  });

  final FoodItem food;
  final ValueChanged<double> onLog;
  final VoidCallback onToggleFavorite;

  @override
  State<_FoodResultTile> createState() => _FoodResultTileState();
}

class _FoodResultTileState extends State<_FoodResultTile> {
  bool _expanded = false;
  double _multiplier = 1.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final food = widget.food;
    final m = _multiplier;
    final scaledCal = (food.calories * m).round();
    final scaledProtein = (food.protein * m).round();
    final scaledCarbs = (food.carbs * m).round();
    final scaledFat = (food.fat * m).round();

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              title: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          food.name,
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        if (food.servingSize > 0)
                          Padding(
                            padding: const EdgeInsets.only(top: 2.0),
                            child: Text(
                              '${food.brand != null && food.brand!.isNotEmpty ? "${food.brand} • " : ""}${food.servingSize.toInt()}g',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 11,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: widget.onToggleFavorite,
                    child: Icon(
                      food.isFavorite ? Icons.star : Icons.star_border,
                      size: 20,
                      color: food.isFavorite ? AppColors.primary : AppColors.onSurfaceVariant.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
              subtitle: Row(
                children: [
                  _MacroChip('$scaledCal', S.of(context).scanCal, AppColors.primary),
                  const SizedBox(width: 6),
                  _MacroChip('${scaledProtein}g', 'P', AppColors.success),
                  const SizedBox(width: 6),
                  _MacroChip('${scaledCarbs}g', 'C', AppColors.warning),
                  const SizedBox(width: 6),
                  _MacroChip('${scaledFat}g', 'F', AppColors.fatigued),
                ],
              ),
              trailing: Icon(_expanded ? Icons.expand_less : Icons.expand_more),
              onTap: () => setState(() => _expanded = !_expanded),
            ),
            if (_expanded) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Column(
                  children: [
                    _PortionControl(
                      multiplier: m,
                      servingSize: food.servingSize,
                      onChanged: (v) => setState(() => _multiplier = v),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => widget.onLog(m),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(S.of(context).scanAddToLog),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MacroChip extends StatelessWidget {
  const _MacroChip(this.value, this.label, this.color);

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$value $label',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: color,
          fontSize: 10,
        ),
      ),
    );
  }
}

class _PortionControl extends StatelessWidget {
  const _PortionControl({
    required this.multiplier,
    required this.servingSize,
    required this.onChanged,
  });

  final double multiplier;
  final double servingSize;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.tune, size: 16, color: AppColors.primary),
            const SizedBox(width: 6),
            Text(
              S.of(context).nutritionPortion,
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '${multiplier.toStringAsFixed(multiplier == multiplier.roundToDouble() ? 0 : 1)}x${servingSize > 0 ? " (${(servingSize * multiplier).toInt()}g)" : ""}',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: AppColors.primary,
            inactiveTrackColor: AppColors.primary.withValues(alpha: 0.15),
            thumbColor: AppColors.primary,
            overlayColor: AppColors.primary.withValues(alpha: 0.12),
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
          ),
          child: Slider(
            value: multiplier,
            min: 0.25,
            max: 3.0,
            divisions: 11,
            onChanged: onChanged,
          ),
        ),
        Wrap(
          spacing: 6,
          children: [0.5, 1.0, 1.5, 2.0].map((v) {
            final selected = (multiplier - v).abs() < 0.01;
            return ChoiceChip(
              label: Text('${v == v.roundToDouble() ? v.toInt() : v}x'),
              selected: selected,
              onSelected: (_) => onChanged(v),
              labelStyle: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.onSurfaceVariant,
              ),
              selectedColor: AppColors.primary,
              backgroundColor: theme.colorScheme.surfaceContainerHigh,
              side: BorderSide.none,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 4),
            );
          }).toList(),
        ),
      ],
    );
  }
}
