import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

Future<void> showAddFoodBottomSheet(BuildContext context, WidgetRef ref) {
  final nameCtl = TextEditingController();
  final calCtl = TextEditingController();
  final proteinCtl = TextEditingController();
  final carbsCtl = TextEditingController();
  final fatCtl = TextEditingController();
  final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);

  return showModalBottomSheet(
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
          Text(S.of(ctx).nutritionAddFood, style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(controller: nameCtl, decoration: InputDecoration(labelText: S.of(ctx).nutritionFoodName, prefixIcon: const Icon(Icons.restaurant))),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: TextField(controller: calCtl, decoration: InputDecoration(labelText: S.of(ctx).nutritionCaloriesKcal), keyboardType: TextInputType.number)),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: proteinCtl, decoration: InputDecoration(labelText: S.of(ctx).nutritionProteinG), keyboardType: TextInputType.number)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: TextField(controller: carbsCtl, decoration: InputDecoration(labelText: S.of(ctx).nutritionCarbsG), keyboardType: TextInputType.number)),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: fatCtl, decoration: InputDecoration(labelText: S.of(ctx).nutritionFatG), keyboardType: TextInputType.number)),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                final food = FoodItem(
                  id: 0,
                  name: nameCtl.text.isNotEmpty ? nameCtl.text : 'Manual Entry',
                  calories: double.tryParse(calCtl.text) ?? 0,
                  protein: double.tryParse(proteinCtl.text) ?? 0,
                  carbs: double.tryParse(carbsCtl.text) ?? 0,
                  fat: double.tryParse(fatCtl.text) ?? 0,
                  servingSize: 100,
                );
                ref.read(nutritionProvider(today).notifier).logFood(food);
                Navigator.pop(ctx);
              },
              child: Text(S.of(ctx).actionAdd),
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
