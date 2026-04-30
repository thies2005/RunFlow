import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/ai_feedback_entities.dart';
import 'package:runflow_flutter/presentation/providers/ai_feedback_providers.dart';

class AiFeedbackSection extends ConsumerWidget {
  const AiFeedbackSection({required this.activityId, super.key});

  final String activityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedbackAsync = ref.watch(aiFeedbackProvider(activityId));

    return feedbackAsync.when(
      loading: () => _buildLoadingState(context),
      error: (_, _) => _buildEmptyState(context, ref),
      data: (feedback) {
        final hasContent = feedback.plannedComparison != null ||
            feedback.progressAnalysis != null ||
            feedback.goalTrajectory != null;
        if (hasContent) {
          return _buildFeedbackContent(context, ref, feedback);
        }
        return _buildEmptyState(context, ref);
      },
    );
  }

  Widget _buildLoadingState(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.smart_toy, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'AI Coach Feedback',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                'Loading...',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isGenerating = ref.watch(aiFeedbackProvider(activityId)).isLoading;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.smart_toy, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'AI Coach Feedback',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Get personalized analysis comparing this run to your planned workout and goals.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: isGenerating
                    ? null
                    : () {
                        ref
                            .read(aiFeedbackProvider(activityId).notifier)
                            .generate(activityId);
                      },
                icon: isGenerating
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.auto_awesome, size: 16),
                label: Text(
                  isGenerating ? 'Generating...' : 'Get AI Analysis',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackContent(
    BuildContext context,
    WidgetRef ref,
    AiActivityFeedback feedback,
  ) {
    final theme = Theme.of(context);
    final isGenerating = ref.watch(aiFeedbackProvider(activityId)).isLoading;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.smart_toy, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI Coach Feedback',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: isGenerating
                      ? null
                      : () {
                          ref
                              .read(aiFeedbackProvider(activityId).notifier)
                              .generate(activityId);
                        },
                  icon: isGenerating
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, size: 14),
                  label: Text(
                    isGenerating ? 'Regenerating...' : 'Regenerate',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (feedback.plannedComparison != null)
              _FeedbackCard(
                icon: Icons.calendar_today,
                title: 'Vs Planned Workout',
                content: feedback.plannedComparison!,
                color: AppColors.primary,
              ),
            if (feedback.progressAnalysis != null) ...[
              const SizedBox(height: 8),
              _FeedbackCard(
                icon: Icons.trending_up,
                title: 'Progress & Execution',
                content: feedback.progressAnalysis!,
                color: AppColors.success,
              ),
            ],
            if (feedback.goalTrajectory != null) ...[
              const SizedBox(height: 8),
              _FeedbackCard(
                icon: Icons.favorite,
                title: 'Goal Trajectory',
                content: feedback.goalTrajectory!,
                color: AppColors.primary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({
    required this.icon,
    required this.title,
    required this.content,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String content;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                title,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          MarkdownBody(
            data: content,
            styleSheet: MarkdownStyleSheet(
              p: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
