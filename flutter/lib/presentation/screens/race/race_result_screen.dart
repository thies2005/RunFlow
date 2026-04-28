import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/race_models.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/race_providers.dart';

class RaceResultScreen extends ConsumerStatefulWidget {
  const RaceResultScreen({required this.goalId, super.key});

  final String goalId;

  @override
  ConsumerState<RaceResultScreen> createState() => _RaceResultScreenState();
}

class _RaceResultScreenState extends ConsumerState<RaceResultScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(raceResultFlowProvider(widget.goalId).notifier).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    final flowState = ref.watch(raceResultFlowProvider(widget.goalId));

    if (flowState.isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Race Result')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_appBarTitle(flowState.mode)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 32),
        child: _buildContent(flowState),
      ),
    );
  }

  String _appBarTitle(RaceResultMode mode) {
    return switch (mode) {
      RaceResultMode.suggest => 'Link Your Race Result',
      RaceResultMode.pick => 'Select Your Race Run',
      RaceResultMode.review => 'Race Result',
    };
  }

  Widget _buildContent(RaceResultFlowState state) {
    return switch (state.mode) {
      RaceResultMode.suggest => _SuggestModeContent(
          state: state,
          goalId: widget.goalId,
        ),
      RaceResultMode.pick => _PickModeContent(
          state: state,
          goalId: widget.goalId,
        ),
      RaceResultMode.review => _ReviewModeContent(
          state: state,
          goalId: widget.goalId,
        ),
    };
  }
}

class _SuggestModeContent extends ConsumerWidget {
  const _SuggestModeContent({
    required this.state,
    required this.goalId,
  });

  final RaceResultFlowState state;
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(raceResultFlowProvider(goalId).notifier);

