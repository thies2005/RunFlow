import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';
import 'package:runflow_flutter/presentation/screens/record/exercise_picker_sheet.dart';

class WorkoutTemplateEditorScreen extends ConsumerStatefulWidget {
  const WorkoutTemplateEditorScreen({super.key, required this.templateId});

  final String? templateId;

  @override
  ConsumerState<WorkoutTemplateEditorScreen> createState() => _WorkoutTemplateEditorScreenState();
}

class _WorkoutTemplateEditorScreenState extends ConsumerState<WorkoutTemplateEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  List<WorkoutExercise> _exercises = [];
  bool _isInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInit) {
      _loadTemplate();
      _isInit = true;
    }
  }

  void _loadTemplate() {
    final id = widget.templateId;
    if (id == null || id == 'new') {
      _nameController.text = 'New Routine';
      _exercises = [];
    } else {
      final templates = ref.read(strengthTemplatesProvider).value ?? [];
      final t = templates.firstWhere((element) => element.id == id, orElse: () => StrengthWorkoutTemplate(id: '', name: '', exercises: [], createdAt: DateTime(2000), updatedAt: DateTime(2000)));
      if (t.id.isNotEmpty) {
        _nameController.text = t.name;
        _exercises = List.from(t.exercises);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.templateId == 'new' ? 'New Routine' : 'Edit Routine'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveTemplate,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextFormField(
                controller: _nameController,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                decoration: const InputDecoration(
                  labelText: 'Routine Name',
                  border: OutlineInputBorder(),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please enter a routine name';
                  }
                  return null;
                },
              ),
            ),
            Expanded(
              child: _exercises.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_task_outlined, size: 64, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          const Text('No exercises added yet'),
                          const SizedBox(height: 8),
                          FilledButton.tonal(
                            onPressed: _addExercises,
                            child: const Text('Add Exercise'),
                          ),
                        ],
                      ),
                    )
                  : ReorderableListView.builder(
                      itemCount: _exercises.length,
                      onReorder: _onReorderExercises,
                      itemBuilder: (context, index) {
                        final we = _exercises[index];
                        return Card(
                          key: ValueKey(we.id),
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.drag_handle, color: AppColors.onSurfaceVariant),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        we.exerciseName,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.close, color: AppColors.error),
                                      onPressed: () => _removeExercise(we.id),
                                    ),
                                  ],
                                ),
                                const Divider(),
                                _buildSetsTable(we),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _addSetToExercise(we.id),
                                      icon: const Icon(Icons.add),
                                      label: const Text('Add Set'),
                                    ),
                                    Row(
                                      children: [
                                        const Text('Rest: ', style: TextStyle(fontSize: 12)),
                                        DropdownButton<int>(
                                          value: we.restSeconds,
                                          style: theme.textTheme.bodyMedium,
                                          underline: const SizedBox(),
                                          onChanged: (val) {
                                            if (val != null) {
                                              setState(() {
                                                _exercises = _exercises.map((e) {
                                                  if (e.id == we.id) {
                                                    return e.copyWith(restSeconds: val);
                                                  }
                                                  return e;
                                                }).toList();
                                              });
                                            }
                                          },
                                          items: const [
                                            DropdownMenuItem(value: 30, child: Text('30s')),
                                            DropdownMenuItem(value: 60, child: Text('60s')),
                                            DropdownMenuItem(value: 90, child: Text('90s')),
                                            DropdownMenuItem(value: 120, child: Text('120s')),
                                            DropdownMenuItem(value: 180, child: Text('180s')),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: _exercises.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _addExercises,
              icon: const Icon(Icons.add),
              label: const Text('Add Exercise'),
            )
          : null,
    );
  }

  Widget _buildSetsTable(WorkoutExercise we) {
    return Table(
      columnWidths: const {
        0: FixedColumnWidth(40),  // Set number
        1: FlexColumnWidth(),      // Weight
        2: FlexColumnWidth(),      // Reps
        3: FixedColumnWidth(80),  // Toggles (Warmup/Drop)
        4: FixedColumnWidth(40),  // Delete
      },
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        const TableRow(
          children: [
            Padding(
              padding: EdgeInsets.symmetric(vertical: 6.0),
              child: Text('Set', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ),
            Text('Weight', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Text('Reps', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Center(child: Text('Type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
            SizedBox(),
          ],
        ),
        ...we.sets.map((s) {
          final weightController = TextEditingController(text: s.weight != null ? s.weight!.toString() : '');
          final repsController = TextEditingController(text: s.reps != null ? s.reps!.toString() : '');

          return TableRow(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(s.setNumber.toString(), style: const TextStyle(fontSize: 13)),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4.0),
                child: TextFormField(
                  controller: weightController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (val) {
                    final w = double.tryParse(val);
                    _updateSetFields(we.id, s.id, weight: w);
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4.0),
                child: TextFormField(
                  controller: repsController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                    isDense: true,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (val) {
                    final r = int.tryParse(val);
                    _updateSetFields(we.id, s.id, reps: r);
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ChoiceChip(
                    label: const Text('W', style: TextStyle(fontSize: 10)),
                    selected: s.isWarmup,
                    onSelected: (selected) {
                      _updateSetFields(we.id, s.id, isWarmup: selected, isDropSet: selected ? false : null);
                    },
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  const SizedBox(width: 4),
                  ChoiceChip(
                    label: const Text('D', style: TextStyle(fontSize: 10)),
                    selected: s.isDropSet,
                    onSelected: (selected) {
                      _updateSetFields(we.id, s.id, isDropSet: selected, isWarmup: selected ? false : null);
                    },
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.onSurfaceVariant),
                onPressed: () => _deleteSetFromExercise(we.id, s.id),
              ),
            ],
          );
        }),
      ],
    );
  }

  void _onReorderExercises(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final item = _exercises.removeAt(oldIndex);
      _exercises.insert(newIndex, item);
    });
  }

  void _addExercises() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return ExercisePickerSheet(
              scrollController: scrollController,
              onExercisesSelected: (selected) {
                setState(() {
                  for (final ex in selected) {
                    final weId = 'template_we_${DateTime.now().millisecondsSinceEpoch}_${ex.id}';
                    _exercises.add(WorkoutExercise(
                      id: weId,
                      exerciseId: ex.id,
                      exerciseName: ex.name,
                      primaryMuscle: ex.primaryMuscle,
                      restSeconds: ex.restSeconds,
                      sets: [
                        ExerciseSet(
                          id: '${weId}_0',
                          setNumber: 1,
                        ),
                      ],
                    ));
                  }
                });
              },
            );
          },
        );
      },
    );
  }

  void _removeExercise(String id) {
    setState(() {
      _exercises.removeWhere((e) => e.id == id);
    });
  }

  void _addSetToExercise(String weId) {
    setState(() {
      _exercises = _exercises.map((we) {
        if (we.id != weId) return we;
        final nextNum = we.sets.length + 1;
        final last = we.sets.isNotEmpty ? we.sets.last : null;
        return we.copyWith(
          sets: [
            ...we.sets,
            ExerciseSet(
              id: '${weId}_${nextNum - 1}_${DateTime.now().microsecondsSinceEpoch}',
              setNumber: nextNum,
              weight: last?.weight,
              reps: last?.reps,
              isWarmup: last?.isWarmup ?? false,
              isDropSet: last?.isDropSet ?? false,
            ),
          ],
        );
      }).toList();
    });
  }

  void _deleteSetFromExercise(String weId, String setId) {
    setState(() {
      _exercises = _exercises.map((we) {
        if (we.id != weId) return we;
        final filtered = we.sets.where((s) => s.id != setId).toList();
        final renumbered = List.generate(filtered.length, (i) {
          return filtered[i].copyWith(setNumber: i + 1);
        });
        return we.copyWith(sets: renumbered);
      }).toList();
    });
  }

  void _updateSetFields(String weId, String setId, {
    double? weight,
    int? reps,
    bool? isWarmup,
    bool? isDropSet,
  }) {
    setState(() {
      _exercises = _exercises.map((we) {
        if (we.id != weId) return we;
        return we.copyWith(
          sets: we.sets.map((s) {
            if (s.id != setId) return s;
            return s.copyWith(
              weight: weight,
              reps: reps,
              isWarmup: isWarmup,
              isDropSet: isDropSet,
            );
          }).toList(),
        );
      }).toList();
    });
  }

  void _saveTemplate() {
    if (!_formKey.currentState!.validate()) return;

    final name = _nameController.text.trim();
    if (_exercises.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one exercise to the routine')),
      );
      return;
    }

    final id = widget.templateId == 'new'
        ? 'template_${DateTime.now().millisecondsSinceEpoch}'
        : widget.templateId!;

    final template = StrengthWorkoutTemplate(
      id: id,
      name: name,
      exercises: _exercises,
      createdAt: widget.templateId == 'new' ? DateTime.now() : DateTime.now(), // dummy / actual
      updatedAt: DateTime.now(),
    );

    if (widget.templateId == 'new') {
      ref.read(strengthTemplatesProvider.notifier).addTemplate(template);
    } else {
      ref.read(strengthTemplatesProvider.notifier).updateTemplate(template);
    }

    context.pop();
  }
}
