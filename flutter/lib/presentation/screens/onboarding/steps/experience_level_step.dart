import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/onboarding_providers.dart';

class ExperienceLevelStep extends ConsumerWidget {
  const ExperienceLevelStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final onboarding = ref.watch(onboardingProvider);
    final current = onboarding.experienceLevel;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.trending_up,
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'What\'s your running experience?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'This helps us calibrate your training plan intensity.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ...[
            _ExperienceCard(
              title: 'Beginner',
              subtitle: 'New to running or less than 6 months',
              icon: Icons.directions_walk,
              color: const Color(0xFF4CAF50),
              isSelected: current == 'BEGINNER',
              onTap: () => ref
                  .read(onboardingProvider.notifier)
                  .setExperienceLevel('BEGINNER'),
            ),
            const SizedBox(height: 12),
            _ExperienceCard(
              title: 'Intermediate',
              subtitle: 'Running regularly for 6+ months',
              icon: Icons.directions_run,
              color: const Color(0xFF2196F3),
              isSelected: current == 'INTERMEDIATE',
              onTap: () => ref
                  .read(onboardingProvider.notifier)
                  .setExperienceLevel('INTERMEDIATE'),
            ),
            const SizedBox(height: 12),
            _ExperienceCard(
              title: 'Advanced',
              subtitle: 'Experienced runner with race history',
              icon: Icons.emoji_events,
              color: const Color(0xFFFF9800),
              isSelected: current == 'ADVANCED',
              onTap: () => ref
                  .read(onboardingProvider.notifier)
                  .setExperienceLevel('ADVANCED'),
            ),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _ExperienceCard extends StatelessWidget {
  const _ExperienceCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? color.withValues(alpha: 0.12)
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
            border: isSelected
                ? Border.all(color: color.withValues(alpha: 0.6), width: 2)
                : Border.all(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.1)),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isSelected ? color : null,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(Icons.check_circle, color: color, size: 24),
            ],
          ),
        ),
      ),
    );
  }
}
