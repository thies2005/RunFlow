import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).profileSettings),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              S.of(context).settingsUnits,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: SegmentedButton<UnitSystem>(
                segments: [
                  ButtonSegment(
                    value: UnitSystem.metric,
                    label: Text(S.of(context).settingsMetric),
                    icon: const Icon(Icons.straighten),
                  ),
                  ButtonSegment(
                    value: UnitSystem.imperial,
                    label: Text(S.of(context).settingsImperial),
                    icon: const Icon(Icons.map_outlined),
                  ),
                ],
                selected: {settings.unitSystem},
                onSelectionChanged: (selected) {
                  ref
                      .read(settingsProvider.notifier)
                      .setUnitSystem(selected.first);
                },
              ),
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               S.of(context).settingsTheme,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: SegmentedButton<AppThemeMode>(
                segments: [
                  ButtonSegment(
                    value: AppThemeMode.light,
                    label: Text(S.of(context).settingsLightTheme),
                    icon: const Icon(Icons.light_mode),
                  ),
                  ButtonSegment(
                    value: AppThemeMode.dark,
                    label: Text(S.of(context).settingsDarkTheme),
                    icon: const Icon(Icons.dark_mode),
                  ),
                  ButtonSegment(
                    value: AppThemeMode.system,
                    label: Text(S.of(context).settingsSystemTheme),
                    icon: const Icon(Icons.brightness_auto),
                  ),
                ],
                selected: {settings.themeMode},
                onSelectionChanged: (selected) {
                  ref
                      .read(settingsProvider.notifier)
                      .setThemeMode(selected.first);
                },
              ),
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               S.of(context).settingsNotifications,
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
                     S.of(context).settingsWorkoutReminders,
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                     S.of(context).settingsWorkoutRemindersSubtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.workoutReminders,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setWorkoutReminders(value);
                  },
                ),
                SwitchListTile(
                  title: Text(
                     S.of(context).settingsSupplementReminders,
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                     S.of(context).settingsSupplementRemindersSubtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.supplementReminders,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setSupplementReminders(value);
                  },
                ),
                SwitchListTile(
                  title: Text(
                     S.of(context).settingsSyncNotifications,
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                     S.of(context).settingsSyncNotificationsSubtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.syncNotifications,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setSyncNotifications(value);
                  },
                ),
                SwitchListTile(
                  title: Text(
                     S.of(context).settingsChatNotifications,
                    style: theme.textTheme.bodyMedium,
                  ),
                  subtitle: Text(
                     S.of(context).settingsChatNotificationsSubtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: settings.chatNotifications,
                  onChanged: (bool value) {
                    ref
                        .read(settingsProvider.notifier)
                        .setChatNotifications(value);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               S.of(context).settingsApiAccess,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.vpn_key),
              title: Text(S.of(context).settingsApiKey),
              subtitle: Text(
                S.of(context).settingsApiKeySubtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                context.push('/settings/api-key');
              },
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               S.of(context).settingsPrivacyConsent,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.shield),
              title: Text(S.of(context).settingsGdprConsent),
              subtitle: Text(
                S.of(context).settingsGdprConsentSubtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                context.push('/settings/consent');
              },
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               S.of(context).settingsDebug,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.bug_report),
              title: Text(S.of(context).settingsViewLogs),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                context.push('/settings/logs');
              },
            ),
          ),
        ],
      ),
    );
  }
}
