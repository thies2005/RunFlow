import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:url_launcher/url_launcher.dart';

class SyncPlatform {
  const SyncPlatform({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.available,
    required this.description,
    this.isMobileOnly = false,
  });

  final String id;
  final String name;
  final IconData icon;
  final Color color;
  final bool available;
  final String description;
  final bool isMobileOnly;
}

const _platforms = [
  SyncPlatform(
    id: 'strava',
    name: 'Strava',
    icon: Icons.directions_run,
    color: Color(0xFFFC4C02),
    available: true,
    description: 'Sync runs, rides, and more',
  ),
  SyncPlatform(
    id: 'health-connect',
    name: 'Health Connect',
    icon: Icons.favorite,
    color: Color(0xFF4CAF50),
    available: true,
    description: 'Sync from Android Health',
    isMobileOnly: true,
  ),
  SyncPlatform(
    id: 'garmin',
    name: 'Garmin Connect',
    icon: Icons.watch,
    color: Color(0xFF1976D2),
    available: false,
    description: 'Coming soon',
  ),
  SyncPlatform(
    id: 'polar',
    name: 'Polar Flow',
    icon: Icons.timer,
    color: Color(0xFFE53935),
    available: false,
    description: 'Coming soon',
  ),
  SyncPlatform(
    id: 'coros',
    name: 'COROS',
    icon: Icons.terrain,
    color: Color(0xFF009688),
    available: false,
    description: 'Coming soon',
  ),
  SyncPlatform(
    id: 'suunto',
    name: 'Suunto',
    icon: Icons.hiking,
    color: Color(0xFFFBC02D),
    available: false,
    description: 'Coming soon',
  ),
  SyncPlatform(
    id: 'huawei',
    name: 'Huawei Health',
    icon: Icons.waves,
    color: Color(0xFFE91E63),
    available: false,
    description: 'Coming soon',
  ),
];

class SyncPlatformSelector extends ConsumerStatefulWidget {
  const SyncPlatformSelector({
    super.key,
    this.connectedPlatforms = const [],
    this.onSkip,
    this.onPlatformConnected,
  });

  final List<String> connectedPlatforms;
  final VoidCallback? onSkip;
  final void Function(String platformId)? onPlatformConnected;

  @override
  ConsumerState<SyncPlatformSelector> createState() =>
      _SyncPlatformSelectorState();
}

