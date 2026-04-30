import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/settings_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/api_key_providers.dart';

class ApiKeyScreen extends ConsumerStatefulWidget {
  const ApiKeyScreen({super.key});

  @override
  ConsumerState<ApiKeyScreen> createState() => _ApiKeyScreenState();
}

class _ApiKeyScreenState extends ConsumerState<ApiKeyScreen> {
  bool _isGenerating = false;
  bool _isRevoking = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final apiKeyState = ref.watch(apiKeyNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).settingsApiKey),
      ),
      body: apiKeyState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('${S.of(context).actionError}: $e', style: theme.textTheme.bodyMedium),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () =>
                    ref.read(apiKeyNotifierProvider.notifier).revoke(),
                child: Text(S.of(context).actionRetry),
              ),
            ],
          ),
        ),
        data: (info) => ListView(
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
                        Icon(Icons.vpn_key,
                            color: theme.colorScheme.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          S.of(context).apikeyExternalAccess,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      S.of(context).apikeyExternalDesc,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (info != null && info.hasKey) ...[
              _buildExistingKeyCard(context, theme, info),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isRevoking ? null : _revokeKey,
                  icon: _isRevoking
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.delete_outline, color: AppColors.error),
                  label: Text(S.of(context).apikeyRevokeKey,
                      style: const TextStyle(color: AppColors.error)),
                ),
              ),
            ] else ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Icon(Icons.vpn_key_outlined,
                          size: 48,
                          color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
                      const SizedBox(height: 16),
                      Text(
                        S.of(context).apikeyNoKey,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        S.of(context).apikeyNoKeyDesc,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isGenerating ? null : _generateKey,
                  icon: _isGenerating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.add),
                  label: Text(_isGenerating
                      ? S.of(context).apikeyGenerating
                      : S.of(context).apikeyGenerate),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildExistingKeyCard(
      BuildContext context, ThemeData theme, ApiKeyInfo info) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              S.of(context).apikeyActiveKey,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    info.keyPrefix ?? '••••',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '••••••••',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontFamily: 'monospace',
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            if (info.name != null) ...[
              const SizedBox(height: 8),
              Text(
                S.of(context).apikeyNameLabel(info.name!),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
            if (info.createdAt != null) ...[
              const SizedBox(height: 4),
              Text(
                S.of(context).apikeyCreatedLabel(_formatDate(info.createdAt!)),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
            if (info.lastUsedAt != null) ...[
              const SizedBox(height: 4),
              Text(
                S.of(context).apikeyLastUsedLabel(_formatDate(info.lastUsedAt!)),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  Future<void> _generateKey() async {
    setState(() => _isGenerating = true);
    final result =
        await ref.read(apiKeyNotifierProvider.notifier).generate();
    setState(() => _isGenerating = false);

    if (result != null && mounted) {
      _showKeyDialog(result.apiKey);
    }
  }

  void _showKeyDialog(String apiKey) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(S.of(context).apikeyGeneratedTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              S.of(context).apikeyGeneratedMessage,
              style: const TextStyle(
                  color: AppColors.warning, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest
                    .withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: SelectableText(
                apiKey,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: apiKey));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(S.of(context).apikeyCopied)),
              );
            },
            child: Text(S.of(context).actionCopy),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(S.of(context).actionDone),
          ),
        ],
      ),
    );
  }

  Future<void> _revokeKey() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(S.of(context).apikeyRevokeTitle),
        content: Text(
          S.of(context).apikeyRevokeMessage,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(S.of(context).actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: Text(S.of(context).apikeyRevokeAction),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isRevoking = true);
      await ref.read(apiKeyNotifierProvider.notifier).revoke();
      setState(() => _isRevoking = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).apikeyRevoked)),
        );
      }
    }
  }
}
