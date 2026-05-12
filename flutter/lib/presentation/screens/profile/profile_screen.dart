import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/strava_status_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).navAthlete),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _ProfileHeader(user: user),
          const SizedBox(height: 16),
          _ProfileMenuSection(user: user),
        ],
      ),
    );
  }
}

class _ProfileHeader extends ConsumerWidget {
  const _ProfileHeader({required this.user});

  final User? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stravaStatus = ref.watch(stravaStatusProvider);
    final isStravaConnected = stravaStatus.isConnected && !stravaStatus.isAuthExpired;
    final theme = Theme.of(context);
    final name = user?.name ?? S.of(context).navAthlete;
    final email = user?.email ?? '';
    final initials = name
        .split(' ')
        .where((s) => s.isNotEmpty)
        .take(2)
        .map((s) => s[0].toUpperCase())
        .join();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                backgroundImage:
                    user?.image != null ? NetworkImage(user!.image!) : null,
                child: user?.image == null
                    ? Text(
                        initials,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      email,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (isStravaConnected)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.link,
                              size: 14,
                              color: AppColors.success,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              S.of(context).profileStravaConnected,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: AppColors.success,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.link_off,
                              size: 14,
                              color: AppColors.onSurfaceVariant,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              stravaStatus.isAuthExpired
                                  ? S.of(context).profileStravaAuthExpired
                                  : S.of(context).profileStravaNotConnected,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileMenuSection extends ConsumerWidget {
  const _ProfileMenuSection({required this.user});

  final User? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        _MenuTile(
          icon: Icons.directions_run_outlined,
          title: S.of(context).activitiesTitle,
          onTap: () => context.push('/activities'),
        ),
        _MenuTile(
          icon: Icons.auto_awesome,
          title: S.of(context).chatAiCoach,
          onTap: () => context.push('/chat'),
        ),
        _MenuTile(
          icon: Icons.edit_outlined,
          title: S.of(context).athleteEditProfile,
          onTap: () => context.push('/profile/edit'),
        ),
        _MenuTile(
          icon: Icons.monitor_heart_outlined,
          title: S.of(context).profileHrZones,
          onTap: () => context.push('/profile/hr-zones'),
        ),
        _MenuTile(
          icon: Icons.settings_outlined,
          title: S.of(context).profileSettings,
          onTap: () => context.push('/profile/settings'),
        ),
        _MenuTile(
          icon: Icons.bar_chart_outlined,
          title: S.of(context).profileAnalytics,
          onTap: () => context.push('/analytics'),
        ),
        _MenuTile(
          icon: Icons.smart_toy_outlined,
          title: S.of(context).settingsAiSettings,
          onTap: () => context.push('/settings/ai'),
        ),
        _MenuTile(
          icon: Icons.info_outline,
          title: S.of(context).settingsAbout,
          onTap: () => context.push('/settings/about'),
        ),
        const Divider(indent: 16, endIndent: 16, height: 32),
        _MenuTile(
          icon: Icons.logout,
          title: S.of(context).settingsLogout,
          iconColor: AppColors.error,
          titleColor: AppColors.error,
          onTap: () => _showLogoutDialog(context, ref),
        ),
        _MenuTile(
          icon: Icons.delete_forever_outlined,
          title: S.of(context).profileDeleteAccount,
          iconColor: AppColors.error,
          titleColor: AppColors.error,
          onTap: () => _showDeleteAccountDialog(context, ref),
        ),
      ],
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
        builder: (context) => AlertDialog(
          title: Text(S.of(context).settingsLogout),
          content: Text(
            S.of(context).profileLogoutConfirm,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(S.of(context).actionCancel),
            ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authStateProvider.notifier).logout();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: Text(S.of(context).settingsLogout),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
        builder: (context) => AlertDialog(
          title: Text(S.of(context).profileDeleteAccount),
          content: Text(
            S.of(context).profileDeleteAccountWarning,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(S.of(context).actionCancel),
            ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(S.of(context).profileDeleteAccountContactSupport),
                ),
              );
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: Text(S.of(context).actionDelete),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.iconColor,
    this.titleColor,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveIconColor = iconColor ?? AppColors.onSurfaceVariant;
    final effectiveTitleColor = titleColor ?? theme.colorScheme.onSurface;

    return Card(
      child: ListTile(
        leading: Icon(icon, color: effectiveIconColor),
        title: Text(
          title,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: effectiveTitleColor,
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: const Icon(
          Icons.chevron_right,
          color: AppColors.onSurfaceVariant,
        ),
        onTap: onTap,
      ),
    );
  }
}
