import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class SupplementsTab extends ConsumerWidget {
  const SupplementsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supplementsAsync = ref.watch(supplementListProvider);
    final theme = Theme.of(context);

    return supplementsAsync.when(
      data: (supplements) {
        final activeSupplements =
            supplements.where((s) => s.isActive).toList();
        final inactiveSupplements =
            supplements.where((s) => !s.isActive).toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Daily Supplements',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              if (activeSupplements.isEmpty && inactiveSupplements.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.medication_outlined,
                          size: 48,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No supplements yet',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Track your daily supplements here',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (activeSupplements.isNotEmpty) ...[
                Text(
                  'Active',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ...activeSupplements.map(
                  (s) => _SupplementCard(
                    supplement: s,
                    onToggle: () => ref
                        .read(supplementListProvider.notifier)
                        .toggle(s.id),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (inactiveSupplements.isNotEmpty) ...[
                Text(
                  'Inactive',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                ...inactiveSupplements.map(
                  (s) => _SupplementCard(
                    supplement: s,
                    onToggle: () => ref
                        .read(supplementListProvider.notifier)
                        .toggle(s.id),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _showAddSupplementDialog(context, ref),
                  icon: const Icon(Icons.add),
                  label: const Text('Add Supplement'),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  void _showAddSupplementDialog(BuildContext context, WidgetRef ref) {
    final nameCtl = TextEditingController();
    final dosageCtl = TextEditingController();
    final freqCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Supplement'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtl,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: dosageCtl,
              decoration: const InputDecoration(labelText: 'Dosage (e.g. 500mg)'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: freqCtl,
              decoration: const InputDecoration(labelText: 'Frequency (e.g. Daily)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final supplement = Supplement(
                id: 0,
                name: nameCtl.text,
                dosage: dosageCtl.text,
                frequency: freqCtl.text,
                isActive: true,
              );
              ref.read(supplementListProvider.notifier).add(supplement);
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _SupplementCard extends StatelessWidget {
  const _SupplementCard({
    required this.supplement,
    required this.onToggle,
  });

  final Supplement supplement;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(supplement.name),
        subtitle: Text('${supplement.dosage} - ${supplement.frequency}'),
        trailing: Switch(
          value: supplement.isActive,
          onChanged: (_) => onToggle(),
          activeTrackColor: AppColors.primary,
        ),
        leading: Icon(
          Icons.medication,
          color: supplement.isActive ? AppColors.primary : AppColors.onSurfaceVariant,
        ),
      ),
    );
  }
}
