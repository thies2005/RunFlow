import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
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
            S.of(context).onboardingTargetRaceTitle,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).onboardingTargetRaceSubtitle,
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
                    S.of(context).onboardingRaceName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      hintText: S.of(context).onboardingRaceNameHint,
                      prefixIcon: const Icon(Icons.edit, size: 20),
                    ),
                    onChanged: (value) {
                      ref.read(onboardingProvider.notifier).setGoalName(value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    S.of(context).onboardingRaceDistance,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _RaceTypeGroup(
                    title: S.of(context).raceCategoryRunning,
                    types: const [
                      RaceType.fiveK,
                      RaceType.tenK,
                      RaceType.halfMarathon,
                      RaceType.marathon,
                    ],
                    selectedType: onboarding.raceType,
                    onSelected: (type) {
                      ref
                          .read(onboardingProvider.notifier)
                          .setRaceType(type);
                    },
                    initiallyExpanded: true,
                  ),
                  _RaceTypeGroup(
                    title: S.of(context).raceCategoryUltra,
                    types: const [
                      RaceType.fiftyK,
                      RaceType.fiftyMile,
                      RaceType.hundredK,
                      RaceType.hundredMile,
                      RaceType.twelveHour,
                      RaceType.twentyFourHour,
                      RaceType.backyardUltra,
                      RaceType.customDistance,
                    ],
                    selectedType: onboarding.raceType,
                    onSelected: (type) {
                      ref
                          .read(onboardingProvider.notifier)
                          .setRaceType(type);
                    },
                  ),
                  _RaceTypeGroup(
                    title: S.of(context).raceCategoryTriathlon,
                    types: const [
                      RaceType.sprintTri,
                      RaceType.olympicTri,
                      RaceType.halfIronman,
                      RaceType.fullIronman,
                      RaceType.customTri,
                    ],
                    selectedType: onboarding.raceType,
                    onSelected: (type) {
                      ref
                          .read(onboardingProvider.notifier)
                          .setRaceType(type);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          S.of(context).onboardingRaceDate,
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
                          S.of(context).onboardingPlanStartDate,
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
                        S.of(context).onboardingPlanDuration,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        S.of(context).onboardingWeeksCount(onboarding.computedPlanWeeks),
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
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _RaceTypeGroup extends StatelessWidget {
  const _RaceTypeGroup({
    required this.title,
    required this.types,
    required this.selectedType,
    required this.onSelected,
    this.initiallyExpanded = false,
  });

  final String title;
  final List<RaceType> types;
  final RaceType selectedType;
  final ValueChanged<RaceType> onSelected;
  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExpansionTile(
      title: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      initiallyExpanded: initiallyExpanded,
      tilePadding: EdgeInsets.zero,
      childrenPadding: const EdgeInsets.only(bottom: 8),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: types.map((type) {
            final selected = type == selectedType;
            return ChoiceChip(
              label: Text(raceTypeLabel(type)),
              selected: selected,
              onSelected: (_) => onSelected(type),
            );
          }).toList(),
        ),
      ],
    );
  }
}
