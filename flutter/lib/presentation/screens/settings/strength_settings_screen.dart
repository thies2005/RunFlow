import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';

class StrengthSettingsScreen extends ConsumerStatefulWidget {
  const StrengthSettingsScreen({super.key});

  @override
  ConsumerState<StrengthSettingsScreen> createState() => _StrengthSettingsScreenState();
}

class _StrengthSettingsScreenState extends ConsumerState<StrengthSettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  MuscleGroup? _selectedMuscleFilter;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Strength Settings'),
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Routines', icon: Icon(Icons.fitness_center)),
              Tab(text: 'Exercises', icon: Icon(Icons.list_alt)),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildRoutinesTab(),
            _buildExercisesTab(),
          ],
        ),
        floatingActionButton: _buildFAB(theme),
      ),
    );
  }

  Widget? _buildFAB(ThemeData theme) {
    if (_tabController.index == 0) {
      return FloatingActionButton.extended(
        onPressed: () => context.push('/settings/strength/template/new'),
        icon: const Icon(Icons.add),
        label: const Text('New Routine'),
      );
    } else {
      return FloatingActionButton.extended(
        onPressed: () => _showExerciseDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Custom Exercise'),
      );
    }
  }

  // --- Routines (Templates) Tab ---

  Widget _buildRoutinesTab() {
    final templatesAsync = ref.watch(strengthTemplatesProvider);

    return templatesAsync.when(
      data: (templates) {
        if (templates.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.fitness_center_outlined, size: 64, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  const Text(
                    'No saved routines yet',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Create routine templates to speed up your workout logging.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: templates.length,
          itemBuilder: (context, index) {
            final template = templates[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => context.push('/settings/strength/template/${template.id}'),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              template.name,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${template.exercises.length} exercises',
                              style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 6,
                              children: template.exercises.take(3).map((e) {
                                return Chip(
                                  label: Text(
                                    e.exerciseName,
                                    style: const TextStyle(fontSize: 11),
                                  ),
                                  padding: EdgeInsets.zero,
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit, color: AppColors.onSurfaceVariant),
                        onPressed: () => context.push('/settings/strength/template/${template.id}'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: AppColors.error),
                        onPressed: () => _confirmDeleteTemplate(template),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(child: Text('Error loading routines: $err')),
    );
  }

  void _confirmDeleteTemplate(StrengthWorkoutTemplate template) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Routine?'),
        content: Text('Are you sure you want to delete the routine "${template.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(strengthTemplatesProvider.notifier).deleteTemplate(template.id);
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // --- Exercises Tab ---

  Widget _buildExercisesTab() {
    final exercisesAsync = ref.watch(exerciseLibraryProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: SearchBar(
            hintText: 'Search exercises...',
            leading: const Icon(Icons.search),
            onChanged: (val) {
              setState(() {
                _searchQuery = val.trim();
              });
            },
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Row(
            children: [
              FilterChip(
                label: const Text('All muscles'),
                selected: _selectedMuscleFilter == null,
                onSelected: (selected) {
                  setState(() {
                    _selectedMuscleFilter = null;
                  });
                },
              ),
              const SizedBox(width: 8),
              ...MuscleGroup.values.map((muscle) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text(muscle.name[0].toUpperCase() + muscle.name.substring(1)),
                    selected: _selectedMuscleFilter == muscle,
                    onSelected: (selected) {
                      setState(() {
                        _selectedMuscleFilter = selected ? muscle : null;
                      });
                    },
                  ),
                );
              }),
            ],
          ),
        ),
        Expanded(
          child: exercisesAsync.when(
            data: (exercises) {
              final filtered = exercises.where((e) {
                final matchesSearch = e.name.toLowerCase().contains(_searchQuery.toLowerCase());
                final matchesMuscle = _selectedMuscleFilter == null ||
                    e.primaryMuscle == _selectedMuscleFilter ||
                    e.secondaryMuscle == _selectedMuscleFilter;
                return matchesSearch && matchesMuscle;
              }).toList();

              if (filtered.isEmpty) {
                return const Center(child: Text('No matching exercises found'));
              }

              return ListView.builder(
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final ex = filtered[index];
                  return ListTile(
                    title: Text(ex.name),
                    subtitle: Text(
                      '${ex.primaryMuscle.name}${ex.secondaryMuscle != null ? ", ${ex.secondaryMuscle!.name}" : ""}'
                      '${ex.isBodyweight ? " • Bodyweight" : ""}',
                    ),
                    trailing: ex.isCustom
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit, size: 20),
                                onPressed: () => _showExerciseDialog(context, exercise: ex),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete, size: 20, color: AppColors.error),
                                onPressed: () => ref.read(exerciseLibraryProvider.notifier).deleteExercise(ex.id),
                              ),
                            ],
                          )
                        : null,
                    onTap: () {
                      _showExerciseDetails(ex);
                    },
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(child: Text('Error loading exercises: $err')),
          ),
        ),
      ],
    );
  }

  void _showExerciseDetails(Exercise ex) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                ex.name,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Primary Muscle: ${ex.primaryMuscle.name}',
                style: const TextStyle(fontSize: 15),
              ),
              if (ex.secondaryMuscle != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Secondary Muscle: ${ex.secondaryMuscle!.name}',
                  style: const TextStyle(fontSize: 15),
                ),
              ],
              const SizedBox(height: 4),
              Text(
                'Type: ${ex.isBodyweight ? "Bodyweight" : "Weighted"}',
                style: const TextStyle(fontSize: 15),
              ),
              const SizedBox(height: 4),
              Text(
                'Default Rest Time: ${ex.restSeconds} seconds',
                style: const TextStyle(fontSize: 15),
              ),
              if (ex.notes != null && ex.notes!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Notes:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  ex.notes!,
                  style: const TextStyle(color: AppColors.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showExerciseDialog(BuildContext context, {Exercise? exercise}) {
    final isEdit = exercise != null;
    final nameController = TextEditingController(text: exercise?.name);
    final restController = TextEditingController(text: exercise?.restSeconds.toString() ?? '90');
    final notesController = TextEditingController(text: exercise?.notes);
    MuscleGroup primaryMuscle = exercise?.primaryMuscle ?? MuscleGroup.chest;
    MuscleGroup? secondaryMuscle = exercise?.secondaryMuscle;
    bool isBodyweight = exercise?.isBodyweight ?? false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Edit Custom Exercise' : 'Create Custom Exercise'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Exercise Name'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<MuscleGroup>(
                      initialValue: primaryMuscle,
                      decoration: const InputDecoration(labelText: 'Primary Muscle Group'),
                      items: MuscleGroup.values.map((m) {
                        return DropdownMenuItem(
                          value: m,
                          child: Text(m.name[0].toUpperCase() + m.name.substring(1)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            primaryMuscle = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<MuscleGroup?>(
                      initialValue: secondaryMuscle,
                      decoration: const InputDecoration(labelText: 'Secondary Muscle Group (Optional)'),
                      items: [
                        const DropdownMenuItem<MuscleGroup?>(
                          value: null,
                          child: Text('None'),
                        ),
                        ...MuscleGroup.values.map((m) {
                          return DropdownMenuItem<MuscleGroup?>(
                            value: m,
                            child: Text(m.name[0].toUpperCase() + m.name.substring(1)),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setDialogState(() {
                          secondaryMuscle = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: restController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Default Rest (seconds)'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: notesController,
                      decoration: const InputDecoration(labelText: 'Notes (Optional)'),
                    ),
                    const SizedBox(height: 12),
                    CheckboxListTile(
                      title: const Text('Bodyweight exercise'),
                      value: isBodyweight,
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            isBodyweight = val;
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    final name = nameController.text.trim();
                    final rest = int.tryParse(restController.text.trim()) ?? 90;
                    if (name.isEmpty) return;

                    final updated = Exercise(
                      id: isEdit ? exercise.id : 'custom_${DateTime.now().millisecondsSinceEpoch}',
                      name: name,
                      primaryMuscle: primaryMuscle,
                      secondaryMuscle: secondaryMuscle,
                      restSeconds: rest,
                      notes: notesController.text.trim(),
                      isBodyweight: isBodyweight,
                      isCustom: true,
                    );

                    if (isEdit) {
                      ref.read(exerciseLibraryProvider.notifier).updateExercise(updated);
                    } else {
                      ref.read(exerciseLibraryProvider.notifier).addCustomExercise(updated);
                    }
                    Navigator.pop(context);
                  },
                  child: Text(isEdit ? 'Save' : 'Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
