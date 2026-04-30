import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/consent_providers.dart';

class ConsentManagementScreen extends ConsumerStatefulWidget {
  const ConsentManagementScreen({super.key});

  @override
  ConsumerState<ConsentManagementScreen> createState() =>
      _ConsentManagementScreenState();
}

class _ConsentManagementScreenState
    extends ConsumerState<ConsentManagementScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);
    final consentStatus = ref.watch(consentNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settingsGdprConsent),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shield, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        l10n.consentDataProcessing,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.consentDataProcessingDesc,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _ConsentTile(
            title: l10n.consentTerms,
            subtitle: l10n.consentTermsDesc,
            type: 'TERMS',
            isActive: consentStatus.active['TERMS'] == true,
            isMissing: consentStatus.missingPolicies.contains('TERMS'),
          ),
          _ConsentTile(
            title: l10n.consentPrivacy,
            subtitle: l10n.consentPrivacyDesc,
            type: 'PRIVACY',
            isActive: consentStatus.active['PRIVACY'] == true,
            isMissing: consentStatus.missingPolicies.contains('PRIVACY'),
          ),
          _ConsentTile(
            title: l10n.consentHealthData,
            subtitle: l10n.consentHealthDataDesc,
            type: 'HEALTH_DATA',
            isActive: consentStatus.active['HEALTH_DATA'] == true,
            isMissing: consentStatus.missingPolicies.contains('HEALTH_DATA'),
          ),
          _ConsentTile(
            title: l10n.consentAge,
            subtitle: l10n.consentAgeDesc,
            type: 'AGE_REQUIREMENT',
            isActive: consentStatus.active['AGE_REQUIREMENT'] == true,
            isMissing:
                consentStatus.missingPolicies.contains('AGE_REQUIREMENT'),
          ),
          if (consentStatus.needsReconsent) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () =>
                    ref.read(consentNotifierProvider.notifier).acceptAll(),
                child: Text(l10n.consentAcceptAll),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ConsentTile extends ConsumerWidget {
  const _ConsentTile({
    required this.title,
    required this.subtitle,
    required this.type,
    required this.isActive,
    required this.isMissing,
  });

  final String title;
  final String subtitle;
  final String type;
  final bool isActive;
  final bool isMissing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (isMissing) ...[
                      const SizedBox(width: 8),
                      Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            l10n.consentUpdateNeeded,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              isActive ? Icons.check_circle : Icons.cancel_outlined,
              color: isActive ? AppColors.success : AppColors.onSurfaceVariant,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
