import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class RaceGoalStep extends ConsumerStatefulWidget {
  const RaceGoalStep({super.key});

  @override
  ConsumerState<RaceGoalStep> createState() => _RaceGoalStepState();
}

class _RaceGoalStepState extends ConsumerState<RaceGoalStep> {
  late TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    final onboarding = ref.read(onboardingProvider);
    _nameController = TextEditingController(text: onboarding.goalName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF9C27B0).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.flag,
              color: Color(0xFF9C27B0),
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'What\'s your target race?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Choose your race distance and when you plan to compete.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Race Name',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      hintText: 'e.g., Berlin Marathon 2026',
                      prefixIcon: Icon(Icons.edit, size: 20),
                    ),
                    onChanged: (value) {
                      ref.read(onboardingProvider.notifier).setGoalName(value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Race Distance',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: RaceType.values.map((type) {
                      final selected = type == onboarding.raceType;
                      return ChoiceChip(
                        label: Text(raceTypeLabel(type)),
                        selected: selected,
                        onSelected: (_) {
                          ref
                              .read(onboardingProvider.notifier)
                              .setRaceType(type);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Race Date',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: onboarding.raceDate,
                            firstDate: DateTime.now(),
                            lastDate:
                                DateTime.now().add(const Duration(days: 730)),
                          );
                          if (picked != null) {
                            ref
                                .read(onboardingProvider.notifier)
                                .setRaceDate(picked);
                          }
                        },
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text(_formatDate(onboarding.raceDate)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Plan Start Date',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: onboarding.planStartDate,
                            firstDate: DateTime.now()
                                .subtract(const Duration(days: 7)),
                            lastDate: onboarding.raceDate,
                          );
                          if (picked != null) {
                            ref
                                .read(onboardingProvider.notifier)
                                .setPlanStartDate(picked);
                          }
                        },
                        icon: const Icon(Icons.play_arrow, size: 16),
                        label: Text(_formatDate(onboarding.planStartDate)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Plan Duration',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        '${onboarding.computedPlanWeeks} weeks',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
