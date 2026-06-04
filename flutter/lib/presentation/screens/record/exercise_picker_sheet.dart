import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';

class ExercisePickerSheet extends ConsumerStatefulWidget {
  const ExercisePickerSheet({
    super.key,
    this.scrollController,
    required this.onExercisesSelected,
  });

  final ScrollController? scrollController;
  final void Function(List<Exercise> selected) onExercisesSelected;

  @override
  ConsumerState<ExercisePickerSheet> createState() => _ExercisePickerSheetState();
}

class _ExercisePickerSheetState extends ConsumerState<ExercisePickerSheet> {
  String _searchQuery = '';
  MuscleGroup? _selectedMuscleFilter;
  final Set<Exercise> _selectedExercises = {};

  @override
  Widget build(BuildContext context) {
    final exercisesAsync = ref.watch(exerciseLibraryProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Exercises'),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: () {
              widget.onExercisesSelected(_selectedExercises.toList());
              Navigator.pop(context);
            },
            child: Text(
              'Add (${_selectedExercises.length})',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
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
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
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
          const Divider(height: 1),
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
                  return const Center(child: Text('No exercises found'));
                }

                return ListView.builder(
                  controller: widget.scrollController,
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final ex = filtered[index];
                    final isChecked = _selectedExercises.contains(ex);

                    return CheckboxListTile(
                      title: Text(ex.name),
                      subtitle: Text(
                        ex.primaryMuscle.name[0].toUpperCase() + ex.primaryMuscle.name.substring(1),
                        style: const TextStyle(color: AppColors.onSurfaceVariant),
                      ),
                      value: isChecked,
                      onChanged: (bool? checked) {
                        setState(() {
                          if (checked == true) {
                            _selectedExercises.add(ex);
                          } else {
                            _selectedExercises.remove(ex);
                          }
                        });
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
      ),
    );
  }
}
