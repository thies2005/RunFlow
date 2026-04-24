import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class HrZoneEditorScreen extends ConsumerStatefulWidget {
  const HrZoneEditorScreen({super.key});

  @override
  ConsumerState<HrZoneEditorScreen> createState() => _HrZoneEditorScreenState();
}

class _HrZoneEditorScreenState extends ConsumerState<HrZoneEditorScreen> {
  late List<int?> _zones;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _zones = List.filled(4, null);
    _loadZones();
  }

  void _loadZones() {
    final profileAsync = ref.read(profileProvider);
    profileAsync.whenData((profile) {
      setState(() {
        _zones = [
          profile.hrZone1Max,
          profile.hrZone2Max,
          profile.hrZone3Max,
          profile.hrZone4Max,
        ];
      });
    });
  }

  String? _validateZones() {
    for (int i = 0; i < 4; i++) {
      if (_zones[i] != null && _zones[i]! <= 0) {
        return 'Zone ${i + 1} must be a positive value';
      }
      if (i > 0 && _zones[i] != null && _zones[i - 1] != null) {
        if (_zones[i]! <= _zones[i - 1]!) {
          return 'Zone ${i + 1} max must be greater than Zone $i max';
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
            ),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('HR Zones updated')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e')),
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
        title: const Text('HR Zones'),
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
                  : const Text('Save'),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Define your heart rate zone boundaries. Each zone max must be greater than the previous zone.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          for (int i = 0; i < 4; i++)
            _HrZoneSlider(
              index: i,
              value: _zones[i],
              maxValue: i < 3 ? _zones[i + 1] : 220,
              prevValue: i > 0 ? _zones[i - 1] : 0,
              onChanged: (val) {
                setState(() {
                  _zones[i] = val.round();
                });
              },
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
    AppColors.warning,
    AppColors.fatigued,
    AppColors.error,
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final zoneNumber = index + 1;
    final zoneColor = _zoneColors[index];
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
                  'Zone $zoneNumber',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  'Up to ${value ?? '—'} bpm',
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
