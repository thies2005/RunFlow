import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/readiness/readiness_entities.dart';
import 'package:runflow_flutter/presentation/providers/readiness_providers.dart';

class ReadinessCard extends ConsumerWidget {
  const ReadinessCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final readinessAsync = ref.watch(readinessProvider);

    return readinessAsync.when(
      data: (record) {
        if (record == null || record.state == ReadinessState.unavailable) {
          return const _UnavailableCard();
        }
        final isPartial = record.confidence == DataConfidence.estimated ||
            record.confidence == DataConfidence.partial;
        return _DataCard(record: record, isPartial: isPartial);
      },
      loading: () => const _LoadingCard(),
      error: (_, _) => const _UnavailableCard(),
    );
  }
}

Color _stateColor(ReadinessState state) {
  switch (state) {
    case ReadinessState.excellent:
      return AppColors.success;
    case ReadinessState.good:
      return AppColors.peaked;
    case ReadinessState.moderate:
      return AppColors.warning;
    case ReadinessState.reduced:
      return AppColors.fatigued;
    case ReadinessState.rest:
      return AppColors.error;
    case ReadinessState.unavailable:
      return AppColors.onSurfaceVariant;
  }
}

String _stateLabel(ReadinessState state) {
  switch (state) {
    case ReadinessState.excellent:
      return 'Excellent';
    case ReadinessState.good:
      return 'Good';
    case ReadinessState.moderate:
      return 'Moderate';
    case ReadinessState.reduced:
      return 'Reduced';
    case ReadinessState.rest:
      return 'Rest';
    case ReadinessState.unavailable:
      return 'Unknown';
  }
}

class _DataCard extends StatelessWidget {
  const _DataCard({required this.record, required this.isPartial});

  final DailyReadinessRecord record;
  final bool isPartial;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _stateColor(record.state);
    final score = record.compositeScore.round();

    final hrr = record.componentScores.where(
      (c) => c.component == ReadinessComponent.hrr,
    );
    final sleep = record.componentScores.where(
      (c) => c.component == ReadinessComponent.sleep,
    );
    final load = record.componentScores.where(
      (c) => c.component == ReadinessComponent.load,
    );
    final feel = record.componentScores.where(
      (c) => c.component == ReadinessComponent.subjective,
    );

    return InkWell(
      onTap: () => context.push('/health/readiness'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Readiness',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (isPartial)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Estimated',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: AppColors.onSurfaceVariant,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withValues(alpha: 0.15),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$score',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: color,
                      height: 1,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _stateLabel(record.state),
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (record.reasons.isNotEmpty)
                        Text(
                          record.reasons.first,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _ComponentMini(
                  label: 'HRR',
                  score: hrr.isEmpty ? null : hrr.first,
                ),
                _ComponentMini(
                  label: 'Sleep',
                  score: sleep.isEmpty ? null : sleep.first,
                ),
                _ComponentMini(
                  label: 'Load',
                  score: load.isEmpty ? null : load.first,
                ),
                _ComponentMini(
                  label: 'Feel',
                  score: feel.isEmpty ? null : feel.first,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ComponentMini extends StatelessWidget {
  const _ComponentMini({required this.label, required this.score});

  final String label;
  final ComponentScore? score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final available = score != null && score!.isAvailable;
    final value = available ? '${score!.score.round()}' : '—';
    final color = available ? AppColors.onSurface : AppColors.onSurfaceVariant;

    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _UnavailableCard extends StatelessWidget {
  const _UnavailableCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () => context.push('/health/readiness'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.12),
              ),
              alignment: Alignment.center,
              child: const Icon(
                Icons.monitor_heart_outlined,
                size: 20,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Readiness',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Check your readiness',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Check',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 14,
                  width: 80,
                  decoration: BoxDecoration(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.08),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 16,
                      width: 90,
                      decoration: BoxDecoration(
                        color: AppColors.onSurfaceVariant
                            .withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      height: 12,
                      width: 140,
                      decoration: BoxDecoration(
                        color: AppColors.onSurfaceVariant
                            .withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              4,
              (_) => Column(
                children: [
                  Container(
                    height: 14,
                    width: 24,
                    decoration: BoxDecoration(
                      color: AppColors.onSurfaceVariant
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    height: 10,
                    width: 30,
                    decoration: BoxDecoration(
                      color: AppColors.onSurfaceVariant
                          .withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
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
}
