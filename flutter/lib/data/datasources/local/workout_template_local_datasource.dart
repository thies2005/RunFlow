import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/domain/entities/workout_step.dart';

class WorkoutTemplateLocalDatasource {
  static const _key = 'workout_templates';

  Future<List<StructuredWorkout>> loadTemplates() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_key);
    if (jsonStr == null) return [];
    final list = jsonDecode(jsonStr) as List;
    return list.map((e) => _structuredWorkoutFromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> saveTemplates(List<StructuredWorkout> templates) async {
    final prefs = await SharedPreferences.getInstance();
    final list = templates.map((e) => _structuredWorkoutToJson(e)).toList();
    await prefs.setString(_key, jsonEncode(list));
  }

  Future<void> addTemplate(StructuredWorkout template) async {
    final templates = await loadTemplates();
    templates.add(template);
    await saveTemplates(templates);
  }

  Future<void> deleteTemplate(String id) async {
    final templates = await loadTemplates();
    templates.removeWhere((t) => t.id == id);
    await saveTemplates(templates);
  }

  Map<String, dynamic> _structuredWorkoutToJson(StructuredWorkout w) => {
        'id': w.id,
        'name': w.name,
        'steps': w.steps.map(_stepNodeToJson).toList(),
        'totalEstimatedDurationSeconds': w.totalEstimatedDurationSeconds,
        'totalEstimatedDistanceMeters': w.totalEstimatedDistanceMeters,
      };

  StructuredWorkout _structuredWorkoutFromJson(Map<String, dynamic> json) =>
      StructuredWorkout(
        id: json['id'] as String,
        name: json['name'] as String,
        steps:
            (json['steps'] as List).map((e) => _stepNodeFromJson(e as Map<String, dynamic>)).toList(),
        totalEstimatedDurationSeconds:
            json['totalEstimatedDurationSeconds'] as int?,
        totalEstimatedDistanceMeters:
            (json['totalEstimatedDistanceMeters'] as num?)?.toDouble(),
      );

  Map<String, dynamic> _stepNodeToJson(StepNode node) {
    if (node.isStep && node.workoutStep != null) {
      final s = node.workoutStep!;
      return {
        'type': 'step',
        'step': {
          'id': s.id,
          'stepType': s.type.name,
          'name': s.name,
          'durationType': s.durationType?.name,
          'durationSeconds': s.durationSeconds,
          'distanceMeters': s.distanceMeters,
          'paceTarget': s.paceTarget != null
              ? {
                  'minPace': s.paceTarget!.minPaceSecondsPerKm,
                  'maxPace': s.paceTarget!.maxPaceSecondsPerKm,
                }
              : null,
        },
      };
    }
    final g = node.group!;
    return {
      'type': 'group',
      'group': {
        'id': g.id,
        'name': g.name,
        'repeatCount': g.repeatCount,
        'children': g.children.map(_stepNodeToJson).toList(),
      },
    };
  }

  StepNode _stepNodeFromJson(Map<String, dynamic> json) {
    if (json['type'] == 'step') {
      final s = json['step'] as Map<String, dynamic>;
      return StepNode.step(WorkoutStep(
        id: s['id'] as String,
        type: StepType.values.firstWhere((e) => e.name == s['stepType'], orElse: () => StepType.interval),
        name: s['name'] as String,
        durationType: s['durationType'] != null
            ? StepDurationType.values
                .firstWhere((e) => e.name == s['durationType'], orElse: () => StepDurationType.time)
            : null,
        durationSeconds: s['durationSeconds'] as int?,
        distanceMeters: (s['distanceMeters'] as num?)?.toDouble(),
        paceTarget: s['paceTarget'] != null
            ? PaceTarget(
                minPaceSecondsPerKm:
                    (s['paceTarget']['minPace'] as num?)?.toDouble(),
                maxPaceSecondsPerKm:
                    (s['paceTarget']['maxPace'] as num?)?.toDouble(),
              )
            : null,
      ));
    }
    final g = json['group'] as Map<String, dynamic>;
    return StepNode.group(StepGroup(
      id: g['id'] as String,
      name: g['name'] as String?,
      repeatCount: g['repeatCount'] as int? ?? 1,
      children:
          (g['children'] as List).map((e) => _stepNodeFromJson(e as Map<String, dynamic>)).toList(),
    ));
  }
}