    if (state.suggestedActivity != null) {
      final activity = state.suggestedActivity!;
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
                child: Row(
                  children: [
                    const Icon(Icons.flag, size: 16, color: AppColors.primary),
                    const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'We found a run near your race date!',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _ActivityCard(activity: activity),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  notifier.selectActivity(
                    activity.id,
                    movingTime: activity.movingTime,
                  );
                  notifier.setMode(RaceResultMode.review);
                },
                icon: const Icon(Icons.check_circle, size: 18),
                label: const Text("Yes, that's my race!"),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => notifier.setMode(RaceResultMode.pick),
                child: const Text('Pick a different run'),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text("I didn't race / Skip for now"),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          const SizedBox(height: 24),
          const Icon(
            Icons.flag,
            size: 48,
            color: AppColors.onSurfaceVariant,
          ),
          const SizedBox(height: 12),
          Text(
            'No matching run found near your race date.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => notifier.setMode(RaceResultMode.pick),
              child: const Text('Select your race run'),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Skip for now'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PickModeContent extends ConsumerWidget {
  const _PickModeContent({
    required this.state,
    required this.goalId,
  });

  final RaceResultFlowState state;
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(raceResultFlowProvider(goalId).notifier);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Text(
            'Select the activity that corresponds to your race.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          _ActivityPickerList(
            goalId: goalId,
            selectedId: state.selectedActivityId,
            onSelect: (id, movingTime) {
              notifier.selectActivity(id, movingTime: movingTime);
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: state.selectedActivityId != null
                      ? () => notifier.setMode(RaceResultMode.review)
                      : null,
                  child: const Text('Continue'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => notifier.setMode(RaceResultMode.suggest),
                  child: const Text('Back'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActivityPickerList extends ConsumerWidget {
  const _ActivityPickerList({
    required this.goalId,
    required this.selectedId,
    required this.onSelect,
  });

  final String goalId;
  final String? selectedId;
  final void Function(String, int?) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => const Center(child: Text('Failed to load activities')),
      data: (data) {
        final activities = data.recentActivities
            .where((a) => a.type == ActivityType.run)
            .take(10)
            .toList();

        if (activities.isEmpty) {
          return const Center(child: Text('No activities found'));
        }

        return Column(
          children: activities.map((activity) {
            final isSelected = activity.id == selectedId;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _ActivityTile(
                activity: activity,
                isSelected: isSelected,
                onTap: () =>
                    onSelect(activity.id, activity.movingTime),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({
    required this.activity,
    required this.isSelected,
    required this.onTap,
  });

  final Activity activity;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: isSelected
          ? AppColors.primary.withValues(alpha: 0.1)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isSelected
            ? const BorderSide(color: AppColors.primary)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: isSelected
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.surfaceDarkVariant,
                child: Icon(
                  Icons.directions_run,
                  size: 18,
                  color: isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity.name,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatDistance(activity.distance)} · ${formatDuration(activity.movingTime)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: AppColors.primary),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewModeContent extends ConsumerStatefulWidget {
  const _ReviewModeContent({
    required this.state,
    required this.goalId,
  });

  final RaceResultFlowState state;
  final String goalId;

  @override
  ConsumerState<_ReviewModeContent> createState() =>
      _ReviewModeContentState();
}

class _ReviewModeContentState extends ConsumerState<_ReviewModeContent> {
  late int? _actualTime;
  late int? _chipTime;
  late int? _placementOverall;
  late int? _placementGender;
  late int? _placementAgeGroup;
  late String? _ageGroup;
  late int? _totalFinishers;
  late String? _weatherConditions;
  late int _feltLike;
  late String _notes;
  bool _showDetails = false;

  @override
  void initState() {
    super.initState();
    _actualTime = widget.state.actualTimeSeconds;
    _chipTime = widget.state.chipTimeSeconds;
    _placementOverall = widget.state.placementOverall;
    _placementGender = widget.state.placementGender;
    _placementAgeGroup = widget.state.placementAgeGroup;
    _ageGroup = widget.state.ageGroup;
    _totalFinishers = widget.state.totalFinishers;
    _weatherConditions = widget.state.weatherConditions;
    _feltLike = widget.state.feltLike ?? 5;
    _notes = widget.state.notes ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(raceResultFlowProvider(widget.goalId).notifier);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TimeComparisonCard(
            actualTime: _actualTime,
            goalId: widget.goalId,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _TimeInput(
                  label: 'Actual Time',
                  initialSeconds: _actualTime,
                  onChanged: (v) => _actualTime = v,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _TimeInput(
                  label: 'Chip Time',
                  initialSeconds: _chipTime,
                  onChanged: (v) => _chipTime = v,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ExpandableDetails(
            showDetails: _showDetails,
            onToggle: () => setState(() => _showDetails = !_showDetails),
            placementOverall: _placementOverall,
            placementGender: _placementGender,
            placementAgeGroup: _placementAgeGroup,
            ageGroup: _ageGroup,
            totalFinishers: _totalFinishers,
            weatherConditions: _weatherConditions,
            feltLike: _feltLike,
            notes: _notes,
            onPlacementOverallChanged: (v) => _placementOverall = v,
            onPlacementGenderChanged: (v) => _placementGender = v,
            onPlacementAgeGroupChanged: (v) => _placementAgeGroup = v,
            onAgeGroupChanged: (v) => _ageGroup = v,
            onTotalFinishersChanged: (v) => _totalFinishers = v,
            onWeatherConditionsChanged: (v) => _weatherConditions = v,
            onFeltLikeChanged: (v) => setState(() => _feltLike = v),
            onNotesChanged: (v) => _notes = v,
          ),
          const SizedBox(height: 16),
          _TrainingCompletionCard(goalId: widget.goalId),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: widget.state.isSaving || _actualTime == null
                      ? null
                      : () async {
                          notifier.setActualTime(_actualTime);
                          notifier.setChipTime(_chipTime);
                          notifier.setPlacementOverall(_placementOverall);
                          notifier.setPlacementGender(_placementGender);
                          notifier.setPlacementAgeGroup(_placementAgeGroup);
                          notifier.setAgeGroup(_ageGroup);
                          notifier.setTotalFinishers(_totalFinishers);
                          notifier.setWeatherConditions(_weatherConditions);
                          notifier.setFeltLike(_feltLike);
                          notifier.setNotes(_notes);

                          final success = await notifier.completeRace();
                          if (success && context.mounted) {
                            Navigator.of(context).pop();
                          } else if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Failed to save race result'),
                              ),
                            );
                          }
                        },
                  icon: widget.state.isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check_circle, size: 18),
                  label: Text(
                    widget.state.isSaving ? 'Saving...' : 'Complete & Archive',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimeComparisonCard extends ConsumerWidget {
  const _TimeComparisonCard({
    required this.actualTime,
    required this.goalId,
  });

  final int? actualTime;
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (data) {
        final goal = data.goals.where((g) => g.id == goalId).firstOrNull;
        final targetTime = goal?.targetTime;

        if (targetTime == null || actualTime == null) {
          return const SizedBox.shrink();
        }

        final delta = actualTime! - targetTime;
        final isPositive = delta > 0;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceDarkVariant.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Text(
                'Race Result',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _TimeBlock(
                      icon: Icons.flag,
                      label: 'Goal Time',
                      value: _formatTime(targetTime),
                      color: const Color(0xFF7C4DFF),
                    ),
                  ),
                  Expanded(
                    child: _TimeBlock(
                      icon: Icons.emoji_events,
                      label: 'Actual Time',
                      value: _formatTime(actualTime!),
                      color: AppColors.primary,
                    ),
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isPositive
                                ? AppColors.error.withValues(alpha: 0.2)
                                : AppColors.success.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              isPositive ? '+' : '-',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: isPositive
                                    ? AppColors.error
                                    : AppColors.success,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Difference',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                        Text(
                          _formatTimeDelta(delta.abs()),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: isPositive
                                ? AppColors.error
                                : AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatTime(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) {
      return '$hours:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }
    return '$minutes:${secs.toString().padLeft(2, '0')}';
  }

  String _formatTimeDelta(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) {
      return '$hours:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
    }
    if (minutes > 0) {
      return '$minutes:${secs.toString().padLeft(2, '0')}';
    }
    return '${secs}s';
  }
}

class _TimeBlock extends StatelessWidget {
  const _TimeBlock({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 10,
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _TimeInput extends StatefulWidget {
  const _TimeInput({
    required this.label,
    required this.initialSeconds,
    required this.onChanged,
  });

  final String label;
  final int? initialSeconds;
  final void Function(int?) onChanged;

  @override
  State<_TimeInput> createState() => _TimeInputState();
}

class _TimeInputState extends State<_TimeInput> {
  late final TextEditingController _hoursController;
  late final TextEditingController _minutesController;
  late final TextEditingController _secondsController;

  @override
  void initState() {
    super.initState();
    final h = widget.initialSeconds != null ? widget.initialSeconds! ~/ 3600 : 0;
    final m = widget.initialSeconds != null
        ? (widget.initialSeconds! % 3600) ~/ 60
        : 0;
    final s =
        widget.initialSeconds != null ? widget.initialSeconds! % 60 : 0;
    _hoursController = TextEditingController(text: h > 0 ? '$h' : '');
    _minutesController = TextEditingController(text: '$m');
    _secondsController = TextEditingController(text: '$s');
  }

  @override
  void dispose() {
    _hoursController.dispose();
    _minutesController.dispose();
    _secondsController.dispose();
    super.dispose();
  }

  int? _computeSeconds() {
    final h = int.tryParse(_hoursController.text) ?? 0;
    final m = int.tryParse(_minutesController.text) ?? 0;
    final s = int.tryParse(_secondsController.text) ?? 0;
    final total = h * 3600 + m * 60 + s;
    return total > 0 ? total : null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final inputStyle = TextStyle(
      fontSize: 14,
      color: theme.colorScheme.onSurface,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _hoursController,
                keyboardType: TextInputType.number,
                style: inputStyle,
                decoration: const InputDecoration(
                  hintText: 'hh',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 10,
                  ),
                ),
                onChanged: (_) => widget.onChanged(_computeSeconds()),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: TextField(
                controller: _minutesController,
                keyboardType: TextInputType.number,
                style: inputStyle,
                decoration: const InputDecoration(
                  hintText: 'mm',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 10,
                  ),
                ),
                onChanged: (_) => widget.onChanged(_computeSeconds()),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: TextField(
                controller: _secondsController,
                keyboardType: TextInputType.number,
                style: inputStyle,
                decoration: const InputDecoration(
                  hintText: 'ss',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 10,
                  ),
                ),
                onChanged: (_) => widget.onChanged(_computeSeconds()),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ExpandableDetails extends StatelessWidget {
  const _ExpandableDetails({
    required this.showDetails,
    required this.onToggle,
    required this.placementOverall,
    required this.placementGender,
    required this.placementAgeGroup,
    required this.ageGroup,
    required this.totalFinishers,
    required this.weatherConditions,
    required this.feltLike,
    required this.notes,
    required this.onPlacementOverallChanged,
    required this.onPlacementGenderChanged,
    required this.onPlacementAgeGroupChanged,
    required this.onAgeGroupChanged,
    required this.onTotalFinishersChanged,
    required this.onWeatherConditionsChanged,
    required this.onFeltLikeChanged,
    required this.onNotesChanged,
  });

  final bool showDetails;
  final VoidCallback onToggle;
  final int? placementOverall;
  final int? placementGender;
  final int? placementAgeGroup;
  final String? ageGroup;
  final int? totalFinishers;
  final String? weatherConditions;
  final int feltLike;
  final String notes;
  final void Function(int?) onPlacementOverallChanged;
  final void Function(int?) onPlacementGenderChanged;
  final void Function(int?) onPlacementAgeGroupChanged;
  final void Function(String?) onAgeGroupChanged;
  final void Function(int?) onTotalFinishersChanged;
  final void Function(String?) onWeatherConditionsChanged;
  final void Function(int) onFeltLikeChanged;
  final void Function(String) onNotesChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.edit, size: 16, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Race Details',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    showDetails
                        ? Icons.expand_less
                        : Icons.expand_more,
                    size: 20,
                    color: AppColors.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
          if (showDetails)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _NumberField(
                          label: 'Overall Place',
                          value: placementOverall,
                          onChanged: onPlacementOverallChanged,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _NumberField(
                          label: 'Gender Place',
                          value: placementGender,
                          onChanged: onPlacementGenderChanged,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _NumberField(
                          label: 'Age Group Place',
                          value: placementAgeGroup,
                          onChanged: onPlacementAgeGroupChanged,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _TextField(
                          label: 'Age Group',
                          value: ageGroup,
                          hint: 'e.g. M30-34',
                          onChanged: onAgeGroupChanged,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _NumberField(
                    label: 'Total Finishers',
                    value: totalFinishers,
                    onChanged: onTotalFinishersChanged,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _TextField(
                          label: 'Weather',
                          value: weatherConditions,
                          hint: 'e.g. 15C, sunny',
                          onChanged: onWeatherConditionsChanged,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _RpeSlider(
                          value: feltLike,
                          onChanged: onFeltLikeChanged,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _NotesField(value: notes, onChanged: onNotesChanged),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _NumberField extends StatefulWidget {
  const _NumberField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final int? value;
  final void Function(int?) onChanged;

  @override
  State<_NumberField> createState() => _NumberFieldState();
}

class _NumberFieldState extends State<_NumberField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: widget.value != null ? '${widget.value}' : '',
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      keyboardType: TextInputType.number,
      decoration: InputDecoration(
        labelText: widget.label,
        isDense: true,
      ),
      controller: _controller,
      onChanged: (v) {
        final parsed = int.tryParse(v);
        widget.onChanged(parsed);
      },
    );
  }
}

class _TextField extends StatefulWidget {
  const _TextField({
    required this.label,
    required this.value,
    required this.hint,
    required this.onChanged,
  });

  final String label;
  final String? value;
  final String hint;
  final void Function(String?) onChanged;

  @override
  State<_TextField> createState() => _TextFieldState();
}

class _TextFieldState extends State<_TextField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hint,
        isDense: true,
      ),
      controller: _controller,
      onChanged: (v) => widget.onChanged(v.isEmpty ? null : v),
    );
  }
}

class _RpeSlider extends StatelessWidget {
  const _RpeSlider({
    required this.value,
    required this.onChanged,
  });

  final int value;
  final void Function(int) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How did it feel? (RPE $value)',
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        Slider(
          value: value.toDouble(),
          min: 1,
          max: 10,
          divisions: 9,
          activeColor: AppColors.primary,
          onChanged: (v) => onChanged(v.round()),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Easy',
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 10,
              ),
            ),
            Text(
              'Hard',
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.onSurfaceVariant,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _NotesField extends StatefulWidget {
  const _NotesField({
    required this.value,
    required this.onChanged,
  });

  final String value;
  final void Function(String) onChanged;

  @override
  State<_NotesField> createState() => _NotesFieldState();
}

class _NotesFieldState extends State<_NotesField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      decoration: const InputDecoration(
        labelText: 'Notes',
        hintText: 'How did the race go?',
        isDense: true,
      ),
      controller: _controller,
      onChanged: widget.onChanged,
      maxLines: 3,
    );
  }
}

class _TrainingCompletionCard extends ConsumerWidget {
  const _TrainingCompletionCard({required this.goalId});

  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final completionAsync = ref.watch(trainingCompletionProvider(goalId));

    return completionAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (completion) {
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surfaceDarkVariant.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Training Summary',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${completion.completedWorkouts}/${completion.totalWorkouts}',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'workouts completed',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${completion.completionRate}%',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: completion.completionRate >= 80
                              ? AppColors.success
                              : completion.completionRate >= 60
                                  ? AppColors.warning
                                  : AppColors.error,
                        ),
                      ),
                      Text(
                        'completion rate',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: completion.completionRate / 100,
                  backgroundColor: AppColors.surfaceDarkVariant,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    completion.completionRate >= 80
                        ? AppColors.success
                        : completion.completionRate >= 60
                            ? AppColors.warning
                            : AppColors.error,
                  ),
                  minHeight: 5,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.activity});

  final SuggestedRaceActivity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pace = activity.averageSpeed != null && activity.averageSpeed! > 0
        ? 1000 / activity.averageSpeed!
        : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  child: const Icon(
                    Icons.emoji_events,
                    size: 18,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activity.name,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        _formatDate(activity.startDate),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _InfoBlock(
                    value: formatDistance(activity.distance),
                    label: 'distance',
                  ),
                ),
                Expanded(
                  child: _InfoBlock(
                    value: formatDuration(activity.movingTime),
                    label: 'time',
                  ),
                ),
                Expanded(
                  child: _InfoBlock(
                    value: pace != null ? formatPace(pace) : '-',
                    label: 'pace',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[date.month]} ${date.day}, ${date.year}';
  }
}

class _InfoBlock extends StatelessWidget {
  const _InfoBlock({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceDarkVariant.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: AppColors.onSurfaceVariant,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