class _SyncPlatformSelectorState extends ConsumerState<SyncPlatformSelector> {
  bool _healthConnectSyncing = false;
  String? _healthConnectError;
  bool _healthConnectSynced = false;
  bool _stravaConnecting = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Connect Your Training Platforms',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Sync your activities to get personalized insights',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: _platforms.map((platform) {
            return _PlatformCard(
              platform: platform,
              isConnected: widget.connectedPlatforms.contains(platform.id) ||
                  (platform.id == 'health-connect' && _healthConnectSynced),
              isSyncing:
                  platform.id == 'health-connect' && _healthConnectSyncing,
              isStravaConnecting:
                  platform.id == 'strava' && _stravaConnecting,
              onConnect: () => _handleConnect(platform.id),
            );
          }).toList(),
        ),
        if (_healthConnectError != null) ...[
          const SizedBox(height: 12),
          Text(
            _healthConnectError!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.error,
            ),
            textAlign: TextAlign.center,
          ),
        ],
        if (widget.onSkip != null) ...[
          const SizedBox(height: 24),
          Center(
            child: TextButton(
              onPressed: widget.onSkip,
              child: const Text(
                'Skip for now',
                style: TextStyle(color: AppColors.onSurfaceVariant),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _handleConnect(String platformId) async {
    if (platformId == 'strava') {
      await _connectStrava();
    } else if (platformId == 'health-connect') {
      await _connectHealthConnect();
    }
  }

  Future<void> _connectStrava() async {
    if (!AppConstants.isStravaConfigured) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Strava is not configured')),
        );
      }
      return;
    }

    setState(() => _stravaConnecting = true);

    try {
      final uri = Uri.https('www.strava.com', '/oauth/authorize', {
        'client_id': AppConstants.stravaClientId,
        'response_type': 'code',
        'redirect_uri': AppConstants.stravaRedirectUri,
        'approval_prompt': 'auto',
        'scope': 'read,activity:read_all',
      });

      final result = await FlutterWebAuth2.authenticate(
        url: uri.toString(),
        callbackUrlScheme: 'runflow2',
      );

      final code = Uri.parse(result).queryParameters['code'];
      if (code != null) {
        await ref.read(onboardingProvider.notifier).connectStrava(code);
        widget.onPlatformConnected?.call('strava');
      }
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _stravaConnecting = false);
      }
    }
  }

  Future<void> _connectHealthConnect() async {
    setState(() {
      _healthConnectSyncing = true;
      _healthConnectError = null;
    });

    try {
      final service = ref.read(healthConnectServiceProvider);
      final available = await service.isAvailable();
      if (!available) {
        final launched = await launchUrl(
          Uri.parse(
            'market://details?id=com.google.android.apps.healthdata',
          ),
        );
        if (!launched) {
          setState(() {
            _healthConnectError =
                'Health Connect is not available on this device.';
          });
        }
        return;
      }

      final permitted = await service.requestPermissions();
      if (!permitted) {
        setState(() {
          _healthConnectError =
              'Permission denied. Please grant access to Health Connect.';
        });
        return;
      }

      final activities = await service.readActivities();
      if (activities.isNotEmpty) {
        setState(() => _healthConnectSynced = true);
        widget.onPlatformConnected?.call('health-connect');
      } else {
        setState(() {
          _healthConnectError = 'No activities found in Health Connect.';
        });
      }
    } catch (_) {
      setState(() {
        _healthConnectError = 'Failed to sync with Health Connect.';
      });
    } finally {
      if (mounted) {
        setState(() => _healthConnectSyncing = false);
      }
    }
  }
}

class _PlatformCard extends StatelessWidget {
  const _PlatformCard({
    required this.platform,
    required this.isConnected,
    required this.isSyncing,
    required this.isStravaConnecting,
    required this.onConnect,
  });

  final SyncPlatform platform;
  final bool isConnected;
  final bool isSyncing;
  final bool isStravaConnecting;
  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: (MediaQuery.of(context).size.width - 56) / 2,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: isConnected
            ? Border.all(color: AppColors.success.withValues(alpha: 0.5))
            : null,
      ),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: platform.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  platform.icon,
                  color: platform.color,
                  size: 28,
                ),
              ),
              if (!platform.available)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Soon',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 9,
                      ),
                    ),
                  ),
                ),
              if (isConnected)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      size: 12,
                      color: AppColors.onPrimary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            platform.name,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            platform.description,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 36,
            child: _buildButton(theme),
          ),
        ],
      ),
    );
  }

  Widget _buildButton(ThemeData theme) {
    if (!platform.available) {
      return ElevatedButton(
        onPressed: null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
          foregroundColor: AppColors.onSurfaceVariant,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text('Coming Soon'),
      );
    }

    if (isConnected) {
      return ElevatedButton(
        onPressed: null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.success.withValues(alpha: 0.15),
          foregroundColor: AppColors.success,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text('Connected'),
      );
    }

    if (isSyncing || isStravaConnecting) {
      return ElevatedButton(
        onPressed: null,
        style: ElevatedButton.styleFrom(
          backgroundColor: platform.color.withValues(alpha: 0.5),
          foregroundColor: AppColors.onPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.onPrimary,
          ),
        ),
      );
    }

    return ElevatedButton(
      onPressed: onConnect,
      style: ElevatedButton.styleFrom(
        backgroundColor: platform.color,
        foregroundColor: AppColors.onPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Text(
        platform.id == 'strava' ? 'Connect' : 'Connect',
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
      ),
    );
  }
}
