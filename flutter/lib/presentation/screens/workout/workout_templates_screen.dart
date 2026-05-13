import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/datasources/local/workout_template_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';

class WorkoutTemplatesScreen extends StatefulWidget {
  const WorkoutTemplatesScreen({super.key});

  @override
  State<WorkoutTemplatesScreen> createState() => _WorkoutTemplatesScreenState();
}

class _WorkoutTemplatesScreenState extends State<WorkoutTemplatesScreen> {
  final _datasource = WorkoutTemplateLocalDatasource();
  List<StructuredWorkout> _templates = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTemplates();
  }

  Future<void> _loadTemplates() async {
    final templates = await _datasource.loadTemplates();
    if (mounted) {
      setState(() {
        _templates = templates;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Workout Templates')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
      await context.push('/workout/builder');
      await _loadTemplates();
        },
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _templates.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.fitness_center,
                          size: 64, color: AppColors.onSurfaceVariant),
                      const SizedBox(height: 16),
                      Text(
                        'No templates yet',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Create your first workout template',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.only(bottom: 80),
                  itemCount: _templates.length,
                  itemBuilder: (context, index) {
                    final template = _templates[index];
                    return _buildTemplateCard(template);
                  },
                ),
    );
  }

  Widget _buildTemplateCard(StructuredWorkout template) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/workout/preview/${template.id}'),
        onLongPress: () => _confirmDelete(template),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.fitness_center,
                    size: 22, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      template.name,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_countSteps(template.steps)} steps',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  int _countSteps(List<StepNode> nodes) {
    int count = 0;
    for (final node in nodes) {
      if (node.isStep) {
        count++;
      } else if (node.isGroup) {
        count += _countSteps(node.group!.children);
      }
    }
    return count;
  }

  void _confirmDelete(StructuredWorkout template) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Template'),
        content: Text('Delete "${template.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              await _datasource.deleteTemplate(template.id);
              if (!ctx.mounted) return;
              Navigator.pop(ctx);
              if (mounted) {
                await _loadTemplates();
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
