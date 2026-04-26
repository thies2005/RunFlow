import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class AiSettingsScreen extends ConsumerWidget {
  const AiSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Coach Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Control what data the AI Coach can access to provide '
              'personalized training advice.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Data Sharing',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: Text(
                    'Share Activities',
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                    'Allow AI to analyze your workout history',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.aiShareActivities,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setAiShareActivities(value);
                  },
                ),
                SwitchListTile(
                  title: Text(
                    'Share Health Data',
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                    'Allow AI to access nutrition and body metrics',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.aiShareHealthData,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setAiShareHealthData(value);
                  },
                ),
                SwitchListTile(
                  title: Text(
                    'Share Goals',
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                    'Allow AI to see your training goals',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.aiShareGoals,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setAiShareGoals(value);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
