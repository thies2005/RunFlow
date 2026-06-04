import 'package:flutter/foundation.dart';

enum MuscleGroup {
  chest,
  back,
  shoulders,
  biceps,
  triceps,
  forearms,
  quads,
  hamstrings,
  glutes,
  calves,
  core,
  fullBody,
  cardio,
  other
}

class Exercise {
  const Exercise({
    required this.id,
    required this.name,
    required this.primaryMuscle,
    this.secondaryMuscle,
    this.notes,
    required this.restSeconds,
    this.isBodyweight = false,
    this.isCustom = false,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: json['id'] as String,
      name: json['name'] as String,
      primaryMuscle: MuscleGroup.values.firstWhere(
        (e) => e.name == json['primaryMuscle'],
        orElse: () => MuscleGroup.other,
      ),
      secondaryMuscle: json['secondaryMuscle'] != null
          ? MuscleGroup.values.firstWhere(
              (e) => e.name == json['secondaryMuscle'],
              orElse: () => MuscleGroup.other,
            )
          : null,
      notes: json['notes'] as String?,
      restSeconds: json['restSeconds'] as int? ?? 90,
      isBodyweight: json['isBodyweight'] as bool? ?? false,
      isCustom: json['isCustom'] as bool? ?? false,
    );
  }

  final String id;
  final String name;
  final MuscleGroup primaryMuscle;
  final MuscleGroup? secondaryMuscle;
  final String? notes;
  final int restSeconds;
  final bool isBodyweight;
  final bool isCustom;

