import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settingsAbout),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 24),
          const Icon(
            Icons.directions_run,
            size: 64,
            color: AppColors.primary,
          ),
          const SizedBox(height: 16),
          Text(
            'RunFlow',
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.aboutVersion(appVersion, buildNumber),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                l10n.aboutDescription,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: Text(l10n.aboutPrivacyPolicy),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () {
                    launchUrl(Uri.parse('https://runflow.schuelken.uk/privacy'));
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  leading: const Icon(Icons.gavel_outlined),
                  title: Text(l10n.aboutTermsOfService),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () {
                    launchUrl(Uri.parse('https://runflow.schuelken.uk/terms'));
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                ListTile(
                  leading: const Icon(Icons.source_outlined),
                  title: Text(l10n.aboutOpenSource),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    showLicensePage(
                      context: context,
                      applicationName: 'RunFlow',
                      applicationVersion: appVersion,
                    );
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
