import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/presentation/providers/heatmap_providers.dart';
import 'package:runflow_flutter/presentation/widgets/heatmap_map.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class HeatmapScreen extends ConsumerStatefulWidget {
  const HeatmapScreen({super.key});

  @override
  ConsumerState<HeatmapScreen> createState() => _HeatmapScreenState();
}

class _HeatmapScreenState extends ConsumerState<HeatmapScreen> {
  int _selectedDays = 365;

  @override
  Widget build(BuildContext context) {
    final routesAsync = ref.watch(heatmapRoutesProvider(days: _selectedDays));

    return Scaffold(
      appBar: AppBar(title: const Text('Your Running Heatmap')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _RangeChip(label: '30d', days: 30),
                const SizedBox(width: 8),
                _RangeChip(label: '90d', days: 90),
                const SizedBox(width: 8),
                _RangeChip(label: '1Y', days: 365),
              ],
            ),
          ),
          Expanded(
            child: routesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Text(
                  'Failed to load heatmap data.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
              data: (routes) => HeatmapMap(
                routes: routes,
                height: double.infinity,
                showAttribution: true,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _RangeChip({required String label, required int days}) {
    final isSelected = _selectedDays == days;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        setState(() => _selectedDays = days);
      },
    );
  }
}