  Exercise copyWith({
    String? id,
    String? name,
    MuscleGroup? primaryMuscle,
    MuscleGroup? secondaryMuscle,
    String? notes,
    int? restSeconds,
    bool? isBodyweight,
    bool? isCustom,
  }) {
    return Exercise(
      id: id ?? this.id,
      name: name ?? this.name,
      primaryMuscle: primaryMuscle ?? this.primaryMuscle,
      secondaryMuscle: secondaryMuscle ?? this.secondaryMuscle,
      notes: notes ?? this.notes,
      restSeconds: restSeconds ?? this.restSeconds,
      isBodyweight: isBodyweight ?? this.isBodyweight,
      isCustom: isCustom ?? this.isCustom,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'primaryMuscle': primaryMuscle.name,
      if (secondaryMuscle != null) 'secondaryMuscle': secondaryMuscle!.name,
      if (notes != null) 'notes': notes,
      'restSeconds': restSeconds,
      'isBodyweight': isBodyweight,
      'isCustom': isCustom,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Exercise &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          primaryMuscle == other.primaryMuscle &&
          secondaryMuscle == other.secondaryMuscle &&
          notes == other.notes &&
          restSeconds == other.restSeconds &&
          isBodyweight == other.isBodyweight &&
          isCustom == other.isCustom;

  @override
  int get hashCode => Object.hash(
        id,
        name,
        primaryMuscle,
        secondaryMuscle,
        notes,
        restSeconds,
        isBodyweight,
        isCustom,
      );
}

class ExerciseSet {
  const ExerciseSet({
    required this.id,
    required this.setNumber,
    this.weight,
    this.reps,
    this.isWarmup = false,
    this.isDropSet = false,
    this.isCompleted = false,
    this.rpe,
    this.previousWeight,
    this.previousReps,
  });

  factory ExerciseSet.fromJson(Map<String, dynamic> json) {
    return ExerciseSet(
      id: json['id'] as String,
      setNumber: json['setNumber'] as int,
      weight: json['weight'] != null ? (json['weight'] as num).toDouble() : null,
      reps: json['reps'] as int?,
      isWarmup: json['isWarmup'] as bool? ?? false,
      isDropSet: json['isDropSet'] as bool? ?? false,
      isCompleted: json['isCompleted'] as bool? ?? false,
      rpe: json['rpe'] as int?,
      previousWeight: json['previousWeight'] != null ? (json['previousWeight'] as num).toDouble() : null,
      previousReps: json['previousReps'] as int?,
    );
  }

  final String id;
  final int setNumber;
  final double? weight;
  final int? reps;
  final bool isWarmup;
  final bool isDropSet;
  final bool isCompleted;
  final int? rpe;
  final double? previousWeight;
  final int? previousReps;

  ExerciseSet copyWith({
    String? id,
    int? setNumber,
    double? weight,
    int? reps,
    bool? isWarmup,
    bool? isDropSet,
    bool? isCompleted,
    int? rpe,
    double? previousWeight,
    int? previousReps,
  }) {
    return ExerciseSet(
      id: id ?? this.id,
      setNumber: setNumber ?? this.setNumber,
      weight: weight ?? this.weight,
      reps: reps ?? this.reps,
      isWarmup: isWarmup ?? this.isWarmup,
      isDropSet: isDropSet ?? this.isDropSet,
      isCompleted: isCompleted ?? this.isCompleted,
      rpe: rpe ?? this.rpe,
      previousWeight: previousWeight ?? this.previousWeight,
      previousReps: previousReps ?? this.previousReps,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'setNumber': setNumber,
      if (weight != null) 'weight': weight,
      if (reps != null) 'reps': reps,
      'isWarmup': isWarmup,
      'isDropSet': isDropSet,
      'isCompleted': isCompleted,
      if (rpe != null) 'rpe': rpe,
      if (previousWeight != null) 'previousWeight': previousWeight,
      if (previousReps != null) 'previousReps': previousReps,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExerciseSet &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          setNumber == other.setNumber &&
          weight == other.weight &&
          reps == other.reps &&
          isWarmup == other.isWarmup &&
          isDropSet == other.isDropSet &&
          isCompleted == other.isCompleted &&
          rpe == other.rpe &&
          previousWeight == other.previousWeight &&
          previousReps == other.previousReps;

  @override
  int get hashCode => Object.hash(
        id,
        setNumber,
        weight,
        reps,
        isWarmup,
        isDropSet,
        isCompleted,
        rpe,
        previousWeight,
        previousReps,
      );
}

class WorkoutExercise {
  const WorkoutExercise({
    required this.id,
    required this.exerciseId,
    required this.exerciseName,
    required this.primaryMuscle,
    required this.sets,
    this.notes,
    required this.restSeconds,
    this.supersetId,
  });

  factory WorkoutExercise.fromJson(Map<String, dynamic> json) {
    return WorkoutExercise(
      id: json['id'] as String,
      exerciseId: json['exerciseId'] as String,
      exerciseName: json['exerciseName'] as String,
      primaryMuscle: MuscleGroup.values.firstWhere(
        (e) => e.name == json['primaryMuscle'],
        orElse: () => MuscleGroup.other,
      ),
      sets: (json['sets'] as List<dynamic>)
          .map((s) => ExerciseSet.fromJson(s as Map<String, dynamic>))
          .toList(),
      notes: json['notes'] as String?,
      restSeconds: json['restSeconds'] as int? ?? 90,
      supersetId: json['supersetId'] as String?,
    );
  }

  final String id;
  final String exerciseId;
  final String exerciseName;
  final MuscleGroup primaryMuscle;
  final List<ExerciseSet> sets;
  final String? notes;
  final int restSeconds;
  final String? supersetId;

  WorkoutExercise copyWith({
    String? id,
    String? exerciseId,
    String? exerciseName,
    MuscleGroup? primaryMuscle,
    List<ExerciseSet>? sets,
    String? notes,
    int? restSeconds,
    String? supersetId,
  }) {
    return WorkoutExercise(
      id: id ?? this.id,
      exerciseId: exerciseId ?? this.exerciseId,
      exerciseName: exerciseName ?? this.exerciseName,
      primaryMuscle: primaryMuscle ?? this.primaryMuscle,
      sets: sets ?? this.sets,
      notes: notes ?? this.notes,
      restSeconds: restSeconds ?? this.restSeconds,
      supersetId: supersetId ?? this.supersetId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'exerciseId': exerciseId,
      'exerciseName': exerciseName,
      'primaryMuscle': primaryMuscle.name,
      'sets': sets.map((s) => s.toJson()).toList(),
      if (notes != null) 'notes': notes,
      'restSeconds': restSeconds,
      if (supersetId != null) 'supersetId': supersetId,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WorkoutExercise &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          exerciseId == other.exerciseId &&
          exerciseName == other.exerciseName &&
          primaryMuscle == other.primaryMuscle &&
          listEquals(sets, other.sets) &&
          notes == other.notes &&
          restSeconds == other.restSeconds &&
          supersetId == other.supersetId;

  @override
  int get hashCode => Object.hash(
        id,
        exerciseId,
        exerciseName,
        primaryMuscle,
        Object.hashAll(sets),
        notes,
        restSeconds,
        supersetId,
      );
}

class StrengthWorkoutTemplate {
  const StrengthWorkoutTemplate({
    required this.id,
    required this.name,
    required this.exercises,
    this.sortOrder = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory StrengthWorkoutTemplate.fromJson(Map<String, dynamic> json) {
    return StrengthWorkoutTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      exercises: (json['exercises'] as List<dynamic>)
          .map((e) => WorkoutExercise.fromJson(e as Map<String, dynamic>))
          .toList(),
      sortOrder: json['sortOrder'] as int? ?? 0,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(json['updatedAt'] as int),
    );
  }

  final String id;
  final String name;
  final List<WorkoutExercise> exercises;
  final int sortOrder;
  final DateTime createdAt;
  final DateTime updatedAt;

  StrengthWorkoutTemplate copyWith({
    String? id,
    String? name,
    List<WorkoutExercise>? exercises,
    int? sortOrder,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return StrengthWorkoutTemplate(
      id: id ?? this.id,
      name: name ?? this.name,
      exercises: exercises ?? this.exercises,
      sortOrder: sortOrder ?? this.sortOrder,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'exercises': exercises.map((e) => e.toJson()).toList(),
      'sortOrder': sortOrder,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'updatedAt': updatedAt.millisecondsSinceEpoch,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StrengthWorkoutTemplate &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          listEquals(exercises, other.exercises) &&
          sortOrder == other.sortOrder &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode => Object.hash(
        id,
        name,
        Object.hashAll(exercises),
        sortOrder,
        createdAt,
        updatedAt,
      );
}

class StrengthSession {
  const StrengthSession({
    required this.id,
    this.templateId,
    required this.workoutName,
    required this.startTime,
    required this.endTime,
    required this.durationSeconds,
    required this.exercises,
    required this.totalVolume,
    required this.totalSets,
    this.notes,
    this.averageHr,
    this.maxHr,
    this.calories,
    this.linkedActivityId,
  });

  factory StrengthSession.fromJson(Map<String, dynamic> json) {
    return StrengthSession(
      id: json['id'] as String,
      templateId: json['templateId'] as String?,
      workoutName: json['workoutName'] as String,
      startTime: DateTime.fromMillisecondsSinceEpoch(json['startTime'] as int),
      endTime: DateTime.fromMillisecondsSinceEpoch(json['endTime'] as int),
      durationSeconds: json['durationSeconds'] as int,
      exercises: (json['exercises'] as List<dynamic>)
          .map((e) => WorkoutExercise.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalVolume: (json['totalVolume'] as num).toDouble(),
      totalSets: json['totalSets'] as int,
      notes: json['notes'] as String?,
      averageHr: json['averageHr'] != null ? (json['averageHr'] as num).toDouble() : null,
      maxHr: json['maxHr'] as int?,
      calories: json['calories'] != null ? (json['calories'] as num).toDouble() : null,
      linkedActivityId: json['linkedActivityId'] as String?,
    );
  }

  final String id;
  final String? templateId;
  final String workoutName;
  final DateTime startTime;
  final DateTime endTime;
  final int durationSeconds;
  final List<WorkoutExercise> exercises;
  final double totalVolume;
  final int totalSets;
  final String? notes;
  final double? averageHr;
  final int? maxHr;
  final double? calories;
  final String? linkedActivityId;

  StrengthSession copyWith({
    String? id,
    String? templateId,
    String? workoutName,
    DateTime? startTime,
    DateTime? endTime,
    int? durationSeconds,
    List<WorkoutExercise>? exercises,
    double? totalVolume,
    int? totalSets,
    String? notes,
    double? averageHr,
    int? maxHr,
    double? calories,
    String? linkedActivityId,
  }) {
    return StrengthSession(
      id: id ?? this.id,
      templateId: templateId ?? this.templateId,
      workoutName: workoutName ?? this.workoutName,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      exercises: exercises ?? this.exercises,
      totalVolume: totalVolume ?? this.totalVolume,
      totalSets: totalSets ?? this.totalSets,
      notes: notes ?? this.notes,
      averageHr: averageHr ?? this.averageHr,
      maxHr: maxHr ?? this.maxHr,
      calories: calories ?? this.calories,
      linkedActivityId: linkedActivityId ?? this.linkedActivityId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (templateId != null) 'templateId': templateId,
      'workoutName': workoutName,
      'startTime': startTime.millisecondsSinceEpoch,
      'endTime': endTime.millisecondsSinceEpoch,
      'durationSeconds': durationSeconds,
      'exercises': exercises.map((e) => e.toJson()).toList(),
      'totalVolume': totalVolume,
      'totalSets': totalSets,
      if (notes != null) 'notes': notes,
      if (averageHr != null) 'averageHr': averageHr,
      if (maxHr != null) 'maxHr': maxHr,
      if (calories != null) 'calories': calories,
      if (linkedActivityId != null) 'linkedActivityId': linkedActivityId,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StrengthSession &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          templateId == other.templateId &&
          workoutName == other.workoutName &&
          startTime == other.startTime &&
          endTime == other.endTime &&
          durationSeconds == other.durationSeconds &&
          listEquals(exercises, other.exercises) &&
          totalVolume == other.totalVolume &&
          totalSets == other.totalSets &&
          notes == other.notes &&
          averageHr == other.averageHr &&
          maxHr == other.maxHr &&
          calories == other.calories &&
          linkedActivityId == other.linkedActivityId;

  @override
  int get hashCode => Object.hash(
        id,
        templateId,
        workoutName,
        startTime,
        endTime,
        durationSeconds,
        Object.hashAll(exercises),
        totalVolume,
        totalSets,
        notes,
        averageHr,
        maxHr,
        calories,
        linkedActivityId,
      );
}
