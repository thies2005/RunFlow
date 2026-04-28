import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/goal_models.dart';
import 'package:runflow_flutter/presentation/providers/goal_providers.dart';

class GoalSetupWizard extends ConsumerStatefulWidget {
  const GoalSetupWizard({super.key});

  @override
  ConsumerState<GoalSetupWizard> createState() => _GoalSetupWizardState();
}

class _GoalSetupWizardState extends ConsumerState<GoalSetupWizard> {
  int _currentStep = 0;
  final _nameController = TextEditingController();
  RaceType _selectedRaceType = RaceType.fiveK;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 42));
  bool _hasTargetTime = false;
  int _runsPerWeek = 4;
  double _weeklyMileageGoal = 30.0;
  int _planWeeks = 12;
  bool _isSubmitting = false;

  final _nameFormKey = GlobalKey<FormState>();
  final _hoursController = TextEditingController();
  final _minutesController = TextEditingController();
  final _secondsController = TextEditingController();

  static const int _totalSteps = 5;

  @override
  void dispose() {
    _nameController.dispose();
    _hoursController.dispose();
    _minutesController.dispose();
    _secondsController.dispose();
    super.dispose();
  }

  bool _validateCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _nameFormKey.currentState?.validate() ?? false;
      case 1:
        final now = DateTime.now();
        if (_selectedDate.isBefore(DateTime(now.year, now.month, now.day))) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please select a future race date')),
          );
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  }

  void _nextStep() {
    if (!_validateCurrentStep()) return;
    if (_currentStep < _totalSteps - 1) {
      setState(() {
        _currentStep++;
      });
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  int? get _targetTimeInSeconds {
    if (!_hasTargetTime) return null;
    final hours = int.tryParse(_hoursController.text) ?? 0;
    final minutes = int.tryParse(_minutesController.text) ?? 0;
    final seconds = int.tryParse(_secondsController.text) ?? 0;
    final total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    setState(() {
      _isSubmitting = true;
    });

    try {
      final request = CreateGoalRequest(
        name: _nameController.text.trim(),
        raceType: _selectedRaceType,
        raceDate: _selectedDate,
        targetTime: _targetTimeInSeconds,
        weeklyMileageGoal: _weeklyMileageGoal,
        planWeeks: _planWeeks,
        runsPerWeek: _runsPerWeek,
      );

      final goal =
          await ref.read(goalsProvider.notifier).createGoal(request);
      if (mounted) {
        context.go('/goals/${goal.id}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create goal: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Goal'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/goals'),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: List.generate(
                _totalSteps,
                (index) => Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      right: index < _totalSteps - 1 ? 4 : 0,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: Container(
                        height: 4,
                        color: index <= _currentStep
                            ? AppColors.primary
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _currentStep,
              children: [
                _NameStep(
                  controller: _nameController,
                  formKey: _nameFormKey,
                  selectedRaceType: _selectedRaceType,
                  onRaceTypeSelected: (type) {
                    setState(() {
                      _selectedRaceType = type;
                    });
                  },
                ),
                _DateStep(
                  selectedDate: _selectedDate,
                  onDateSelected: (date) {
                    setState(() {
                      _selectedDate = date;
                    });
                  },
                ),
                _TargetTimeStep(
                  hasTargetTime: _hasTargetTime,
                  onHasTargetTimeChanged: (value) {
                    setState(() {
                      _hasTargetTime = value;
                    });
                  },
                  hoursController: _hoursController,
                  minutesController: _minutesController,
                  secondsController: _secondsController,
                ),
                _PlanConfigStep(
                  runsPerWeek: _runsPerWeek,
                  weeklyMileageGoal: _weeklyMileageGoal,
                  planWeeks: _planWeeks,
                  onRunsPerWeekChanged: (value) {
                    setState(() {
                      _runsPerWeek = value;
                    });
                  },
                  onWeeklyMileageGoalChanged: (value) {
                    setState(() {
                      _weeklyMileageGoal = value;
                    });
                  },
                  onPlanWeeksChanged: (value) {
                    setState(() {
                      _planWeeks = value;
                    });
                  },
                ),
                _ReviewStep(
                  name: _nameController.text,
                  raceType: _selectedRaceType,
                  raceDate: _selectedDate,
                  targetTime: _targetTimeInSeconds,
                  runsPerWeek: _runsPerWeek,
                  weeklyMileageGoal: _weeklyMileageGoal,
                  planWeeks: _planWeeks,
                ),
              ],
            ),
          ),
          _NavigationButtons(
            currentStep: _currentStep,
            totalSteps: _totalSteps,
            isSubmitting: _isSubmitting,
            onPrevious: _previousStep,
            onNext: _nextStep,
            onSubmit: _submit,
          ),
        ],
      ),
    );
  }
}

