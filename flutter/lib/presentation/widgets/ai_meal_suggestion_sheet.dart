import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/meal_suggestion_entities.dart';
import 'package:runflow_flutter/presentation/providers/meal_suggestion_providers.dart';

class AiMealSuggestionSheet extends ConsumerStatefulWidget {
  const AiMealSuggestionSheet({
    super.key,
    required this.remainingCalories,
    required this.remainingProtein,
    required this.remainingCarbs,
    required this.remainingFats,
  });

  final double remainingCalories;
  final double remainingProtein;
  final double remainingCarbs;
  final double remainingFats;

  @override
  ConsumerState<AiMealSuggestionSheet> createState() =>
      _AiMealSuggestionSheetState();
}

class _AiMealSuggestionSheetState
    extends ConsumerState<AiMealSuggestionSheet> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(mealSuggestionProvider.notifier).getSuggestion(
            remainingCalories: widget.remainingCalories,
            remainingProtein: widget.remainingProtein,
            remainingCarbs: widget.remainingCarbs,
            remainingFats: widget.remainingFats,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(mealSuggestionProvider);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.auto_awesome,
                    color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI Meal Suggestion',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Flexible(
            child: state.when(
              loading: () => _buildLoading(theme),
              error: (e, _) => _buildError(theme, e.toString()),
              data: (suggestion) => suggestion == null
                  ? _buildEmpty(theme)
                  : _buildSuggestion(theme, suggestion),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoading(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Analyzing your macros...',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(ThemeData theme, String error) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 16),
          Text(
            'Failed to generate suggestion',
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _retry,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.auto_awesome, size: 48, color: AppColors.primary),
          const SizedBox(height: 16),
          Text(
            'Find the Perfect Meal',
            style: theme.textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Let AI suggest a meal that fits your remaining ${widget.remainingCalories.round()} calories.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _retry,
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Generate Suggestion'),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestion(ThemeData theme, AiMealSuggestion suggestion) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            suggestion.suggestionName,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '"${suggestion.reasoning}"',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _MacroChip(
                  label: 'Cals',
                  value: '${suggestion.totalCalories.round()}',
                  color: AppColors.primary),
              const SizedBox(width: 8),
              _MacroChip(
                  label: 'Pro',
                  value: '${suggestion.totalProtein.round()}g',
                  color: Colors.pink),
              const SizedBox(width: 8),
              _MacroChip(
                  label: 'Carb',
                  value: '${suggestion.totalCarbs.round()}g',
                  color: Colors.blue),
              const SizedBox(width: 8),
              _MacroChip(
                  label: 'Fat',
                  value: '${suggestion.totalFats.round()}g',
                  color: Colors.orange),
            ],
          ),
          const SizedBox(height: 16),
          ...suggestion.items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.name,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    Text(
                      '${item.calories.round()} kcal',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {
                Navigator.pop(context, suggestion);
              },
              icon: const Icon(Icons.check),
              label: const Text('Log This Meal'),
            ),
          ),
          TextButton(
            onPressed: () {
              ref.read(mealSuggestionProvider.notifier).reset();
              _retry();
            },
            child: const Text('Try another suggestion'),
          ),
        ],
      ),
    );
  }

  void _retry() {
    ref.read(mealSuggestionProvider.notifier).getSuggestion(
          remainingCalories: widget.remainingCalories,
          remainingProtein: widget.remainingProtein,
          remainingCarbs: widget.remainingCarbs,
          remainingFats: widget.remainingFats,
        );
  }
}

class _MacroChip extends StatelessWidget {
  const _MacroChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
