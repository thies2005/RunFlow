import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/datasources/local/workout_template_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';

class WorkoutBuilderScreen extends StatefulWidget {
  const WorkoutBuilderScreen({super.key});

  @override
  State<WorkoutBuilderScreen> createState() => _WorkoutBuilderScreenState();
}

class _WorkoutBuilderScreenState extends State<WorkoutBuilderScreen> {
  final _nameController = TextEditingController();
  final List<_EditableNode> _nodes = [];
  final _datasource = WorkoutTemplateLocalDatasource();

  @override
  void dispose() {
    _nameController.dispose();
    for (final node in _nodes) {
      node.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Workout Builder')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                hintText: 'Workout name',
                prefixIcon: Icon(Icons.edit),
              ),
            ),
          ),
          Expanded(
            child: _nodes.isEmpty
                ? Center(
                    child: Text(
                      'Add steps to build your workout',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  )
                : ReorderableListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    buildDefaultDragHandles: false,
                    itemCount: _nodes.length,
                    // ignore: deprecated_member_use
                    onReorder: (oldIndex, newIndex) {
                      if (newIndex > oldIndex) newIndex--;
                      final item = _nodes.removeAt(oldIndex);
                      _nodes.insert(newIndex, item);
                      setState(() {});
                    },
                    itemBuilder: (context, index) {
                      return _buildNodeCard(index);
                    },
                  ),
          ),
          _buildBottomActions(),
        ],
      ),
    );
  }

  Widget _buildNodeCard(int index) {
    final node = _nodes[index];
    if (node.isGroup) {
      return _buildGroupCard(index);
    }
    return ReorderableDragStartListener(
      key: ValueKey('node_$index'),
      index: index,
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(_stepTypeIcon(node.stepType), size: 18,
                      color: _stepTypeColor(node.stepType)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      node.name.isEmpty
                          ? node.stepType.name.toUpperCase()
                          : node.name,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: () => setState(() => _nodes.removeAt(index)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildTypeChip(node, index),
                  const SizedBox(width: 8),
                  _buildDurationFields(node, index),
                ],
              ),
              const SizedBox(height: 8),
              _buildPaceTargetRow(node, index),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGroupCard(int index) {
    final node = _nodes[index];
    return ReorderableDragStartListener(
      key: ValueKey('node_$index'),
      index: index,
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4),
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: AppColors.primary.withValues(alpha: 0.4),
            width: 1.5,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.repeat, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Repeat Group',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 80,
                    child: Row(
                      children: [
                        const Text('x'),
                        const SizedBox(width: 4),
                        Expanded(
                          child: DropdownButton<int>(
                            value: node.repeatCount,
                            isDense: true,
                            underline: const SizedBox(),
                            items: List.generate(
                              10,
                              (i) => DropdownMenuItem(
                                value: i + 1,
                                child: Text('${i + 1}'),
                              ),
                            ),
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => node.repeatCount = v);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: () => setState(() => _nodes.removeAt(index)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...node.children.asMap().entries.map((entry) {
                final ci = entry.key;
                final child = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(_stepTypeIcon(child.stepType), size: 16,
                          color: _stepTypeColor(child.stepType)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          child.name.isEmpty
                              ? child.stepType.name.toUpperCase()
                              : child.name,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () => setState(() {
                          node.children.removeAt(ci);
                          if (node.children.isEmpty) {
                            _nodes.removeAt(index);
                          }
                        }),
                      ),
                    ],
                  ),
                );
              }),
              TextButton.icon(
                onPressed: () => _showAddStepToGroup(index),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Add step'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeChip(_EditableNode node, int index) {
    return DropdownButton<StepType>(
      value: node.stepType,
      isDense: true,
      underline: const SizedBox(),
      items: StepType.values
          .map((t) => DropdownMenuItem(
                value: t,
                child: Text(t.name),
              ))
          .toList(),
      onChanged: (v) {
        if (v != null) setState(() => node.stepType = v);
      },
    );
  }

  Widget _buildDurationFields(_EditableNode node, int index) {
    return Expanded(
      child: Row(
        children: [
          DropdownButton<StepDurationType>(
            value: node.durationType,
            isDense: true,
            underline: const SizedBox(),
            items: StepDurationType.values
                .map((t) => DropdownMenuItem(
                      value: t,
                      child: Text(t.name),
                    ))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => node.durationType = v);
            },
          ),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 40,
              child: TextField(
                controller: node.durationController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: node.durationType == StepDurationType.time
                      ? 'seconds'
                      : 'meters',
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  isDense: true,
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaceTargetRow(_EditableNode node, int index) {
    return Row(
      children: [
        Text(
          'Pace target:',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 70,
          height: 36,
          child: TextField(
            controller: node.minPaceController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'min s/km',
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              isDense: true,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text('-',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                )),
        const SizedBox(width: 6),
        SizedBox(
          width: 70,
          height: 36,
          child: TextField(
            controller: node.maxPaceController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'max s/km',
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              isDense: true,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomActions() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _addStep,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Step'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _addGroup,
                    icon: const Icon(Icons.repeat),
                    label: const Text('Repeat Group'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saveTemplate,
                icon: const Icon(Icons.save),
                label: const Text('Save Template'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _addStep() {
    setState(() {
      _nodes.add(_EditableNode(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        stepType: StepType.interval,
        durationType: StepDurationType.time,
      ));
    });
  }

  void _addGroup() {
    setState(() {
      _nodes.add(_EditableNode(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        isGroup: true,
        repeatCount: 2,
      ));
    });
  }

  void _showAddStepToGroup(int groupIndex) {
    final group = _nodes[groupIndex];
    setState(() {
      group.children.add(_EditableNode(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        stepType: StepType.interval,
        durationType: StepDurationType.time,
      ));
    });
  }

  Future<void> _saveTemplate() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a workout name')),
      );
      return;
    }
    if (_nodes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one step')),
      );
      return;
    }

    final steps = _nodes.map(_buildStepNode).toList();
    final workout = StructuredWorkout(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      steps: steps,
    );

    await _datasource.addTemplate(workout);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Template saved')),
      );
      context.pop();
    }
  }

  StepNode _buildStepNode(_EditableNode node) {
    if (node.isGroup) {
      return StepNode.group(StepGroup(
        id: node.id,
        name: 'Repeat x${node.repeatCount}',
        repeatCount: node.repeatCount,
        children: node.children.map(_buildStepNode).toList(),
      ));
    }
    final durationValue = int.tryParse(node.durationController.text);
    final distanceValue = double.tryParse(node.durationController.text);
    final minPace = double.tryParse(node.minPaceController.text);
    final maxPace = double.tryParse(node.maxPaceController.text);

    return StepNode.step(WorkoutStep(
      id: node.id,
      type: node.stepType,
      name: node.name.isEmpty ? node.stepType.name : node.name,
      durationType: node.durationType,
      durationSeconds:
          node.durationType == StepDurationType.time ? durationValue : null,
      distanceMeters:
          node.durationType == StepDurationType.distance ? distanceValue : null,
      paceTarget: minPace != null || maxPace != null
          ? PaceTarget(
              minPaceSecondsPerKm: minPace,
              maxPaceSecondsPerKm: maxPace,
            )
          : null,
    ));
  }

  IconData _stepTypeIcon(StepType type) {
    switch (type) {
      case StepType.warmup:
        return Icons.wb_sunny_outlined;
      case StepType.cooldown:
        return Icons.ac_unit;
      case StepType.interval:
        return Icons.flash_on;
      case StepType.recovery:
        return Icons.self_improvement;
      case StepType.rest:
        return Icons.pause_circle_outline;
    }
  }

  Color _stepTypeColor(StepType type) {
    switch (type) {
      case StepType.warmup:
        return AppColors.warning;
      case StepType.cooldown:
        return Colors.lightBlue;
      case StepType.interval:
        return AppColors.primary;
      case StepType.recovery:
        return AppColors.success;
      case StepType.rest:
        return AppColors.onSurfaceVariant;
    }
  }
}

class _EditableNode {
  _EditableNode({
    required this.id,
    this.stepType = StepType.interval,
    this.durationType = StepDurationType.time,
    this.isGroup = false,
    this.repeatCount = 1,
    List<_EditableNode>? children,
  }) : name = '', children = children ?? [];

  final String id;
  StepType stepType;
  StepDurationType durationType;
  String name;
  final bool isGroup;
  int repeatCount;
  final List<_EditableNode> children;

  final TextEditingController durationController = TextEditingController();
  final TextEditingController minPaceController = TextEditingController();
  final TextEditingController maxPaceController = TextEditingController();

  void dispose() {
    durationController.dispose();
    minPaceController.dispose();
    maxPaceController.dispose();
    for (final child in children) {
      child.dispose();
    }
  }
}