class _NavigationButtons extends StatelessWidget {
  const _NavigationButtons({
    required this.currentStep,
    required this.totalSteps,
    required this.isSubmitting,
    required this.onPrevious,
    required this.onNext,
    required this.onSubmit,
  });

  final int currentStep;
  final int totalSteps;
  final bool isSubmitting;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final isLastStep = currentStep == totalSteps - 1;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Row(
        children: [
          if (currentStep > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: onPrevious,
                child: const Text('Back'),
              ),
            ),
          if (currentStep > 0) const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: isSubmitting ? null : (isLastStep ? onSubmit : onNext),
              child: isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : Text(isLastStep ? 'Create Goal' : 'Next'),
            ),
          ),
        ],
      ),
    );
  }
}

class _NameStep extends StatelessWidget {
  const _NameStep({
    required this.controller,
    required this.formKey,
    required this.selectedRaceType,
    required this.onRaceTypeSelected,
  });

  final TextEditingController controller;
  final GlobalKey<FormState> formKey;
  final RaceType selectedRaceType;
  final ValueChanged<RaceType> onRaceTypeSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Name & Race Type',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Give your goal a name and select the type of race you\'re training for.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Form(
            key: formKey,
            child: TextFormField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Goal Name',
                hintText: 'e.g. Berlin Marathon 2025',
              ),
              textCapitalization: TextCapitalization.words,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Goal name is required';
                if (v.trim().length < 2) return 'At least 2 characters';
                return null;
              },
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Race Type',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          ...RaceType.values.map(
            (type) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _RaceTypeOption(
                type: type,
                isSelected: type == selectedRaceType,
                onTap: () => onRaceTypeSelected(type),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RaceTypeOption extends StatelessWidget {
  const _RaceTypeOption({
    required this.type,
    required this.isSelected,
    required this.onTap,
  });

  final RaceType type;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isSelected
          ? AppColors.primary.withValues(alpha: 0.1)
          : theme.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.onSurfaceVariant,
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? const Icon(Icons.check, size: 14, color: AppColors.onPrimary)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      raceTypeLabel(type),
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Distance: ${_formatRaceDistance(type)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
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

  String _formatRaceDistance(RaceType type) {
    final distance = raceTypeDistance(type);
    return '${(distance / 1000).toStringAsFixed(1)} km';
  }
}

class _DateStep extends StatelessWidget {
  const _DateStep({
    required this.selectedDate,
    required this.onDateSelected,
  });

  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Race Date',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'When is your target race day?',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    _formatDate(selectedDate),
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 730)),
                        );
                        if (picked != null) {
                          onDateSelected(picked);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: const Text('Select Date'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: AppColors.onSurfaceVariant,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '${selectedDate.difference(DateTime.now()).inDays} days from now',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _TargetTimeStep extends StatelessWidget {
  const _TargetTimeStep({
    required this.hasTargetTime,
    required this.onHasTargetTimeChanged,
    required this.hoursController,
    required this.minutesController,
    required this.secondsController,
  });

  final bool hasTargetTime;
  final ValueChanged<bool> onHasTargetTimeChanged;
  final TextEditingController hoursController;
  final TextEditingController minutesController;
  final TextEditingController secondsController;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Target Time',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Set a target finish time for your race. This is optional.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          SwitchListTile(
            title: const Text('Set a target time'),
            value: hasTargetTime,
            onChanged: onHasTargetTimeChanged,
            contentPadding: EdgeInsets.zero,
          ),
          if (hasTargetTime) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: hoursController,
                    decoration: const InputDecoration(
                      labelText: 'Hours',
                      hintText: '0',
                    ),
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Text(
                    ':',
                    style: theme.textTheme.headlineMedium,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: minutesController,
                    decoration: const InputDecoration(
                      labelText: 'Minutes',
                      hintText: '0',
                    ),
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Text(
                    ':',
                    style: theme.textTheme.headlineMedium,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: secondsController,
                    decoration: const InputDecoration(
                      labelText: 'Seconds',
                      hintText: '0',
                    ),
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PlanConfigStep extends StatelessWidget {
  const _PlanConfigStep({
    required this.runsPerWeek,
    required this.weeklyMileageGoal,
    required this.planWeeks,
    required this.onRunsPerWeekChanged,
    required this.onWeeklyMileageGoalChanged,
    required this.onPlanWeeksChanged,
  });

  final int runsPerWeek;
  final double weeklyMileageGoal;
  final int planWeeks;
  final ValueChanged<int> onRunsPerWeekChanged;
  final ValueChanged<double> onWeeklyMileageGoalChanged;
  final ValueChanged<int> onPlanWeeksChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Training Plan',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Configure your training plan preferences.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.directions_run, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Runs per week',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '$runsPerWeek',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: runsPerWeek.toDouble(),
                    min: 2,
                    max: 7,
                    divisions: 5,
                    label: '$runsPerWeek',
                    onChanged: (value) => onRunsPerWeekChanged(value.round()),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.straighten, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Weekly mileage goal',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '${weeklyMileageGoal.toStringAsFixed(0)} km',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: weeklyMileageGoal,
                    min: 10,
                    max: 120,
                    divisions: 22,
                    label: '${weeklyMileageGoal.toStringAsFixed(0)} km',
                    onChanged: onWeeklyMileageGoalChanged,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calendar_month, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Plan duration',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '$planWeeks weeks',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: planWeeks.toDouble(),
                    min: 4,
                    max: 24,
                    divisions: 20,
                    label: '$planWeeks weeks',
                    onChanged: (value) => onPlanWeeksChanged(value.round()),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep({
    required this.name,
    required this.raceType,
    required this.raceDate,
    required this.targetTime,
    required this.runsPerWeek,
    required this.weeklyMileageGoal,
    required this.planWeeks,
  });

  final String name;
  final RaceType raceType;
  final DateTime raceDate;
  final int? targetTime;
  final int runsPerWeek;
  final double weeklyMileageGoal;
  final int planWeeks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Review',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Review your goal details before creating.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ReviewRow(
                    icon: Icons.flag,
                    label: 'Goal Name',
                    value: name.isEmpty ? 'Not set' : name,
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.directions_run,
                    label: 'Race Type',
                    value: raceTypeLabel(raceType),
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.event,
                    label: 'Race Date',
                    value: _formatDate(raceDate),
                  ),
                  if (targetTime != null) ...[
                    const Divider(height: 24),
                    _ReviewRow(
                      icon: Icons.timer,
                      label: 'Target Time',
                      value: _formatDuration(targetTime!),
                    ),
                  ],
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.directions_run,
                    label: 'Runs per Week',
                    value: '$runsPerWeek',
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.straighten,
                    label: 'Weekly Mileage',
                    value: '${weeklyMileageGoal.toStringAsFixed(0)} km',
                  ),
                  const Divider(height: 24),
                  _ReviewRow(
                    icon: Icons.calendar_month,
                    label: 'Plan Duration',
                    value: '$planWeeks weeks',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    if (hours > 0) {
      return '${hours}h ${minutes}m ${secs}s';
    }
    return '${minutes}m ${secs}s';
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.onSurfaceVariant),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
