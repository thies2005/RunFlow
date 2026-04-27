import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/strava_status_providers.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

class StravaAuthBanner extends ConsumerWidget {
  const StravaAuthBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(stravaStatusProvider);

    if (!status.isAuthExpired) return const SizedBox.shrink();

    return Material(
      color: AppColors.warning.withValues(alpha: 0.15),
      child: SafeArea(
        bottom: false,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              const Icon(Icons.warning_amber_rounded,
                  size: 20, color: AppColors.warning),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Strava connection expired',
                      style:
                          Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.warning,
                              ),
                    ),
                    Text(
                      'Reconnect to keep syncing activities',
                      style:
                          Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => _reconnectStrava(context, ref),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: const Text('Reconnect'),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () => ref
                    .read(stravaStatusProvider.notifier)
                    .setAuthExpired(false),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                iconSize: 18,
                color: AppColors.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _reconnectStrava(BuildContext context, WidgetRef ref) async {
    if (!AppConstants.isStravaConfigured) return;

    try {
      final authUrl = Uri.https('www.strava.com', '/oauth/authorize', {
        'client_id': AppConstants.stravaClientId,
        'redirect_uri': AppConstants.stravaRedirectUri,
        'response_type': 'code',
        'scope': 'read,activity:read_all',
        'state': 'reconnect_${DateTime.now().millisecondsSinceEpoch}',
      });

      final result = await FlutterWebAuth2.authenticate(
        url: authUrl.toString(),
        callbackUrlScheme: 'runflow2',
      );

      final code = Uri.parse(result).queryParameters['code'];
      if (code == null) return;

      await ref.read(stravaStatusProvider.notifier).setConnected(true);
      await ref.read(stravaStatusProvider.notifier).updateLastSync();

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Strava reconnected successfully')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reconnection cancelled')),
        );
      }
    }
  }
}
