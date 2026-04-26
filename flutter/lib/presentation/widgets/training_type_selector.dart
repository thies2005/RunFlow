import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class TrainingTypeSelector extends ConsumerStatefulWidget {
  const TrainingTypeSelector({
    required this.currentType,
    required this.onChanged,
    super.key,
  });

  final String? currentType;
  final ValueChanged<String> onChanged;

  @override
  ConsumerState<TrainingTypeSelector> createState() =>
      _TrainingTypeSelectorState();
}

class _TrainingTypeSelectorState extends ConsumerState<TrainingTypeSelector> {
  static const _types = [
    (value: 'easy', label: 'Easy', icon: Icons.directions_run, color: AppColors.success),
    (value: 'tempo', label: 'Tempo', icon: Icons.speed, color: Color(0xFFFF9800)),
    (value: 'interval', label: 'Interval', icon: Icons.flash_on, color: Color(0xFFF44336)),
    (value: 'long', label: 'Long Run', icon: Icons.route, color: Color(0xFF2196F3)),
    (value: 'recovery', label: 'Recovery', icon: Icons.self_improvement, color: Color(0xFF009688)),
    (value: 'race', label: 'Race', icon: Icons.emoji_events, color: Color(0xFF9C27B0)),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selected = widget.currentType?.toLowerCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Training Type',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _types.map((type) {
              final isSelected = selected == type.value;
              return ChoiceChip(
                avatar: Icon(
                  type.icon,
                  size: 16,
                  color: isSelected ? type.color : AppColors.onSurfaceVariant,
                ),
                label: Text(type.label),
                selected: isSelected,
                selectedColor: type.color.withValues(alpha: 0.2),
                onSelected: (_) => widget.onChanged(type.value),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
