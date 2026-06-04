import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';

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
                    '${settings.workoutReminderHour.toString().padLeft(2, '0')}:${settings.workoutReminderMinute.toString().padLeft(2, '0')}',
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
                if (settings.workoutReminders)
                  ListTile(
                    leading: const Icon(Icons.access_time, size: 20),
                    title: Text(
                      'Reminder Time',
                      style: theme.textTheme.bodySmall,
                    ),
                    trailing: Text(
                      '${settings.workoutReminderHour.toString().padLeft(2, '0')}:${settings.workoutReminderMinute.toString().padLeft(2, '0')}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(
                          hour: settings.workoutReminderHour,
                          minute: settings.workoutReminderMinute,
                        ),
                      );
                      if (time != null) {
                        unawaited(ref.read(settingsProvider.notifier).setWorkoutReminderTime(time.hour, time.minute));
                      }
                    },
                  ),
                const Divider(height: 1),
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
                if (settings.supplementReminders) ...[
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.wb_sunny_outlined, size: 20),
                    title: Text('Morning', style: theme.textTheme.bodySmall),
                    trailing: Text(
                      '${settings.supplementMorningHour.toString().padLeft(2, '0')}:${settings.supplementMorningMinute.toString().padLeft(2, '0')}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(
                          hour: settings.supplementMorningHour,
                          minute: settings.supplementMorningMinute,
                        ),
                      );
                      if (time != null) {
                        unawaited(ref.read(settingsProvider.notifier).setSupplementMorningTime(time.hour, time.minute));
                      }
                    },
                  ),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.wb_twilight, size: 20),
                    title: Text('Afternoon', style: theme.textTheme.bodySmall),
                    trailing: Text(
                      '${settings.supplementAfternoonHour.toString().padLeft(2, '0')}:${settings.supplementAfternoonMinute.toString().padLeft(2, '0')}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(
                          hour: settings.supplementAfternoonHour,
                          minute: settings.supplementAfternoonMinute,
                        ),
                      );
                      if (time != null) {
                        unawaited(ref.read(settingsProvider.notifier).setSupplementAfternoonTime(time.hour, time.minute));
                      }
                    },
                  ),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.bedtime_outlined, size: 20),
                    title: Text('Evening', style: theme.textTheme.bodySmall),
                    trailing: Text(
                      '${settings.supplementEveningHour.toString().padLeft(2, '0')}:${settings.supplementEveningMinute.toString().padLeft(2, '0')}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(
                          hour: settings.supplementEveningHour,
                          minute: settings.supplementEveningMinute,
                        ),
                      );
                      if (time != null) {
                        unawaited(ref.read(settingsProvider.notifier).setSupplementEveningTime(time.hour, time.minute));
                      }
                    },
                  ),
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.nightlight_outlined, size: 20),
                    title: Text('Night', style: theme.textTheme.bodySmall),
                    trailing: Text(
                      '${settings.supplementNightHour.toString().padLeft(2, '0')}:${settings.supplementNightMinute.toString().padLeft(2, '0')}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay(
                          hour: settings.supplementNightHour,
                          minute: settings.supplementNightMinute,
                        ),
                      );
                      if (time != null) {
                        unawaited(ref.read(settingsProvider.notifier).setSupplementNightTime(time.hour, time.minute));
                      }
                    },
                  ),
                ],
                const Divider(height: 1),
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
              'Strength Training Settings',
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
                  title: const Text(
                    'Show RPE',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text(
                    'Enable Rate of Perceived Exertion (1-10) logging for sets',
                    style: TextStyle(fontSize: 12),
                  ),
                  value: settings.showRpe,
                  onChanged: (bool value) {
                    ref.read(settingsProvider.notifier).setShowRpe(value);
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text(
                    'Default Rest Timer',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                  ),
                  subtitle: Text(
                    'Current default: ${settings.defaultRestSeconds}s',
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: DropdownButton<int>(
                    value: settings.defaultRestSeconds,
                    onChanged: (int? newValue) {
                      if (newValue != null) {
                        ref.read(settingsProvider.notifier).setDefaultRestSeconds(newValue);
                      }
                    },
                    items: const [
                      DropdownMenuItem(value: 30, child: Text('30s')),
                      DropdownMenuItem(value: 60, child: Text('60s')),
                      DropdownMenuItem(value: 90, child: Text('90s')),
                      DropdownMenuItem(value: 120, child: Text('120s')),
                      DropdownMenuItem(value: 180, child: Text('180s')),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
               'External Integrations',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.receipt_long),
              title: Text(S.of(context).settingsRecipeManagers),
              subtitle: Text(
                'Connect to Mealie or Tandoor self-hosted servers',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                context.push('/settings/recipe');
              },
            ),
          ),
          if (ref.watch(healthConnectAvailableProvider).asData?.value ?? false) ...[
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.sync),
                title: const Text('Reconnect to Health Connect'),
                subtitle: Text(
                  'Refresh permissions and sync vitals & sleep data',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  final granted = await ref
                      .read(healthPermissionsProvider.notifier)
                      .requestPermissions();
                  if (granted) {
                    unawaited(ref.read(vitalsProvider.notifier).refresh());
                    unawaited(ref.read(sleepProvider.notifier).refresh());
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Successfully connected to Health Connect!'),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: AppColors.success,
                        ),
                      );
                    }
                  } else {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Failed to connect to Health Connect.'),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: AppColors.error,
                        ),
                      );
                    }
                  }
                },
              ),
            ),
          ],
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
