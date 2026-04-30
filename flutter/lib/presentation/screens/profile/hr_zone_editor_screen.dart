import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/profile_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class HrZoneEditorScreen extends ConsumerStatefulWidget {
  const HrZoneEditorScreen({super.key});

  @override
  ConsumerState<HrZoneEditorScreen> createState() => _HrZoneEditorScreenState();
}

class _HrZoneEditorScreenState extends ConsumerState<HrZoneEditorScreen> {
  late List<int?> _zones;
  bool _isLoading = false;
  ProviderSubscription<AsyncValue<UserProfile>>? _profileSub;

  @override
  void initState() {
    super.initState();
    _zones = List.filled(6, null);
    _loadZones();
  }

  void _loadZones() {
    _profileSub = ref.listenManual(profileProvider, (previous, next) {
      next.whenData((profile) {
        if (mounted) {
          setState(() {
            _zones = [
              profile.hrZone1Max,
              profile.hrZone2Max,
              profile.hrZone3Max,
              profile.hrZone4Max,
              profile.hrZone5Max,
              profile.hrZone6Max,
            ];
          });
        }
      });
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _profileSub?.close();
    super.dispose();
  }

  String? _validateZones() {
    for (int i = 0; i < 6; i++) {
      if (_zones[i] != null && _zones[i]! <= 0) {
        return S.of(context).hrZoneMustBePositive(i + 1);
      }
      if (i > 0 && _zones[i] != null && _zones[i - 1] != null) {
        if (_zones[i]! <= _zones[i - 1]!) {
          return S.of(context).hrZoneMustBeGreater(i + 1, i);
        }
      }
    }
    return null;
  }

  Future<void> _save() async {
    final error = _validateZones();
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await ref.read(profileProvider.notifier).updateProfile(
            UpdateProfileRequest(
              hrZone1Max: _zones[0],
              hrZone2Max: _zones[1],
              hrZone3Max: _zones[2],
              hrZone4Max: _zones[3],
              hrZone5Max: _zones[4],
              hrZone6Max: _zones[5],
            ),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).hrZonesUpdated)),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).hrZonesFailed(e.toString()))),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).profileHrZones),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton(
              onPressed: _isLoading ? null : _save,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : Text(S.of(context).actionSave),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            S.of(context).hrZonesDescription,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          for (int i = 0; i < 6; i++)
            _HrZoneSlider(
              index: i,
              value: _zones[i],
              maxValue: i < 5 ? _zones[i + 1] : 220,
              prevValue: i > 0 ? _zones[i - 1] : 0,
              onChanged: (val) {
                setState(() {
                  _zones[i] = val.round();
                });
              },
            ),
          const SizedBox(height: 16),
          Text(
            S.of(context).hrZone7Note,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

class _HrZoneSlider extends StatelessWidget {
  const _HrZoneSlider({
    required this.index,
    required this.value,
    required this.maxValue,
    required this.prevValue,
    required this.onChanged,
  });

  final int index;
  final int? value;
  final int? maxValue;
  final int? prevValue;
  final ValueChanged<double> onChanged;

  static const _zoneColors = [
    AppColors.success,
    AppColors.peaked,
    AppColors.warning,
    AppColors.fatigued,
    AppColors.veryFatigued,
    AppColors.error,
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final zoneColor = _zoneColors[index];
    final s = S.of(context);
    final zoneLabels = [
      s.hrZone1,
      s.hrZone2,
      s.hrZone3,
      s.hrZone4,
      s.hrZone5,
      s.hrZone6,
    ];
    final zoneLabel = zoneLabels[index];
    final effectiveValue = value?.toDouble() ?? (prevValue ?? 60) + 30.0;
    final minVal = (prevValue ?? 60) + 1.0;
    final maxVal = maxValue != null ? maxValue!.toDouble() : 220.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: zoneColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  zoneLabel,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  s.hrZoneUpTo(value?.toString() ?? '—'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            Slider(
              value: effectiveValue.clamp(minVal, maxVal),
              min: minVal,
              max: maxVal,
              divisions: (maxVal - minVal).clamp(1, 220).toInt(),
              activeColor: zoneColor,
              onChanged: onChanged,
            ),
          ],
        ),
      ),
    );
  }
}
