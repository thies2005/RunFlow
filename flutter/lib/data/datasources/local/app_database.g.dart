// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $NutritionLogsTable extends NutritionLogs
    with TableInfo<$NutritionLogsTable, DbNutritionLog> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $NutritionLogsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<int> date = GeneratedColumn<int>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _caloriesMeta = const VerificationMeta(
    'calories',
  );
  @override
  late final GeneratedColumn<double> calories = GeneratedColumn<double>(
    'calories',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _proteinMeta = const VerificationMeta(
    'protein',
  );
  @override
  late final GeneratedColumn<double> protein = GeneratedColumn<double>(
    'protein',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _carbsMeta = const VerificationMeta('carbs');
  @override
  late final GeneratedColumn<double> carbs = GeneratedColumn<double>(
    'carbs',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _fatMeta = const VerificationMeta('fat');
  @override
  late final GeneratedColumn<double> fat = GeneratedColumn<double>(
    'fat',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _waterMeta = const VerificationMeta('water');
  @override
  late final GeneratedColumn<double> water = GeneratedColumn<double>(
    'water',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
    'notes',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    date,
    calories,
    protein,
    carbs,
    fat,
    water,
    notes,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'nutrition_logs';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbNutritionLog> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('calories')) {
      context.handle(
        _caloriesMeta,
        calories.isAcceptableOrUnknown(data['calories']!, _caloriesMeta),
      );
    }
    if (data.containsKey('protein')) {
      context.handle(
        _proteinMeta,
        protein.isAcceptableOrUnknown(data['protein']!, _proteinMeta),
      );
    }
    if (data.containsKey('carbs')) {
      context.handle(
        _carbsMeta,
        carbs.isAcceptableOrUnknown(data['carbs']!, _carbsMeta),
      );
    }
    if (data.containsKey('fat')) {
      context.handle(
        _fatMeta,
        fat.isAcceptableOrUnknown(data['fat']!, _fatMeta),
      );
    }
    if (data.containsKey('water')) {
      context.handle(
        _waterMeta,
        water.isAcceptableOrUnknown(data['water']!, _waterMeta),
      );
    }
    if (data.containsKey('notes')) {
      context.handle(
        _notesMeta,
        notes.isAcceptableOrUnknown(data['notes']!, _notesMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbNutritionLog map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbNutritionLog(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}date'],
      )!,
      calories: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}calories'],
      )!,
      protein: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}protein'],
      )!,
      carbs: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}carbs'],
      )!,
      fat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}fat'],
      )!,
      water: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}water'],
      )!,
      notes: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}notes'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $NutritionLogsTable createAlias(String alias) {
    return $NutritionLogsTable(attachedDatabase, alias);
  }
}

class DbNutritionLog extends DataClass implements Insertable<DbNutritionLog> {
  final int id;
  final int date;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final double water;
  final String? notes;
  final DateTime createdAt;
  const DbNutritionLog({
    required this.id,
    required this.date,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.water,
    this.notes,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['date'] = Variable<int>(date);
    map['calories'] = Variable<double>(calories);
    map['protein'] = Variable<double>(protein);
    map['carbs'] = Variable<double>(carbs);
    map['fat'] = Variable<double>(fat);
    map['water'] = Variable<double>(water);
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  NutritionLogsCompanion toCompanion(bool nullToAbsent) {
    return NutritionLogsCompanion(
      id: Value(id),
      date: Value(date),
      calories: Value(calories),
      protein: Value(protein),
      carbs: Value(carbs),
      fat: Value(fat),
      water: Value(water),
      notes: notes == null && nullToAbsent
          ? const Value.absent()
          : Value(notes),
      createdAt: Value(createdAt),
    );
  }

  factory DbNutritionLog.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbNutritionLog(
      id: serializer.fromJson<int>(json['id']),
      date: serializer.fromJson<int>(json['date']),
      calories: serializer.fromJson<double>(json['calories']),
      protein: serializer.fromJson<double>(json['protein']),
      carbs: serializer.fromJson<double>(json['carbs']),
      fat: serializer.fromJson<double>(json['fat']),
      water: serializer.fromJson<double>(json['water']),
      notes: serializer.fromJson<String?>(json['notes']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'date': serializer.toJson<int>(date),
      'calories': serializer.toJson<double>(calories),
      'protein': serializer.toJson<double>(protein),
      'carbs': serializer.toJson<double>(carbs),
      'fat': serializer.toJson<double>(fat),
      'water': serializer.toJson<double>(water),
      'notes': serializer.toJson<String?>(notes),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  DbNutritionLog copyWith({
    int? id,
    int? date,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    double? water,
    Value<String?> notes = const Value.absent(),
    DateTime? createdAt,
  }) => DbNutritionLog(
    id: id ?? this.id,
    date: date ?? this.date,
    calories: calories ?? this.calories,
    protein: protein ?? this.protein,
    carbs: carbs ?? this.carbs,
    fat: fat ?? this.fat,
    water: water ?? this.water,
    notes: notes.present ? notes.value : this.notes,
    createdAt: createdAt ?? this.createdAt,
  );
  DbNutritionLog copyWithCompanion(NutritionLogsCompanion data) {
    return DbNutritionLog(
      id: data.id.present ? data.id.value : this.id,
      date: data.date.present ? data.date.value : this.date,
      calories: data.calories.present ? data.calories.value : this.calories,
      protein: data.protein.present ? data.protein.value : this.protein,
      carbs: data.carbs.present ? data.carbs.value : this.carbs,
      fat: data.fat.present ? data.fat.value : this.fat,
      water: data.water.present ? data.water.value : this.water,
      notes: data.notes.present ? data.notes.value : this.notes,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbNutritionLog(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('calories: $calories, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('water: $water, ')
          ..write('notes: $notes, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    date,
    calories,
    protein,
    carbs,
    fat,
    water,
    notes,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbNutritionLog &&
          other.id == this.id &&
          other.date == this.date &&
          other.calories == this.calories &&
          other.protein == this.protein &&
          other.carbs == this.carbs &&
          other.fat == this.fat &&
          other.water == this.water &&
          other.notes == this.notes &&
          other.createdAt == this.createdAt);
}

class NutritionLogsCompanion extends UpdateCompanion<DbNutritionLog> {
  final Value<int> id;
  final Value<int> date;
  final Value<double> calories;
  final Value<double> protein;
  final Value<double> carbs;
  final Value<double> fat;
  final Value<double> water;
  final Value<String?> notes;
  final Value<DateTime> createdAt;
  const NutritionLogsCompanion({
    this.id = const Value.absent(),
    this.date = const Value.absent(),
    this.calories = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.water = const Value.absent(),
    this.notes = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  NutritionLogsCompanion.insert({
    this.id = const Value.absent(),
    required int date,
    this.calories = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.water = const Value.absent(),
    this.notes = const Value.absent(),
    this.createdAt = const Value.absent(),
  }) : date = Value(date);
  static Insertable<DbNutritionLog> custom({
    Expression<int>? id,
    Expression<int>? date,
    Expression<double>? calories,
    Expression<double>? protein,
    Expression<double>? carbs,
    Expression<double>? fat,
    Expression<double>? water,
    Expression<String>? notes,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (date != null) 'date': date,
      if (calories != null) 'calories': calories,
      if (protein != null) 'protein': protein,
      if (carbs != null) 'carbs': carbs,
      if (fat != null) 'fat': fat,
      if (water != null) 'water': water,
      if (notes != null) 'notes': notes,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  NutritionLogsCompanion copyWith({
    Value<int>? id,
    Value<int>? date,
    Value<double>? calories,
    Value<double>? protein,
    Value<double>? carbs,
    Value<double>? fat,
    Value<double>? water,
    Value<String?>? notes,
    Value<DateTime>? createdAt,
  }) {
    return NutritionLogsCompanion(
      id: id ?? this.id,
      date: date ?? this.date,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      water: water ?? this.water,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (date.present) {
      map['date'] = Variable<int>(date.value);
    }
    if (calories.present) {
      map['calories'] = Variable<double>(calories.value);
    }
    if (protein.present) {
      map['protein'] = Variable<double>(protein.value);
    }
    if (carbs.present) {
      map['carbs'] = Variable<double>(carbs.value);
    }
    if (fat.present) {
      map['fat'] = Variable<double>(fat.value);
    }
    if (water.present) {
      map['water'] = Variable<double>(water.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('NutritionLogsCompanion(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('calories: $calories, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('water: $water, ')
          ..write('notes: $notes, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $FoodItemsTable extends FoodItems
    with TableInfo<$FoodItemsTable, DbFoodItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $FoodItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _caloriesMeta = const VerificationMeta(
    'calories',
  );
  @override
  late final GeneratedColumn<double> calories = GeneratedColumn<double>(
    'calories',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _proteinMeta = const VerificationMeta(
    'protein',
  );
  @override
  late final GeneratedColumn<double> protein = GeneratedColumn<double>(
    'protein',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _carbsMeta = const VerificationMeta('carbs');
  @override
  late final GeneratedColumn<double> carbs = GeneratedColumn<double>(
    'carbs',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _fatMeta = const VerificationMeta('fat');
  @override
  late final GeneratedColumn<double> fat = GeneratedColumn<double>(
    'fat',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _servingSizeMeta = const VerificationMeta(
    'servingSize',
  );
  @override
  late final GeneratedColumn<double> servingSize = GeneratedColumn<double>(
    'serving_size',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _barcodeMeta = const VerificationMeta(
    'barcode',
  );
  @override
  late final GeneratedColumn<String> barcode = GeneratedColumn<String>(
    'barcode',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    calories,
    protein,
    carbs,
    fat,
    servingSize,
    barcode,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'food_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbFoodItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('calories')) {
      context.handle(
        _caloriesMeta,
        calories.isAcceptableOrUnknown(data['calories']!, _caloriesMeta),
      );
    } else if (isInserting) {
      context.missing(_caloriesMeta);
    }
    if (data.containsKey('protein')) {
      context.handle(
        _proteinMeta,
        protein.isAcceptableOrUnknown(data['protein']!, _proteinMeta),
      );
    } else if (isInserting) {
      context.missing(_proteinMeta);
    }
    if (data.containsKey('carbs')) {
      context.handle(
        _carbsMeta,
        carbs.isAcceptableOrUnknown(data['carbs']!, _carbsMeta),
      );
    } else if (isInserting) {
      context.missing(_carbsMeta);
    }
    if (data.containsKey('fat')) {
      context.handle(
        _fatMeta,
        fat.isAcceptableOrUnknown(data['fat']!, _fatMeta),
      );
    } else if (isInserting) {
      context.missing(_fatMeta);
    }
    if (data.containsKey('serving_size')) {
      context.handle(
        _servingSizeMeta,
        servingSize.isAcceptableOrUnknown(
          data['serving_size']!,
          _servingSizeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_servingSizeMeta);
    }
    if (data.containsKey('barcode')) {
      context.handle(
        _barcodeMeta,
        barcode.isAcceptableOrUnknown(data['barcode']!, _barcodeMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbFoodItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbFoodItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      calories: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}calories'],
      )!,
      protein: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}protein'],
      )!,
      carbs: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}carbs'],
      )!,
      fat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}fat'],
      )!,
      servingSize: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}serving_size'],
      )!,
      barcode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}barcode'],
      ),
    );
  }

  @override
  $FoodItemsTable createAlias(String alias) {
    return $FoodItemsTable(attachedDatabase, alias);
  }
}

class DbFoodItem extends DataClass implements Insertable<DbFoodItem> {
  final int id;
  final String name;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final double servingSize;
  final String? barcode;
  const DbFoodItem({
    required this.id,
    required this.name,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.servingSize,
    this.barcode,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['calories'] = Variable<double>(calories);
    map['protein'] = Variable<double>(protein);
    map['carbs'] = Variable<double>(carbs);
    map['fat'] = Variable<double>(fat);
    map['serving_size'] = Variable<double>(servingSize);
    if (!nullToAbsent || barcode != null) {
      map['barcode'] = Variable<String>(barcode);
    }
    return map;
  }

  FoodItemsCompanion toCompanion(bool nullToAbsent) {
    return FoodItemsCompanion(
      id: Value(id),
      name: Value(name),
      calories: Value(calories),
      protein: Value(protein),
      carbs: Value(carbs),
      fat: Value(fat),
      servingSize: Value(servingSize),
      barcode: barcode == null && nullToAbsent
          ? const Value.absent()
          : Value(barcode),
    );
  }

  factory DbFoodItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbFoodItem(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      calories: serializer.fromJson<double>(json['calories']),
      protein: serializer.fromJson<double>(json['protein']),
      carbs: serializer.fromJson<double>(json['carbs']),
      fat: serializer.fromJson<double>(json['fat']),
      servingSize: serializer.fromJson<double>(json['servingSize']),
      barcode: serializer.fromJson<String?>(json['barcode']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'calories': serializer.toJson<double>(calories),
      'protein': serializer.toJson<double>(protein),
      'carbs': serializer.toJson<double>(carbs),
      'fat': serializer.toJson<double>(fat),
      'servingSize': serializer.toJson<double>(servingSize),
      'barcode': serializer.toJson<String?>(barcode),
    };
  }

  DbFoodItem copyWith({
    int? id,
    String? name,
    double? calories,
    double? protein,
    double? carbs,
    double? fat,
    double? servingSize,
    Value<String?> barcode = const Value.absent(),
  }) => DbFoodItem(
    id: id ?? this.id,
    name: name ?? this.name,
    calories: calories ?? this.calories,
    protein: protein ?? this.protein,
    carbs: carbs ?? this.carbs,
    fat: fat ?? this.fat,
    servingSize: servingSize ?? this.servingSize,
    barcode: barcode.present ? barcode.value : this.barcode,
  );
  DbFoodItem copyWithCompanion(FoodItemsCompanion data) {
    return DbFoodItem(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      calories: data.calories.present ? data.calories.value : this.calories,
      protein: data.protein.present ? data.protein.value : this.protein,
      carbs: data.carbs.present ? data.carbs.value : this.carbs,
      fat: data.fat.present ? data.fat.value : this.fat,
      servingSize: data.servingSize.present
          ? data.servingSize.value
          : this.servingSize,
      barcode: data.barcode.present ? data.barcode.value : this.barcode,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbFoodItem(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('calories: $calories, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('servingSize: $servingSize, ')
          ..write('barcode: $barcode')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    calories,
    protein,
    carbs,
    fat,
    servingSize,
    barcode,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbFoodItem &&
          other.id == this.id &&
          other.name == this.name &&
          other.calories == this.calories &&
          other.protein == this.protein &&
          other.carbs == this.carbs &&
          other.fat == this.fat &&
          other.servingSize == this.servingSize &&
          other.barcode == this.barcode);
}

class FoodItemsCompanion extends UpdateCompanion<DbFoodItem> {
  final Value<int> id;
  final Value<String> name;
  final Value<double> calories;
  final Value<double> protein;
  final Value<double> carbs;
  final Value<double> fat;
  final Value<double> servingSize;
  final Value<String?> barcode;
  const FoodItemsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.calories = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.servingSize = const Value.absent(),
    this.barcode = const Value.absent(),
  });
  FoodItemsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required double calories,
    required double protein,
    required double carbs,
    required double fat,
    required double servingSize,
    this.barcode = const Value.absent(),
  }) : name = Value(name),
       calories = Value(calories),
       protein = Value(protein),
       carbs = Value(carbs),
       fat = Value(fat),
       servingSize = Value(servingSize);
  static Insertable<DbFoodItem> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<double>? calories,
    Expression<double>? protein,
    Expression<double>? carbs,
    Expression<double>? fat,
    Expression<double>? servingSize,
    Expression<String>? barcode,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (calories != null) 'calories': calories,
      if (protein != null) 'protein': protein,
      if (carbs != null) 'carbs': carbs,
      if (fat != null) 'fat': fat,
      if (servingSize != null) 'serving_size': servingSize,
      if (barcode != null) 'barcode': barcode,
    });
  }

  FoodItemsCompanion copyWith({
    Value<int>? id,
    Value<String>? name,
    Value<double>? calories,
    Value<double>? protein,
    Value<double>? carbs,
    Value<double>? fat,
    Value<double>? servingSize,
    Value<String?>? barcode,
  }) {
    return FoodItemsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      servingSize: servingSize ?? this.servingSize,
      barcode: barcode ?? this.barcode,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (calories.present) {
      map['calories'] = Variable<double>(calories.value);
    }
    if (protein.present) {
      map['protein'] = Variable<double>(protein.value);
    }
    if (carbs.present) {
      map['carbs'] = Variable<double>(carbs.value);
    }
    if (fat.present) {
      map['fat'] = Variable<double>(fat.value);
    }
    if (servingSize.present) {
      map['serving_size'] = Variable<double>(servingSize.value);
    }
    if (barcode.present) {
      map['barcode'] = Variable<String>(barcode.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('FoodItemsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('calories: $calories, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('servingSize: $servingSize, ')
          ..write('barcode: $barcode')
          ..write(')'))
        .toString();
  }
}

class $SupplementsTable extends Supplements
    with TableInfo<$SupplementsTable, DbSupplement> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SupplementsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dosageMeta = const VerificationMeta('dosage');
  @override
  late final GeneratedColumn<String> dosage = GeneratedColumn<String>(
    'dosage',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _frequencyMeta = const VerificationMeta(
    'frequency',
  );
  @override
  late final GeneratedColumn<String> frequency = GeneratedColumn<String>(
    'frequency',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _isActiveMeta = const VerificationMeta(
    'isActive',
  );
  @override
  late final GeneratedColumn<int> isActive = GeneratedColumn<int>(
    'is_active',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, dosage, frequency, isActive];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'supplements';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbSupplement> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('dosage')) {
      context.handle(
        _dosageMeta,
        dosage.isAcceptableOrUnknown(data['dosage']!, _dosageMeta),
      );
    } else if (isInserting) {
      context.missing(_dosageMeta);
    }
    if (data.containsKey('frequency')) {
      context.handle(
        _frequencyMeta,
        frequency.isAcceptableOrUnknown(data['frequency']!, _frequencyMeta),
      );
    } else if (isInserting) {
      context.missing(_frequencyMeta);
    }
    if (data.containsKey('is_active')) {
      context.handle(
        _isActiveMeta,
        isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbSupplement map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbSupplement(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      dosage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}dosage'],
      )!,
      frequency: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}frequency'],
      )!,
      isActive: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}is_active'],
      )!,
    );
  }

  @override
  $SupplementsTable createAlias(String alias) {
    return $SupplementsTable(attachedDatabase, alias);
  }
}

class DbSupplement extends DataClass implements Insertable<DbSupplement> {
  final int id;
  final String name;
  final String dosage;
  final String frequency;
  final int isActive;
  const DbSupplement({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.isActive,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['dosage'] = Variable<String>(dosage);
    map['frequency'] = Variable<String>(frequency);
    map['is_active'] = Variable<int>(isActive);
    return map;
  }

  SupplementsCompanion toCompanion(bool nullToAbsent) {
    return SupplementsCompanion(
      id: Value(id),
      name: Value(name),
      dosage: Value(dosage),
      frequency: Value(frequency),
      isActive: Value(isActive),
    );
  }

  factory DbSupplement.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbSupplement(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      dosage: serializer.fromJson<String>(json['dosage']),
      frequency: serializer.fromJson<String>(json['frequency']),
      isActive: serializer.fromJson<int>(json['isActive']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'dosage': serializer.toJson<String>(dosage),
      'frequency': serializer.toJson<String>(frequency),
      'isActive': serializer.toJson<int>(isActive),
    };
  }

  DbSupplement copyWith({
    int? id,
    String? name,
    String? dosage,
    String? frequency,
    int? isActive,
  }) => DbSupplement(
    id: id ?? this.id,
    name: name ?? this.name,
    dosage: dosage ?? this.dosage,
    frequency: frequency ?? this.frequency,
    isActive: isActive ?? this.isActive,
  );
  DbSupplement copyWithCompanion(SupplementsCompanion data) {
    return DbSupplement(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      dosage: data.dosage.present ? data.dosage.value : this.dosage,
      frequency: data.frequency.present ? data.frequency.value : this.frequency,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbSupplement(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('dosage: $dosage, ')
          ..write('frequency: $frequency, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, dosage, frequency, isActive);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbSupplement &&
          other.id == this.id &&
          other.name == this.name &&
          other.dosage == this.dosage &&
          other.frequency == this.frequency &&
          other.isActive == this.isActive);
}

class SupplementsCompanion extends UpdateCompanion<DbSupplement> {
  final Value<int> id;
  final Value<String> name;
  final Value<String> dosage;
  final Value<String> frequency;
  final Value<int> isActive;
  const SupplementsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.dosage = const Value.absent(),
    this.frequency = const Value.absent(),
    this.isActive = const Value.absent(),
  });
  SupplementsCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    required String dosage,
    required String frequency,
    this.isActive = const Value.absent(),
  }) : name = Value(name),
       dosage = Value(dosage),
       frequency = Value(frequency);
  static Insertable<DbSupplement> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<String>? dosage,
    Expression<String>? frequency,
    Expression<int>? isActive,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (dosage != null) 'dosage': dosage,
      if (frequency != null) 'frequency': frequency,
      if (isActive != null) 'is_active': isActive,
    });
  }

  SupplementsCompanion copyWith({
    Value<int>? id,
    Value<String>? name,
    Value<String>? dosage,
    Value<String>? frequency,
    Value<int>? isActive,
  }) {
    return SupplementsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      dosage: dosage ?? this.dosage,
      frequency: frequency ?? this.frequency,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (dosage.present) {
      map['dosage'] = Variable<String>(dosage.value);
    }
    if (frequency.present) {
      map['frequency'] = Variable<String>(frequency.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<int>(isActive.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SupplementsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('dosage: $dosage, ')
          ..write('frequency: $frequency, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }
}

class $SupplementStacksTable extends SupplementStacks
    with TableInfo<$SupplementStacksTable, DbSupplementStack> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SupplementStacksTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _isActiveMeta = const VerificationMeta(
    'isActive',
  );
  @override
  late final GeneratedColumn<int> isActive = GeneratedColumn<int>(
    'is_active',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, isActive];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'supplement_stacks';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbSupplementStack> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('is_active')) {
      context.handle(
        _isActiveMeta,
        isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbSupplementStack map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbSupplementStack(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      isActive: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}is_active'],
      )!,
    );
  }

  @override
  $SupplementStacksTable createAlias(String alias) {
    return $SupplementStacksTable(attachedDatabase, alias);
  }
}

class DbSupplementStack extends DataClass
    implements Insertable<DbSupplementStack> {
  final int id;
  final String name;
  final int isActive;
  const DbSupplementStack({
    required this.id,
    required this.name,
    required this.isActive,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['name'] = Variable<String>(name);
    map['is_active'] = Variable<int>(isActive);
    return map;
  }

  SupplementStacksCompanion toCompanion(bool nullToAbsent) {
    return SupplementStacksCompanion(
      id: Value(id),
      name: Value(name),
      isActive: Value(isActive),
    );
  }

  factory DbSupplementStack.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbSupplementStack(
      id: serializer.fromJson<int>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      isActive: serializer.fromJson<int>(json['isActive']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'name': serializer.toJson<String>(name),
      'isActive': serializer.toJson<int>(isActive),
    };
  }

  DbSupplementStack copyWith({int? id, String? name, int? isActive}) =>
      DbSupplementStack(
        id: id ?? this.id,
        name: name ?? this.name,
        isActive: isActive ?? this.isActive,
      );
  DbSupplementStack copyWithCompanion(SupplementStacksCompanion data) {
    return DbSupplementStack(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbSupplementStack(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, isActive);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbSupplementStack &&
          other.id == this.id &&
          other.name == this.name &&
          other.isActive == this.isActive);
}

class SupplementStacksCompanion extends UpdateCompanion<DbSupplementStack> {
  final Value<int> id;
  final Value<String> name;
  final Value<int> isActive;
  const SupplementStacksCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.isActive = const Value.absent(),
  });
  SupplementStacksCompanion.insert({
    this.id = const Value.absent(),
    required String name,
    this.isActive = const Value.absent(),
  }) : name = Value(name);
  static Insertable<DbSupplementStack> custom({
    Expression<int>? id,
    Expression<String>? name,
    Expression<int>? isActive,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (isActive != null) 'is_active': isActive,
    });
  }

  SupplementStacksCompanion copyWith({
    Value<int>? id,
    Value<String>? name,
    Value<int>? isActive,
  }) {
    return SupplementStacksCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<int>(isActive.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SupplementStacksCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }
}

class $SupplementStackItemsTable extends SupplementStackItems
    with TableInfo<$SupplementStackItemsTable, DbSupplementStackItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SupplementStackItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _stackIdMeta = const VerificationMeta(
    'stackId',
  );
  @override
  late final GeneratedColumn<int> stackId = GeneratedColumn<int>(
    'stack_id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES supplement_stacks (id)',
    ),
  );
  static const VerificationMeta _supplementIdMeta = const VerificationMeta(
    'supplementId',
  );
  @override
  late final GeneratedColumn<int> supplementId = GeneratedColumn<int>(
    'supplement_id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES supplements (id)',
    ),
  );
  @override
  List<GeneratedColumn> get $columns => [id, stackId, supplementId];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'supplement_stack_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbSupplementStackItem> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('stack_id')) {
      context.handle(
        _stackIdMeta,
        stackId.isAcceptableOrUnknown(data['stack_id']!, _stackIdMeta),
      );
    } else if (isInserting) {
      context.missing(_stackIdMeta);
    }
    if (data.containsKey('supplement_id')) {
      context.handle(
        _supplementIdMeta,
        supplementId.isAcceptableOrUnknown(
          data['supplement_id']!,
          _supplementIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_supplementIdMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbSupplementStackItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbSupplementStackItem(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      stackId: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}stack_id'],
      )!,
      supplementId: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}supplement_id'],
      )!,
    );
  }

  @override
  $SupplementStackItemsTable createAlias(String alias) {
    return $SupplementStackItemsTable(attachedDatabase, alias);
  }
}

class DbSupplementStackItem extends DataClass
    implements Insertable<DbSupplementStackItem> {
  final int id;
  final int stackId;
  final int supplementId;
  const DbSupplementStackItem({
    required this.id,
    required this.stackId,
    required this.supplementId,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['stack_id'] = Variable<int>(stackId);
    map['supplement_id'] = Variable<int>(supplementId);
    return map;
  }

  SupplementStackItemsCompanion toCompanion(bool nullToAbsent) {
    return SupplementStackItemsCompanion(
      id: Value(id),
      stackId: Value(stackId),
      supplementId: Value(supplementId),
    );
  }

  factory DbSupplementStackItem.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbSupplementStackItem(
      id: serializer.fromJson<int>(json['id']),
      stackId: serializer.fromJson<int>(json['stackId']),
      supplementId: serializer.fromJson<int>(json['supplementId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'stackId': serializer.toJson<int>(stackId),
      'supplementId': serializer.toJson<int>(supplementId),
    };
  }

  DbSupplementStackItem copyWith({int? id, int? stackId, int? supplementId}) =>
      DbSupplementStackItem(
        id: id ?? this.id,
        stackId: stackId ?? this.stackId,
        supplementId: supplementId ?? this.supplementId,
      );
  DbSupplementStackItem copyWithCompanion(SupplementStackItemsCompanion data) {
    return DbSupplementStackItem(
      id: data.id.present ? data.id.value : this.id,
      stackId: data.stackId.present ? data.stackId.value : this.stackId,
      supplementId: data.supplementId.present
          ? data.supplementId.value
          : this.supplementId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbSupplementStackItem(')
          ..write('id: $id, ')
          ..write('stackId: $stackId, ')
          ..write('supplementId: $supplementId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, stackId, supplementId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbSupplementStackItem &&
          other.id == this.id &&
          other.stackId == this.stackId &&
          other.supplementId == this.supplementId);
}

class SupplementStackItemsCompanion
    extends UpdateCompanion<DbSupplementStackItem> {
  final Value<int> id;
  final Value<int> stackId;
  final Value<int> supplementId;
  const SupplementStackItemsCompanion({
    this.id = const Value.absent(),
    this.stackId = const Value.absent(),
    this.supplementId = const Value.absent(),
  });
  SupplementStackItemsCompanion.insert({
    this.id = const Value.absent(),
    required int stackId,
    required int supplementId,
  }) : stackId = Value(stackId),
       supplementId = Value(supplementId);
  static Insertable<DbSupplementStackItem> custom({
    Expression<int>? id,
    Expression<int>? stackId,
    Expression<int>? supplementId,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (stackId != null) 'stack_id': stackId,
      if (supplementId != null) 'supplement_id': supplementId,
    });
  }

  SupplementStackItemsCompanion copyWith({
    Value<int>? id,
    Value<int>? stackId,
    Value<int>? supplementId,
  }) {
    return SupplementStackItemsCompanion(
      id: id ?? this.id,
      stackId: stackId ?? this.stackId,
      supplementId: supplementId ?? this.supplementId,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (stackId.present) {
      map['stack_id'] = Variable<int>(stackId.value);
    }
    if (supplementId.present) {
      map['supplement_id'] = Variable<int>(supplementId.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SupplementStackItemsCompanion(')
          ..write('id: $id, ')
          ..write('stackId: $stackId, ')
          ..write('supplementId: $supplementId')
          ..write(')'))
        .toString();
  }
}

class $DailyHealthLogsTable extends DailyHealthLogs
    with TableInfo<$DailyHealthLogsTable, DbDailyHealthLog> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DailyHealthLogsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<int> date = GeneratedColumn<int>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nutritionLogIdMeta = const VerificationMeta(
    'nutritionLogId',
  );
  @override
  late final GeneratedColumn<int> nutritionLogId = GeneratedColumn<int>(
    'nutrition_log_id',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES nutrition_logs (id)',
    ),
  );
  static const VerificationMeta _weightMeta = const VerificationMeta('weight');
  @override
  late final GeneratedColumn<double> weight = GeneratedColumn<double>(
    'weight',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _bodyFatMeta = const VerificationMeta(
    'bodyFat',
  );
  @override
  late final GeneratedColumn<double> bodyFat = GeneratedColumn<double>(
    'body_fat',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0.0),
  );
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
    'notes',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    date,
    nutritionLogId,
    weight,
    bodyFat,
    notes,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'daily_health_logs';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbDailyHealthLog> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('nutrition_log_id')) {
      context.handle(
        _nutritionLogIdMeta,
        nutritionLogId.isAcceptableOrUnknown(
          data['nutrition_log_id']!,
          _nutritionLogIdMeta,
        ),
      );
    }
    if (data.containsKey('weight')) {
      context.handle(
        _weightMeta,
        weight.isAcceptableOrUnknown(data['weight']!, _weightMeta),
      );
    }
    if (data.containsKey('body_fat')) {
      context.handle(
        _bodyFatMeta,
        bodyFat.isAcceptableOrUnknown(data['body_fat']!, _bodyFatMeta),
      );
    }
    if (data.containsKey('notes')) {
      context.handle(
        _notesMeta,
        notes.isAcceptableOrUnknown(data['notes']!, _notesMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbDailyHealthLog map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbDailyHealthLog(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}date'],
      )!,
      nutritionLogId: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}nutrition_log_id'],
      ),
      weight: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}weight'],
      )!,
      bodyFat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}body_fat'],
      )!,
      notes: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}notes'],
      ),
    );
  }

  @override
  $DailyHealthLogsTable createAlias(String alias) {
    return $DailyHealthLogsTable(attachedDatabase, alias);
  }
}

class DbDailyHealthLog extends DataClass
    implements Insertable<DbDailyHealthLog> {
  final int id;
  final int date;
  final int? nutritionLogId;
  final double weight;
  final double bodyFat;
  final String? notes;
  const DbDailyHealthLog({
    required this.id,
    required this.date,
    this.nutritionLogId,
    required this.weight,
    required this.bodyFat,
    this.notes,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['date'] = Variable<int>(date);
    if (!nullToAbsent || nutritionLogId != null) {
      map['nutrition_log_id'] = Variable<int>(nutritionLogId);
    }
    map['weight'] = Variable<double>(weight);
    map['body_fat'] = Variable<double>(bodyFat);
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    return map;
  }

  DailyHealthLogsCompanion toCompanion(bool nullToAbsent) {
    return DailyHealthLogsCompanion(
      id: Value(id),
      date: Value(date),
      nutritionLogId: nutritionLogId == null && nullToAbsent
          ? const Value.absent()
          : Value(nutritionLogId),
      weight: Value(weight),
      bodyFat: Value(bodyFat),
      notes: notes == null && nullToAbsent
          ? const Value.absent()
          : Value(notes),
    );
  }

  factory DbDailyHealthLog.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbDailyHealthLog(
      id: serializer.fromJson<int>(json['id']),
      date: serializer.fromJson<int>(json['date']),
      nutritionLogId: serializer.fromJson<int?>(json['nutritionLogId']),
      weight: serializer.fromJson<double>(json['weight']),
      bodyFat: serializer.fromJson<double>(json['bodyFat']),
      notes: serializer.fromJson<String?>(json['notes']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'date': serializer.toJson<int>(date),
      'nutritionLogId': serializer.toJson<int?>(nutritionLogId),
      'weight': serializer.toJson<double>(weight),
      'bodyFat': serializer.toJson<double>(bodyFat),
      'notes': serializer.toJson<String?>(notes),
    };
  }

  DbDailyHealthLog copyWith({
    int? id,
    int? date,
    Value<int?> nutritionLogId = const Value.absent(),
    double? weight,
    double? bodyFat,
    Value<String?> notes = const Value.absent(),
  }) => DbDailyHealthLog(
    id: id ?? this.id,
    date: date ?? this.date,
    nutritionLogId: nutritionLogId.present
        ? nutritionLogId.value
        : this.nutritionLogId,
    weight: weight ?? this.weight,
    bodyFat: bodyFat ?? this.bodyFat,
    notes: notes.present ? notes.value : this.notes,
  );
  DbDailyHealthLog copyWithCompanion(DailyHealthLogsCompanion data) {
    return DbDailyHealthLog(
      id: data.id.present ? data.id.value : this.id,
      date: data.date.present ? data.date.value : this.date,
      nutritionLogId: data.nutritionLogId.present
          ? data.nutritionLogId.value
          : this.nutritionLogId,
      weight: data.weight.present ? data.weight.value : this.weight,
      bodyFat: data.bodyFat.present ? data.bodyFat.value : this.bodyFat,
      notes: data.notes.present ? data.notes.value : this.notes,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbDailyHealthLog(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('nutritionLogId: $nutritionLogId, ')
          ..write('weight: $weight, ')
          ..write('bodyFat: $bodyFat, ')
          ..write('notes: $notes')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, date, nutritionLogId, weight, bodyFat, notes);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbDailyHealthLog &&
          other.id == this.id &&
          other.date == this.date &&
          other.nutritionLogId == this.nutritionLogId &&
          other.weight == this.weight &&
          other.bodyFat == this.bodyFat &&
          other.notes == this.notes);
}

class DailyHealthLogsCompanion extends UpdateCompanion<DbDailyHealthLog> {
  final Value<int> id;
  final Value<int> date;
  final Value<int?> nutritionLogId;
  final Value<double> weight;
  final Value<double> bodyFat;
  final Value<String?> notes;
  const DailyHealthLogsCompanion({
    this.id = const Value.absent(),
    this.date = const Value.absent(),
    this.nutritionLogId = const Value.absent(),
    this.weight = const Value.absent(),
    this.bodyFat = const Value.absent(),
    this.notes = const Value.absent(),
  });
  DailyHealthLogsCompanion.insert({
    this.id = const Value.absent(),
    required int date,
    this.nutritionLogId = const Value.absent(),
    this.weight = const Value.absent(),
    this.bodyFat = const Value.absent(),
    this.notes = const Value.absent(),
  }) : date = Value(date);
  static Insertable<DbDailyHealthLog> custom({
    Expression<int>? id,
    Expression<int>? date,
    Expression<int>? nutritionLogId,
    Expression<double>? weight,
    Expression<double>? bodyFat,
    Expression<String>? notes,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (date != null) 'date': date,
      if (nutritionLogId != null) 'nutrition_log_id': nutritionLogId,
      if (weight != null) 'weight': weight,
      if (bodyFat != null) 'body_fat': bodyFat,
      if (notes != null) 'notes': notes,
    });
  }

  DailyHealthLogsCompanion copyWith({
    Value<int>? id,
    Value<int>? date,
    Value<int?>? nutritionLogId,
    Value<double>? weight,
    Value<double>? bodyFat,
    Value<String?>? notes,
  }) {
    return DailyHealthLogsCompanion(
      id: id ?? this.id,
      date: date ?? this.date,
      nutritionLogId: nutritionLogId ?? this.nutritionLogId,
      weight: weight ?? this.weight,
      bodyFat: bodyFat ?? this.bodyFat,
      notes: notes ?? this.notes,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (date.present) {
      map['date'] = Variable<int>(date.value);
    }
    if (nutritionLogId.present) {
      map['nutrition_log_id'] = Variable<int>(nutritionLogId.value);
    }
    if (weight.present) {
      map['weight'] = Variable<double>(weight.value);
    }
    if (bodyFat.present) {
      map['body_fat'] = Variable<double>(bodyFat.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DailyHealthLogsCompanion(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('nutritionLogId: $nutritionLogId, ')
          ..write('weight: $weight, ')
          ..write('bodyFat: $bodyFat, ')
          ..write('notes: $notes')
          ..write(')'))
        .toString();
  }
}

class $FastingSessionsTable extends FastingSessions
    with TableInfo<$FastingSessionsTable, DbFastingSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $FastingSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _startTimeMeta = const VerificationMeta(
    'startTime',
  );
  @override
  late final GeneratedColumn<int> startTime = GeneratedColumn<int>(
    'start_time',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _endTimeMeta = const VerificationMeta(
    'endTime',
  );
  @override
  late final GeneratedColumn<int> endTime = GeneratedColumn<int>(
    'end_time',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _durationMeta = const VerificationMeta(
    'duration',
  );
  @override
  late final GeneratedColumn<int> duration = GeneratedColumn<int>(
    'duration',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _isActiveMeta = const VerificationMeta(
    'isActive',
  );
  @override
  late final GeneratedColumn<int> isActive = GeneratedColumn<int>(
    'is_active',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    startTime,
    endTime,
    duration,
    isActive,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'fasting_sessions';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbFastingSession> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('start_time')) {
      context.handle(
        _startTimeMeta,
        startTime.isAcceptableOrUnknown(data['start_time']!, _startTimeMeta),
      );
    } else if (isInserting) {
      context.missing(_startTimeMeta);
    }
    if (data.containsKey('end_time')) {
      context.handle(
        _endTimeMeta,
        endTime.isAcceptableOrUnknown(data['end_time']!, _endTimeMeta),
      );
    }
    if (data.containsKey('duration')) {
      context.handle(
        _durationMeta,
        duration.isAcceptableOrUnknown(data['duration']!, _durationMeta),
      );
    }
    if (data.containsKey('is_active')) {
      context.handle(
        _isActiveMeta,
        isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbFastingSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbFastingSession(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      startTime: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}start_time'],
      )!,
      endTime: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}end_time'],
      ),
      duration: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}duration'],
      )!,
      isActive: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}is_active'],
      )!,
    );
  }

  @override
  $FastingSessionsTable createAlias(String alias) {
    return $FastingSessionsTable(attachedDatabase, alias);
  }
}

class DbFastingSession extends DataClass
    implements Insertable<DbFastingSession> {
  final int id;
  final int startTime;
  final int? endTime;
  final int duration;
  final int isActive;
  const DbFastingSession({
    required this.id,
    required this.startTime,
    this.endTime,
    required this.duration,
    required this.isActive,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['start_time'] = Variable<int>(startTime);
    if (!nullToAbsent || endTime != null) {
      map['end_time'] = Variable<int>(endTime);
    }
    map['duration'] = Variable<int>(duration);
    map['is_active'] = Variable<int>(isActive);
    return map;
  }

  FastingSessionsCompanion toCompanion(bool nullToAbsent) {
    return FastingSessionsCompanion(
      id: Value(id),
      startTime: Value(startTime),
      endTime: endTime == null && nullToAbsent
          ? const Value.absent()
          : Value(endTime),
      duration: Value(duration),
      isActive: Value(isActive),
    );
  }

  factory DbFastingSession.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbFastingSession(
      id: serializer.fromJson<int>(json['id']),
      startTime: serializer.fromJson<int>(json['startTime']),
      endTime: serializer.fromJson<int?>(json['endTime']),
      duration: serializer.fromJson<int>(json['duration']),
      isActive: serializer.fromJson<int>(json['isActive']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'startTime': serializer.toJson<int>(startTime),
      'endTime': serializer.toJson<int?>(endTime),
      'duration': serializer.toJson<int>(duration),
      'isActive': serializer.toJson<int>(isActive),
    };
  }

  DbFastingSession copyWith({
    int? id,
    int? startTime,
    Value<int?> endTime = const Value.absent(),
    int? duration,
    int? isActive,
  }) => DbFastingSession(
    id: id ?? this.id,
    startTime: startTime ?? this.startTime,
    endTime: endTime.present ? endTime.value : this.endTime,
    duration: duration ?? this.duration,
    isActive: isActive ?? this.isActive,
  );
  DbFastingSession copyWithCompanion(FastingSessionsCompanion data) {
    return DbFastingSession(
      id: data.id.present ? data.id.value : this.id,
      startTime: data.startTime.present ? data.startTime.value : this.startTime,
      endTime: data.endTime.present ? data.endTime.value : this.endTime,
      duration: data.duration.present ? data.duration.value : this.duration,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbFastingSession(')
          ..write('id: $id, ')
          ..write('startTime: $startTime, ')
          ..write('endTime: $endTime, ')
          ..write('duration: $duration, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, startTime, endTime, duration, isActive);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbFastingSession &&
          other.id == this.id &&
          other.startTime == this.startTime &&
          other.endTime == this.endTime &&
          other.duration == this.duration &&
          other.isActive == this.isActive);
}

class FastingSessionsCompanion extends UpdateCompanion<DbFastingSession> {
  final Value<int> id;
  final Value<int> startTime;
  final Value<int?> endTime;
  final Value<int> duration;
  final Value<int> isActive;
  const FastingSessionsCompanion({
    this.id = const Value.absent(),
    this.startTime = const Value.absent(),
    this.endTime = const Value.absent(),
    this.duration = const Value.absent(),
    this.isActive = const Value.absent(),
  });
  FastingSessionsCompanion.insert({
    this.id = const Value.absent(),
    required int startTime,
    this.endTime = const Value.absent(),
    this.duration = const Value.absent(),
    this.isActive = const Value.absent(),
  }) : startTime = Value(startTime);
  static Insertable<DbFastingSession> custom({
    Expression<int>? id,
    Expression<int>? startTime,
    Expression<int>? endTime,
    Expression<int>? duration,
    Expression<int>? isActive,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (startTime != null) 'start_time': startTime,
      if (endTime != null) 'end_time': endTime,
      if (duration != null) 'duration': duration,
      if (isActive != null) 'is_active': isActive,
    });
  }

  FastingSessionsCompanion copyWith({
    Value<int>? id,
    Value<int>? startTime,
    Value<int?>? endTime,
    Value<int>? duration,
    Value<int>? isActive,
  }) {
    return FastingSessionsCompanion(
      id: id ?? this.id,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      duration: duration ?? this.duration,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (startTime.present) {
      map['start_time'] = Variable<int>(startTime.value);
    }
    if (endTime.present) {
      map['end_time'] = Variable<int>(endTime.value);
    }
    if (duration.present) {
      map['duration'] = Variable<int>(duration.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<int>(isActive.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('FastingSessionsCompanion(')
          ..write('id: $id, ')
          ..write('startTime: $startTime, ')
          ..write('endTime: $endTime, ')
          ..write('duration: $duration, ')
          ..write('isActive: $isActive')
          ..write(')'))
        .toString();
  }
}

class $BodyMeasurementsTable extends BodyMeasurements
    with TableInfo<$BodyMeasurementsTable, DbBodyMeasurement> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BodyMeasurementsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<int> date = GeneratedColumn<int>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _weightMeta = const VerificationMeta('weight');
  @override
  late final GeneratedColumn<double> weight = GeneratedColumn<double>(
    'weight',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _bodyFatMeta = const VerificationMeta(
    'bodyFat',
  );
  @override
  late final GeneratedColumn<double> bodyFat = GeneratedColumn<double>(
    'body_fat',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _chestMeta = const VerificationMeta('chest');
  @override
  late final GeneratedColumn<double> chest = GeneratedColumn<double>(
    'chest',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _waistMeta = const VerificationMeta('waist');
  @override
  late final GeneratedColumn<double> waist = GeneratedColumn<double>(
    'waist',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _hipsMeta = const VerificationMeta('hips');
  @override
  late final GeneratedColumn<double> hips = GeneratedColumn<double>(
    'hips',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
    'notes',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    date,
    weight,
    bodyFat,
    chest,
    waist,
    hips,
    notes,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'body_measurements';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbBodyMeasurement> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('weight')) {
      context.handle(
        _weightMeta,
        weight.isAcceptableOrUnknown(data['weight']!, _weightMeta),
      );
    } else if (isInserting) {
      context.missing(_weightMeta);
    }
    if (data.containsKey('body_fat')) {
      context.handle(
        _bodyFatMeta,
        bodyFat.isAcceptableOrUnknown(data['body_fat']!, _bodyFatMeta),
      );
    } else if (isInserting) {
      context.missing(_bodyFatMeta);
    }
    if (data.containsKey('chest')) {
      context.handle(
        _chestMeta,
        chest.isAcceptableOrUnknown(data['chest']!, _chestMeta),
      );
    }
    if (data.containsKey('waist')) {
      context.handle(
        _waistMeta,
        waist.isAcceptableOrUnknown(data['waist']!, _waistMeta),
      );
    }
    if (data.containsKey('hips')) {
      context.handle(
        _hipsMeta,
        hips.isAcceptableOrUnknown(data['hips']!, _hipsMeta),
      );
    }
    if (data.containsKey('notes')) {
      context.handle(
        _notesMeta,
        notes.isAcceptableOrUnknown(data['notes']!, _notesMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbBodyMeasurement map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbBodyMeasurement(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}date'],
      )!,
      weight: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}weight'],
      )!,
      bodyFat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}body_fat'],
      )!,
      chest: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}chest'],
      ),
      waist: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}waist'],
      ),
      hips: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}hips'],
      ),
      notes: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}notes'],
      ),
    );
  }

  @override
  $BodyMeasurementsTable createAlias(String alias) {
    return $BodyMeasurementsTable(attachedDatabase, alias);
  }
}

class DbBodyMeasurement extends DataClass
    implements Insertable<DbBodyMeasurement> {
  final int id;
  final int date;
  final double weight;
  final double bodyFat;
  final double? chest;
  final double? waist;
  final double? hips;
  final String? notes;
  const DbBodyMeasurement({
    required this.id,
    required this.date,
    required this.weight,
    required this.bodyFat,
    this.chest,
    this.waist,
    this.hips,
    this.notes,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['date'] = Variable<int>(date);
    map['weight'] = Variable<double>(weight);
    map['body_fat'] = Variable<double>(bodyFat);
    if (!nullToAbsent || chest != null) {
      map['chest'] = Variable<double>(chest);
    }
    if (!nullToAbsent || waist != null) {
      map['waist'] = Variable<double>(waist);
    }
    if (!nullToAbsent || hips != null) {
      map['hips'] = Variable<double>(hips);
    }
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    return map;
  }

  BodyMeasurementsCompanion toCompanion(bool nullToAbsent) {
    return BodyMeasurementsCompanion(
      id: Value(id),
      date: Value(date),
      weight: Value(weight),
      bodyFat: Value(bodyFat),
      chest: chest == null && nullToAbsent
          ? const Value.absent()
          : Value(chest),
      waist: waist == null && nullToAbsent
          ? const Value.absent()
          : Value(waist),
      hips: hips == null && nullToAbsent ? const Value.absent() : Value(hips),
      notes: notes == null && nullToAbsent
          ? const Value.absent()
          : Value(notes),
    );
  }

  factory DbBodyMeasurement.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbBodyMeasurement(
      id: serializer.fromJson<int>(json['id']),
      date: serializer.fromJson<int>(json['date']),
      weight: serializer.fromJson<double>(json['weight']),
      bodyFat: serializer.fromJson<double>(json['bodyFat']),
      chest: serializer.fromJson<double?>(json['chest']),
      waist: serializer.fromJson<double?>(json['waist']),
      hips: serializer.fromJson<double?>(json['hips']),
      notes: serializer.fromJson<String?>(json['notes']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'date': serializer.toJson<int>(date),
      'weight': serializer.toJson<double>(weight),
      'bodyFat': serializer.toJson<double>(bodyFat),
      'chest': serializer.toJson<double?>(chest),
      'waist': serializer.toJson<double?>(waist),
      'hips': serializer.toJson<double?>(hips),
      'notes': serializer.toJson<String?>(notes),
    };
  }

  DbBodyMeasurement copyWith({
    int? id,
    int? date,
    double? weight,
    double? bodyFat,
    Value<double?> chest = const Value.absent(),
    Value<double?> waist = const Value.absent(),
    Value<double?> hips = const Value.absent(),
    Value<String?> notes = const Value.absent(),
  }) => DbBodyMeasurement(
    id: id ?? this.id,
    date: date ?? this.date,
    weight: weight ?? this.weight,
    bodyFat: bodyFat ?? this.bodyFat,
    chest: chest.present ? chest.value : this.chest,
    waist: waist.present ? waist.value : this.waist,
    hips: hips.present ? hips.value : this.hips,
    notes: notes.present ? notes.value : this.notes,
  );
  DbBodyMeasurement copyWithCompanion(BodyMeasurementsCompanion data) {
    return DbBodyMeasurement(
      id: data.id.present ? data.id.value : this.id,
      date: data.date.present ? data.date.value : this.date,
      weight: data.weight.present ? data.weight.value : this.weight,
      bodyFat: data.bodyFat.present ? data.bodyFat.value : this.bodyFat,
      chest: data.chest.present ? data.chest.value : this.chest,
      waist: data.waist.present ? data.waist.value : this.waist,
      hips: data.hips.present ? data.hips.value : this.hips,
      notes: data.notes.present ? data.notes.value : this.notes,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbBodyMeasurement(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('weight: $weight, ')
          ..write('bodyFat: $bodyFat, ')
          ..write('chest: $chest, ')
          ..write('waist: $waist, ')
          ..write('hips: $hips, ')
          ..write('notes: $notes')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, date, weight, bodyFat, chest, waist, hips, notes);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbBodyMeasurement &&
          other.id == this.id &&
          other.date == this.date &&
          other.weight == this.weight &&
          other.bodyFat == this.bodyFat &&
          other.chest == this.chest &&
          other.waist == this.waist &&
          other.hips == this.hips &&
          other.notes == this.notes);
}

class BodyMeasurementsCompanion extends UpdateCompanion<DbBodyMeasurement> {
  final Value<int> id;
  final Value<int> date;
  final Value<double> weight;
  final Value<double> bodyFat;
  final Value<double?> chest;
  final Value<double?> waist;
  final Value<double?> hips;
  final Value<String?> notes;
  const BodyMeasurementsCompanion({
    this.id = const Value.absent(),
    this.date = const Value.absent(),
    this.weight = const Value.absent(),
    this.bodyFat = const Value.absent(),
    this.chest = const Value.absent(),
    this.waist = const Value.absent(),
    this.hips = const Value.absent(),
    this.notes = const Value.absent(),
  });
  BodyMeasurementsCompanion.insert({
    this.id = const Value.absent(),
    required int date,
    required double weight,
    required double bodyFat,
    this.chest = const Value.absent(),
    this.waist = const Value.absent(),
    this.hips = const Value.absent(),
    this.notes = const Value.absent(),
  }) : date = Value(date),
       weight = Value(weight),
       bodyFat = Value(bodyFat);
  static Insertable<DbBodyMeasurement> custom({
    Expression<int>? id,
    Expression<int>? date,
    Expression<double>? weight,
    Expression<double>? bodyFat,
    Expression<double>? chest,
    Expression<double>? waist,
    Expression<double>? hips,
    Expression<String>? notes,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (date != null) 'date': date,
      if (weight != null) 'weight': weight,
      if (bodyFat != null) 'body_fat': bodyFat,
      if (chest != null) 'chest': chest,
      if (waist != null) 'waist': waist,
      if (hips != null) 'hips': hips,
      if (notes != null) 'notes': notes,
    });
  }

  BodyMeasurementsCompanion copyWith({
    Value<int>? id,
    Value<int>? date,
    Value<double>? weight,
    Value<double>? bodyFat,
    Value<double?>? chest,
    Value<double?>? waist,
    Value<double?>? hips,
    Value<String?>? notes,
  }) {
    return BodyMeasurementsCompanion(
      id: id ?? this.id,
      date: date ?? this.date,
      weight: weight ?? this.weight,
      bodyFat: bodyFat ?? this.bodyFat,
      chest: chest ?? this.chest,
      waist: waist ?? this.waist,
      hips: hips ?? this.hips,
      notes: notes ?? this.notes,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (date.present) {
      map['date'] = Variable<int>(date.value);
    }
    if (weight.present) {
      map['weight'] = Variable<double>(weight.value);
    }
    if (bodyFat.present) {
      map['body_fat'] = Variable<double>(bodyFat.value);
    }
    if (chest.present) {
      map['chest'] = Variable<double>(chest.value);
    }
    if (waist.present) {
      map['waist'] = Variable<double>(waist.value);
    }
    if (hips.present) {
      map['hips'] = Variable<double>(hips.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BodyMeasurementsCompanion(')
          ..write('id: $id, ')
          ..write('date: $date, ')
          ..write('weight: $weight, ')
          ..write('bodyFat: $bodyFat, ')
          ..write('chest: $chest, ')
          ..write('waist: $waist, ')
          ..write('hips: $hips, ')
          ..write('notes: $notes')
          ..write(')'))
        .toString();
  }
}

class $CachedDashboardTable extends CachedDashboard
    with TableInfo<$CachedDashboardTable, DbCachedDashboard> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedDashboardTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _jsonDataMeta = const VerificationMeta(
    'jsonData',
  );
  @override
  late final GeneratedColumn<String> jsonData = GeneratedColumn<String>(
    'json_data',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<int> cachedAt = GeneratedColumn<int>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, jsonData, cachedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_dashboard';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbCachedDashboard> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('json_data')) {
      context.handle(
        _jsonDataMeta,
        jsonData.isAcceptableOrUnknown(data['json_data']!, _jsonDataMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonDataMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  DbCachedDashboard map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbCachedDashboard(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      jsonData: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json_data'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedDashboardTable createAlias(String alias) {
    return $CachedDashboardTable(attachedDatabase, alias);
  }
}

class DbCachedDashboard extends DataClass
    implements Insertable<DbCachedDashboard> {
  final int id;
  final String jsonData;
  final int cachedAt;
  const DbCachedDashboard({
    required this.id,
    required this.jsonData,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['json_data'] = Variable<String>(jsonData);
    map['cached_at'] = Variable<int>(cachedAt);
    return map;
  }

  CachedDashboardCompanion toCompanion(bool nullToAbsent) {
    return CachedDashboardCompanion(
      id: Value(id),
      jsonData: Value(jsonData),
      cachedAt: Value(cachedAt),
    );
  }

  factory DbCachedDashboard.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbCachedDashboard(
      id: serializer.fromJson<int>(json['id']),
      jsonData: serializer.fromJson<String>(json['jsonData']),
      cachedAt: serializer.fromJson<int>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'jsonData': serializer.toJson<String>(jsonData),
      'cachedAt': serializer.toJson<int>(cachedAt),
    };
  }

  DbCachedDashboard copyWith({int? id, String? jsonData, int? cachedAt}) =>
      DbCachedDashboard(
        id: id ?? this.id,
        jsonData: jsonData ?? this.jsonData,
        cachedAt: cachedAt ?? this.cachedAt,
      );
  DbCachedDashboard copyWithCompanion(CachedDashboardCompanion data) {
    return DbCachedDashboard(
      id: data.id.present ? data.id.value : this.id,
      jsonData: data.jsonData.present ? data.jsonData.value : this.jsonData,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbCachedDashboard(')
          ..write('id: $id, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, jsonData, cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbCachedDashboard &&
          other.id == this.id &&
          other.jsonData == this.jsonData &&
          other.cachedAt == this.cachedAt);
}

class CachedDashboardCompanion extends UpdateCompanion<DbCachedDashboard> {
  final Value<int> id;
  final Value<String> jsonData;
  final Value<int> cachedAt;
  const CachedDashboardCompanion({
    this.id = const Value.absent(),
    this.jsonData = const Value.absent(),
    this.cachedAt = const Value.absent(),
  });
  CachedDashboardCompanion.insert({
    this.id = const Value.absent(),
    required String jsonData,
    required int cachedAt,
  }) : jsonData = Value(jsonData),
       cachedAt = Value(cachedAt);
  static Insertable<DbCachedDashboard> custom({
    Expression<int>? id,
    Expression<String>? jsonData,
    Expression<int>? cachedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (jsonData != null) 'json_data': jsonData,
      if (cachedAt != null) 'cached_at': cachedAt,
    });
  }

  CachedDashboardCompanion copyWith({
    Value<int>? id,
    Value<String>? jsonData,
    Value<int>? cachedAt,
  }) {
    return CachedDashboardCompanion(
      id: id ?? this.id,
      jsonData: jsonData ?? this.jsonData,
      cachedAt: cachedAt ?? this.cachedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (jsonData.present) {
      map['json_data'] = Variable<String>(jsonData.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<int>(cachedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedDashboardCompanion(')
          ..write('id: $id, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }
}

class $CachedActivitiesTable extends CachedActivities
    with TableInfo<$CachedActivitiesTable, DbCachedActivity> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedActivitiesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _activityIdMeta = const VerificationMeta(
    'activityId',
  );
  @override
  late final GeneratedColumn<String> activityId = GeneratedColumn<String>(
    'activity_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _jsonDataMeta = const VerificationMeta(
    'jsonData',
  );
  @override
  late final GeneratedColumn<String> jsonData = GeneratedColumn<String>(
    'json_data',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<int> cachedAt = GeneratedColumn<int>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [activityId, jsonData, cachedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_activities';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbCachedActivity> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('activity_id')) {
      context.handle(
        _activityIdMeta,
        activityId.isAcceptableOrUnknown(data['activity_id']!, _activityIdMeta),
      );
    } else if (isInserting) {
      context.missing(_activityIdMeta);
    }
    if (data.containsKey('json_data')) {
      context.handle(
        _jsonDataMeta,
        jsonData.isAcceptableOrUnknown(data['json_data']!, _jsonDataMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonDataMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {activityId};
  @override
  DbCachedActivity map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbCachedActivity(
      activityId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}activity_id'],
      )!,
      jsonData: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json_data'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedActivitiesTable createAlias(String alias) {
    return $CachedActivitiesTable(attachedDatabase, alias);
  }
}

class DbCachedActivity extends DataClass
    implements Insertable<DbCachedActivity> {
  final String activityId;
  final String jsonData;
  final int cachedAt;
  const DbCachedActivity({
    required this.activityId,
    required this.jsonData,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['activity_id'] = Variable<String>(activityId);
    map['json_data'] = Variable<String>(jsonData);
    map['cached_at'] = Variable<int>(cachedAt);
    return map;
  }

  CachedActivitiesCompanion toCompanion(bool nullToAbsent) {
    return CachedActivitiesCompanion(
      activityId: Value(activityId),
      jsonData: Value(jsonData),
      cachedAt: Value(cachedAt),
    );
  }

  factory DbCachedActivity.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbCachedActivity(
      activityId: serializer.fromJson<String>(json['activityId']),
      jsonData: serializer.fromJson<String>(json['jsonData']),
      cachedAt: serializer.fromJson<int>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'activityId': serializer.toJson<String>(activityId),
      'jsonData': serializer.toJson<String>(jsonData),
      'cachedAt': serializer.toJson<int>(cachedAt),
    };
  }

  DbCachedActivity copyWith({
    String? activityId,
    String? jsonData,
    int? cachedAt,
  }) => DbCachedActivity(
    activityId: activityId ?? this.activityId,
    jsonData: jsonData ?? this.jsonData,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  DbCachedActivity copyWithCompanion(CachedActivitiesCompanion data) {
    return DbCachedActivity(
      activityId: data.activityId.present
          ? data.activityId.value
          : this.activityId,
      jsonData: data.jsonData.present ? data.jsonData.value : this.jsonData,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbCachedActivity(')
          ..write('activityId: $activityId, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(activityId, jsonData, cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbCachedActivity &&
          other.activityId == this.activityId &&
          other.jsonData == this.jsonData &&
          other.cachedAt == this.cachedAt);
}

class CachedActivitiesCompanion extends UpdateCompanion<DbCachedActivity> {
  final Value<String> activityId;
  final Value<String> jsonData;
  final Value<int> cachedAt;
  final Value<int> rowid;
  const CachedActivitiesCompanion({
    this.activityId = const Value.absent(),
    this.jsonData = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedActivitiesCompanion.insert({
    required String activityId,
    required String jsonData,
    required int cachedAt,
    this.rowid = const Value.absent(),
  }) : activityId = Value(activityId),
       jsonData = Value(jsonData),
       cachedAt = Value(cachedAt);
  static Insertable<DbCachedActivity> custom({
    Expression<String>? activityId,
    Expression<String>? jsonData,
    Expression<int>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (activityId != null) 'activity_id': activityId,
      if (jsonData != null) 'json_data': jsonData,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedActivitiesCompanion copyWith({
    Value<String>? activityId,
    Value<String>? jsonData,
    Value<int>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedActivitiesCompanion(
      activityId: activityId ?? this.activityId,
      jsonData: jsonData ?? this.jsonData,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (activityId.present) {
      map['activity_id'] = Variable<String>(activityId.value);
    }
    if (jsonData.present) {
      map['json_data'] = Variable<String>(jsonData.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<int>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedActivitiesCompanion(')
          ..write('activityId: $activityId, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedChatMessagesTable extends CachedChatMessages
    with TableInfo<$CachedChatMessagesTable, DbCachedChatMessage> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedChatMessagesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _sessionIdMeta = const VerificationMeta(
    'sessionId',
  );
  @override
  late final GeneratedColumn<String> sessionId = GeneratedColumn<String>(
    'session_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _jsonDataMeta = const VerificationMeta(
    'jsonData',
  );
  @override
  late final GeneratedColumn<String> jsonData = GeneratedColumn<String>(
    'json_data',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<int> cachedAt = GeneratedColumn<int>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [sessionId, jsonData, cachedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_chat_messages';
  @override
  VerificationContext validateIntegrity(
    Insertable<DbCachedChatMessage> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('session_id')) {
      context.handle(
        _sessionIdMeta,
        sessionId.isAcceptableOrUnknown(data['session_id']!, _sessionIdMeta),
      );
    } else if (isInserting) {
      context.missing(_sessionIdMeta);
    }
    if (data.containsKey('json_data')) {
      context.handle(
        _jsonDataMeta,
        jsonData.isAcceptableOrUnknown(data['json_data']!, _jsonDataMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonDataMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {sessionId};
  @override
  DbCachedChatMessage map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DbCachedChatMessage(
      sessionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}session_id'],
      )!,
      jsonData: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json_data'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedChatMessagesTable createAlias(String alias) {
    return $CachedChatMessagesTable(attachedDatabase, alias);
  }
}

class DbCachedChatMessage extends DataClass
    implements Insertable<DbCachedChatMessage> {
  final String sessionId;
  final String jsonData;
  final int cachedAt;
  const DbCachedChatMessage({
    required this.sessionId,
    required this.jsonData,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['session_id'] = Variable<String>(sessionId);
    map['json_data'] = Variable<String>(jsonData);
    map['cached_at'] = Variable<int>(cachedAt);
    return map;
  }

  CachedChatMessagesCompanion toCompanion(bool nullToAbsent) {
    return CachedChatMessagesCompanion(
      sessionId: Value(sessionId),
      jsonData: Value(jsonData),
      cachedAt: Value(cachedAt),
    );
  }

  factory DbCachedChatMessage.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DbCachedChatMessage(
      sessionId: serializer.fromJson<String>(json['sessionId']),
      jsonData: serializer.fromJson<String>(json['jsonData']),
      cachedAt: serializer.fromJson<int>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'sessionId': serializer.toJson<String>(sessionId),
      'jsonData': serializer.toJson<String>(jsonData),
      'cachedAt': serializer.toJson<int>(cachedAt),
    };
  }

  DbCachedChatMessage copyWith({
    String? sessionId,
    String? jsonData,
    int? cachedAt,
  }) => DbCachedChatMessage(
    sessionId: sessionId ?? this.sessionId,
    jsonData: jsonData ?? this.jsonData,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  DbCachedChatMessage copyWithCompanion(CachedChatMessagesCompanion data) {
    return DbCachedChatMessage(
      sessionId: data.sessionId.present ? data.sessionId.value : this.sessionId,
      jsonData: data.jsonData.present ? data.jsonData.value : this.jsonData,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DbCachedChatMessage(')
          ..write('sessionId: $sessionId, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(sessionId, jsonData, cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DbCachedChatMessage &&
          other.sessionId == this.sessionId &&
          other.jsonData == this.jsonData &&
          other.cachedAt == this.cachedAt);
}

class CachedChatMessagesCompanion extends UpdateCompanion<DbCachedChatMessage> {
  final Value<String> sessionId;
  final Value<String> jsonData;
  final Value<int> cachedAt;
  final Value<int> rowid;
  const CachedChatMessagesCompanion({
    this.sessionId = const Value.absent(),
    this.jsonData = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedChatMessagesCompanion.insert({
    required String sessionId,
    required String jsonData,
    required int cachedAt,
    this.rowid = const Value.absent(),
  }) : sessionId = Value(sessionId),
       jsonData = Value(jsonData),
       cachedAt = Value(cachedAt);
  static Insertable<DbCachedChatMessage> custom({
    Expression<String>? sessionId,
    Expression<String>? jsonData,
    Expression<int>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (sessionId != null) 'session_id': sessionId,
      if (jsonData != null) 'json_data': jsonData,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedChatMessagesCompanion copyWith({
    Value<String>? sessionId,
    Value<String>? jsonData,
    Value<int>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedChatMessagesCompanion(
      sessionId: sessionId ?? this.sessionId,
      jsonData: jsonData ?? this.jsonData,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (sessionId.present) {
      map['session_id'] = Variable<String>(sessionId.value);
    }
    if (jsonData.present) {
      map['json_data'] = Variable<String>(jsonData.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<int>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedChatMessagesCompanion(')
          ..write('sessionId: $sessionId, ')
          ..write('jsonData: $jsonData, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $NutritionLogsTable nutritionLogs = $NutritionLogsTable(this);
  late final $FoodItemsTable foodItems = $FoodItemsTable(this);
  late final $SupplementsTable supplements = $SupplementsTable(this);
  late final $SupplementStacksTable supplementStacks = $SupplementStacksTable(
    this,
  );
  late final $SupplementStackItemsTable supplementStackItems =
      $SupplementStackItemsTable(this);
  late final $DailyHealthLogsTable dailyHealthLogs = $DailyHealthLogsTable(
    this,
  );
  late final $FastingSessionsTable fastingSessions = $FastingSessionsTable(
    this,
  );
  late final $BodyMeasurementsTable bodyMeasurements = $BodyMeasurementsTable(
    this,
  );
  late final $CachedDashboardTable cachedDashboard = $CachedDashboardTable(
    this,
  );
  late final $CachedActivitiesTable cachedActivities = $CachedActivitiesTable(
    this,
  );
  late final $CachedChatMessagesTable cachedChatMessages =
      $CachedChatMessagesTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    nutritionLogs,
    foodItems,
    supplements,
    supplementStacks,
    supplementStackItems,
    dailyHealthLogs,
    fastingSessions,
    bodyMeasurements,
    cachedDashboard,
    cachedActivities,
    cachedChatMessages,
  ];
}

typedef $$NutritionLogsTableCreateCompanionBuilder =
    NutritionLogsCompanion Function({
      Value<int> id,
      required int date,
      Value<double> calories,
      Value<double> protein,
      Value<double> carbs,
      Value<double> fat,
      Value<double> water,
      Value<String?> notes,
      Value<DateTime> createdAt,
    });
typedef $$NutritionLogsTableUpdateCompanionBuilder =
    NutritionLogsCompanion Function({
      Value<int> id,
      Value<int> date,
      Value<double> calories,
      Value<double> protein,
      Value<double> carbs,
      Value<double> fat,
      Value<double> water,
      Value<String?> notes,
      Value<DateTime> createdAt,
    });

final class $$NutritionLogsTableReferences
    extends BaseReferences<_$AppDatabase, $NutritionLogsTable, DbNutritionLog> {
  $$NutritionLogsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<$DailyHealthLogsTable, List<DbDailyHealthLog>>
  _dailyHealthLogsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.dailyHealthLogs,
    aliasName: $_aliasNameGenerator(
      db.nutritionLogs.id,
      db.dailyHealthLogs.nutritionLogId,
    ),
  );

  $$DailyHealthLogsTableProcessedTableManager get dailyHealthLogsRefs {
    final manager = $$DailyHealthLogsTableTableManager(
      $_db,
      $_db.dailyHealthLogs,
    ).filter((f) => f.nutritionLogId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _dailyHealthLogsRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$NutritionLogsTableFilterComposer
    extends Composer<_$AppDatabase, $NutritionLogsTable> {
  $$NutritionLogsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get calories => $composableBuilder(
    column: $table.calories,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get protein => $composableBuilder(
    column: $table.protein,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get carbs => $composableBuilder(
    column: $table.carbs,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get fat => $composableBuilder(
    column: $table.fat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get water => $composableBuilder(
    column: $table.water,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> dailyHealthLogsRefs(
    Expression<bool> Function($$DailyHealthLogsTableFilterComposer f) f,
  ) {
    final $$DailyHealthLogsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.dailyHealthLogs,
      getReferencedColumn: (t) => t.nutritionLogId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$DailyHealthLogsTableFilterComposer(
            $db: $db,
            $table: $db.dailyHealthLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$NutritionLogsTableOrderingComposer
    extends Composer<_$AppDatabase, $NutritionLogsTable> {
  $$NutritionLogsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get calories => $composableBuilder(
    column: $table.calories,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get protein => $composableBuilder(
    column: $table.protein,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get carbs => $composableBuilder(
    column: $table.carbs,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get fat => $composableBuilder(
    column: $table.fat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get water => $composableBuilder(
    column: $table.water,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$NutritionLogsTableAnnotationComposer
    extends Composer<_$AppDatabase, $NutritionLogsTable> {
  $$NutritionLogsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<double> get calories =>
      $composableBuilder(column: $table.calories, builder: (column) => column);

  GeneratedColumn<double> get protein =>
      $composableBuilder(column: $table.protein, builder: (column) => column);

  GeneratedColumn<double> get carbs =>
      $composableBuilder(column: $table.carbs, builder: (column) => column);

  GeneratedColumn<double> get fat =>
      $composableBuilder(column: $table.fat, builder: (column) => column);

  GeneratedColumn<double> get water =>
      $composableBuilder(column: $table.water, builder: (column) => column);

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  Expression<T> dailyHealthLogsRefs<T extends Object>(
    Expression<T> Function($$DailyHealthLogsTableAnnotationComposer a) f,
  ) {
    final $$DailyHealthLogsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.dailyHealthLogs,
      getReferencedColumn: (t) => t.nutritionLogId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$DailyHealthLogsTableAnnotationComposer(
            $db: $db,
            $table: $db.dailyHealthLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$NutritionLogsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $NutritionLogsTable,
          DbNutritionLog,
          $$NutritionLogsTableFilterComposer,
          $$NutritionLogsTableOrderingComposer,
          $$NutritionLogsTableAnnotationComposer,
          $$NutritionLogsTableCreateCompanionBuilder,
          $$NutritionLogsTableUpdateCompanionBuilder,
          (DbNutritionLog, $$NutritionLogsTableReferences),
          DbNutritionLog,
          PrefetchHooks Function({bool dailyHealthLogsRefs})
        > {
  $$NutritionLogsTableTableManager(_$AppDatabase db, $NutritionLogsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$NutritionLogsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$NutritionLogsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$NutritionLogsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> date = const Value.absent(),
                Value<double> calories = const Value.absent(),
                Value<double> protein = const Value.absent(),
                Value<double> carbs = const Value.absent(),
                Value<double> fat = const Value.absent(),
                Value<double> water = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => NutritionLogsCompanion(
                id: id,
                date: date,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                water: water,
                notes: notes,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int date,
                Value<double> calories = const Value.absent(),
                Value<double> protein = const Value.absent(),
                Value<double> carbs = const Value.absent(),
                Value<double> fat = const Value.absent(),
                Value<double> water = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => NutritionLogsCompanion.insert(
                id: id,
                date: date,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                water: water,
                notes: notes,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$NutritionLogsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({dailyHealthLogsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (dailyHealthLogsRefs) db.dailyHealthLogs,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (dailyHealthLogsRefs)
                    await $_getPrefetchedData<
                      DbNutritionLog,
                      $NutritionLogsTable,
                      DbDailyHealthLog
                    >(
                      currentTable: table,
                      referencedTable: $$NutritionLogsTableReferences
                          ._dailyHealthLogsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$NutritionLogsTableReferences(
                            db,
                            table,
                            p0,
                          ).dailyHealthLogsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where(
                            (e) => e.nutritionLogId == item.id,
                          ),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$NutritionLogsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $NutritionLogsTable,
      DbNutritionLog,
      $$NutritionLogsTableFilterComposer,
      $$NutritionLogsTableOrderingComposer,
      $$NutritionLogsTableAnnotationComposer,
      $$NutritionLogsTableCreateCompanionBuilder,
      $$NutritionLogsTableUpdateCompanionBuilder,
      (DbNutritionLog, $$NutritionLogsTableReferences),
      DbNutritionLog,
      PrefetchHooks Function({bool dailyHealthLogsRefs})
    >;
typedef $$FoodItemsTableCreateCompanionBuilder =
    FoodItemsCompanion Function({
      Value<int> id,
      required String name,
      required double calories,
      required double protein,
      required double carbs,
      required double fat,
      required double servingSize,
      Value<String?> barcode,
    });
typedef $$FoodItemsTableUpdateCompanionBuilder =
    FoodItemsCompanion Function({
      Value<int> id,
      Value<String> name,
      Value<double> calories,
      Value<double> protein,
      Value<double> carbs,
      Value<double> fat,
      Value<double> servingSize,
      Value<String?> barcode,
    });

class $$FoodItemsTableFilterComposer
    extends Composer<_$AppDatabase, $FoodItemsTable> {
  $$FoodItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get calories => $composableBuilder(
    column: $table.calories,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get protein => $composableBuilder(
    column: $table.protein,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get carbs => $composableBuilder(
    column: $table.carbs,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get fat => $composableBuilder(
    column: $table.fat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get servingSize => $composableBuilder(
    column: $table.servingSize,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get barcode => $composableBuilder(
    column: $table.barcode,
    builder: (column) => ColumnFilters(column),
  );
}

class $$FoodItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $FoodItemsTable> {
  $$FoodItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get calories => $composableBuilder(
    column: $table.calories,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get protein => $composableBuilder(
    column: $table.protein,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get carbs => $composableBuilder(
    column: $table.carbs,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get fat => $composableBuilder(
    column: $table.fat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get servingSize => $composableBuilder(
    column: $table.servingSize,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get barcode => $composableBuilder(
    column: $table.barcode,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$FoodItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $FoodItemsTable> {
  $$FoodItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<double> get calories =>
      $composableBuilder(column: $table.calories, builder: (column) => column);

  GeneratedColumn<double> get protein =>
      $composableBuilder(column: $table.protein, builder: (column) => column);

  GeneratedColumn<double> get carbs =>
      $composableBuilder(column: $table.carbs, builder: (column) => column);

  GeneratedColumn<double> get fat =>
      $composableBuilder(column: $table.fat, builder: (column) => column);

  GeneratedColumn<double> get servingSize => $composableBuilder(
    column: $table.servingSize,
    builder: (column) => column,
  );

  GeneratedColumn<String> get barcode =>
      $composableBuilder(column: $table.barcode, builder: (column) => column);
}

class $$FoodItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $FoodItemsTable,
          DbFoodItem,
          $$FoodItemsTableFilterComposer,
          $$FoodItemsTableOrderingComposer,
          $$FoodItemsTableAnnotationComposer,
          $$FoodItemsTableCreateCompanionBuilder,
          $$FoodItemsTableUpdateCompanionBuilder,
          (
            DbFoodItem,
            BaseReferences<_$AppDatabase, $FoodItemsTable, DbFoodItem>,
          ),
          DbFoodItem,
          PrefetchHooks Function()
        > {
  $$FoodItemsTableTableManager(_$AppDatabase db, $FoodItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$FoodItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$FoodItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$FoodItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<double> calories = const Value.absent(),
                Value<double> protein = const Value.absent(),
                Value<double> carbs = const Value.absent(),
                Value<double> fat = const Value.absent(),
                Value<double> servingSize = const Value.absent(),
                Value<String?> barcode = const Value.absent(),
              }) => FoodItemsCompanion(
                id: id,
                name: name,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                servingSize: servingSize,
                barcode: barcode,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String name,
                required double calories,
                required double protein,
                required double carbs,
                required double fat,
                required double servingSize,
                Value<String?> barcode = const Value.absent(),
              }) => FoodItemsCompanion.insert(
                id: id,
                name: name,
                calories: calories,
                protein: protein,
                carbs: carbs,
                fat: fat,
                servingSize: servingSize,
                barcode: barcode,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$FoodItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $FoodItemsTable,
      DbFoodItem,
      $$FoodItemsTableFilterComposer,
      $$FoodItemsTableOrderingComposer,
      $$FoodItemsTableAnnotationComposer,
      $$FoodItemsTableCreateCompanionBuilder,
      $$FoodItemsTableUpdateCompanionBuilder,
      (DbFoodItem, BaseReferences<_$AppDatabase, $FoodItemsTable, DbFoodItem>),
      DbFoodItem,
      PrefetchHooks Function()
    >;
typedef $$SupplementsTableCreateCompanionBuilder =
    SupplementsCompanion Function({
      Value<int> id,
      required String name,
      required String dosage,
      required String frequency,
      Value<int> isActive,
    });
typedef $$SupplementsTableUpdateCompanionBuilder =
    SupplementsCompanion Function({
      Value<int> id,
      Value<String> name,
      Value<String> dosage,
      Value<String> frequency,
      Value<int> isActive,
    });

final class $$SupplementsTableReferences
    extends BaseReferences<_$AppDatabase, $SupplementsTable, DbSupplement> {
  $$SupplementsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<
    $SupplementStackItemsTable,
    List<DbSupplementStackItem>
  >
  _supplementStackItemsRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.supplementStackItems,
        aliasName: $_aliasNameGenerator(
          db.supplements.id,
          db.supplementStackItems.supplementId,
        ),
      );

  $$SupplementStackItemsTableProcessedTableManager
  get supplementStackItemsRefs {
    final manager = $$SupplementStackItemsTableTableManager(
      $_db,
      $_db.supplementStackItems,
    ).filter((f) => f.supplementId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _supplementStackItemsRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$SupplementsTableFilterComposer
    extends Composer<_$AppDatabase, $SupplementsTable> {
  $$SupplementsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dosage => $composableBuilder(
    column: $table.dosage,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get frequency => $composableBuilder(
    column: $table.frequency,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> supplementStackItemsRefs(
    Expression<bool> Function($$SupplementStackItemsTableFilterComposer f) f,
  ) {
    final $$SupplementStackItemsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.supplementStackItems,
      getReferencedColumn: (t) => t.supplementId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementStackItemsTableFilterComposer(
            $db: $db,
            $table: $db.supplementStackItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$SupplementsTableOrderingComposer
    extends Composer<_$AppDatabase, $SupplementsTable> {
  $$SupplementsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dosage => $composableBuilder(
    column: $table.dosage,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get frequency => $composableBuilder(
    column: $table.frequency,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SupplementsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SupplementsTable> {
  $$SupplementsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get dosage =>
      $composableBuilder(column: $table.dosage, builder: (column) => column);

  GeneratedColumn<String> get frequency =>
      $composableBuilder(column: $table.frequency, builder: (column) => column);

  GeneratedColumn<int> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);

  Expression<T> supplementStackItemsRefs<T extends Object>(
    Expression<T> Function($$SupplementStackItemsTableAnnotationComposer a) f,
  ) {
    final $$SupplementStackItemsTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.supplementStackItems,
          getReferencedColumn: (t) => t.supplementId,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$SupplementStackItemsTableAnnotationComposer(
                $db: $db,
                $table: $db.supplementStackItems,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$SupplementsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SupplementsTable,
          DbSupplement,
          $$SupplementsTableFilterComposer,
          $$SupplementsTableOrderingComposer,
          $$SupplementsTableAnnotationComposer,
          $$SupplementsTableCreateCompanionBuilder,
          $$SupplementsTableUpdateCompanionBuilder,
          (DbSupplement, $$SupplementsTableReferences),
          DbSupplement,
          PrefetchHooks Function({bool supplementStackItemsRefs})
        > {
  $$SupplementsTableTableManager(_$AppDatabase db, $SupplementsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SupplementsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SupplementsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SupplementsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> dosage = const Value.absent(),
                Value<String> frequency = const Value.absent(),
                Value<int> isActive = const Value.absent(),
              }) => SupplementsCompanion(
                id: id,
                name: name,
                dosage: dosage,
                frequency: frequency,
                isActive: isActive,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String name,
                required String dosage,
                required String frequency,
                Value<int> isActive = const Value.absent(),
              }) => SupplementsCompanion.insert(
                id: id,
                name: name,
                dosage: dosage,
                frequency: frequency,
                isActive: isActive,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$SupplementsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({supplementStackItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (supplementStackItemsRefs) db.supplementStackItems,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (supplementStackItemsRefs)
                    await $_getPrefetchedData<
                      DbSupplement,
                      $SupplementsTable,
                      DbSupplementStackItem
                    >(
                      currentTable: table,
                      referencedTable: $$SupplementsTableReferences
                          ._supplementStackItemsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$SupplementsTableReferences(
                            db,
                            table,
                            p0,
                          ).supplementStackItemsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where(
                            (e) => e.supplementId == item.id,
                          ),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$SupplementsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SupplementsTable,
      DbSupplement,
      $$SupplementsTableFilterComposer,
      $$SupplementsTableOrderingComposer,
      $$SupplementsTableAnnotationComposer,
      $$SupplementsTableCreateCompanionBuilder,
      $$SupplementsTableUpdateCompanionBuilder,
      (DbSupplement, $$SupplementsTableReferences),
      DbSupplement,
      PrefetchHooks Function({bool supplementStackItemsRefs})
    >;
typedef $$SupplementStacksTableCreateCompanionBuilder =
    SupplementStacksCompanion Function({
      Value<int> id,
      required String name,
      Value<int> isActive,
    });
typedef $$SupplementStacksTableUpdateCompanionBuilder =
    SupplementStacksCompanion Function({
      Value<int> id,
      Value<String> name,
      Value<int> isActive,
    });

final class $$SupplementStacksTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $SupplementStacksTable,
          DbSupplementStack
        > {
  $$SupplementStacksTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<
    $SupplementStackItemsTable,
    List<DbSupplementStackItem>
  >
  _supplementStackItemsRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.supplementStackItems,
        aliasName: $_aliasNameGenerator(
          db.supplementStacks.id,
          db.supplementStackItems.stackId,
        ),
      );

  $$SupplementStackItemsTableProcessedTableManager
  get supplementStackItemsRefs {
    final manager = $$SupplementStackItemsTableTableManager(
      $_db,
      $_db.supplementStackItems,
    ).filter((f) => f.stackId.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _supplementStackItemsRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$SupplementStacksTableFilterComposer
    extends Composer<_$AppDatabase, $SupplementStacksTable> {
  $$SupplementStacksTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> supplementStackItemsRefs(
    Expression<bool> Function($$SupplementStackItemsTableFilterComposer f) f,
  ) {
    final $$SupplementStackItemsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.supplementStackItems,
      getReferencedColumn: (t) => t.stackId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementStackItemsTableFilterComposer(
            $db: $db,
            $table: $db.supplementStackItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$SupplementStacksTableOrderingComposer
    extends Composer<_$AppDatabase, $SupplementStacksTable> {
  $$SupplementStacksTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SupplementStacksTableAnnotationComposer
    extends Composer<_$AppDatabase, $SupplementStacksTable> {
  $$SupplementStacksTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<int> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);

  Expression<T> supplementStackItemsRefs<T extends Object>(
    Expression<T> Function($$SupplementStackItemsTableAnnotationComposer a) f,
  ) {
    final $$SupplementStackItemsTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.supplementStackItems,
          getReferencedColumn: (t) => t.stackId,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$SupplementStackItemsTableAnnotationComposer(
                $db: $db,
                $table: $db.supplementStackItems,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$SupplementStacksTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SupplementStacksTable,
          DbSupplementStack,
          $$SupplementStacksTableFilterComposer,
          $$SupplementStacksTableOrderingComposer,
          $$SupplementStacksTableAnnotationComposer,
          $$SupplementStacksTableCreateCompanionBuilder,
          $$SupplementStacksTableUpdateCompanionBuilder,
          (DbSupplementStack, $$SupplementStacksTableReferences),
          DbSupplementStack,
          PrefetchHooks Function({bool supplementStackItemsRefs})
        > {
  $$SupplementStacksTableTableManager(
    _$AppDatabase db,
    $SupplementStacksTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SupplementStacksTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SupplementStacksTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SupplementStacksTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<int> isActive = const Value.absent(),
              }) => SupplementStacksCompanion(
                id: id,
                name: name,
                isActive: isActive,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String name,
                Value<int> isActive = const Value.absent(),
              }) => SupplementStacksCompanion.insert(
                id: id,
                name: name,
                isActive: isActive,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$SupplementStacksTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({supplementStackItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (supplementStackItemsRefs) db.supplementStackItems,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (supplementStackItemsRefs)
                    await $_getPrefetchedData<
                      DbSupplementStack,
                      $SupplementStacksTable,
                      DbSupplementStackItem
                    >(
                      currentTable: table,
                      referencedTable: $$SupplementStacksTableReferences
                          ._supplementStackItemsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$SupplementStacksTableReferences(
                            db,
                            table,
                            p0,
                          ).supplementStackItemsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.stackId == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$SupplementStacksTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SupplementStacksTable,
      DbSupplementStack,
      $$SupplementStacksTableFilterComposer,
      $$SupplementStacksTableOrderingComposer,
      $$SupplementStacksTableAnnotationComposer,
      $$SupplementStacksTableCreateCompanionBuilder,
      $$SupplementStacksTableUpdateCompanionBuilder,
      (DbSupplementStack, $$SupplementStacksTableReferences),
      DbSupplementStack,
      PrefetchHooks Function({bool supplementStackItemsRefs})
    >;
typedef $$SupplementStackItemsTableCreateCompanionBuilder =
    SupplementStackItemsCompanion Function({
      Value<int> id,
      required int stackId,
      required int supplementId,
    });
typedef $$SupplementStackItemsTableUpdateCompanionBuilder =
    SupplementStackItemsCompanion Function({
      Value<int> id,
      Value<int> stackId,
      Value<int> supplementId,
    });

final class $$SupplementStackItemsTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $SupplementStackItemsTable,
          DbSupplementStackItem
        > {
  $$SupplementStackItemsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $SupplementStacksTable _stackIdTable(_$AppDatabase db) =>
      db.supplementStacks.createAlias(
        $_aliasNameGenerator(
          db.supplementStackItems.stackId,
          db.supplementStacks.id,
        ),
      );

  $$SupplementStacksTableProcessedTableManager get stackId {
    final $_column = $_itemColumn<int>('stack_id')!;

    final manager = $$SupplementStacksTableTableManager(
      $_db,
      $_db.supplementStacks,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_stackIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $SupplementsTable _supplementIdTable(_$AppDatabase db) =>
      db.supplements.createAlias(
        $_aliasNameGenerator(
          db.supplementStackItems.supplementId,
          db.supplements.id,
        ),
      );

  $$SupplementsTableProcessedTableManager get supplementId {
    final $_column = $_itemColumn<int>('supplement_id')!;

    final manager = $$SupplementsTableTableManager(
      $_db,
      $_db.supplements,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_supplementIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$SupplementStackItemsTableFilterComposer
    extends Composer<_$AppDatabase, $SupplementStackItemsTable> {
  $$SupplementStackItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  $$SupplementStacksTableFilterComposer get stackId {
    final $$SupplementStacksTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.stackId,
      referencedTable: $db.supplementStacks,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementStacksTableFilterComposer(
            $db: $db,
            $table: $db.supplementStacks,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$SupplementsTableFilterComposer get supplementId {
    final $$SupplementsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.supplementId,
      referencedTable: $db.supplements,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementsTableFilterComposer(
            $db: $db,
            $table: $db.supplements,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$SupplementStackItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $SupplementStackItemsTable> {
  $$SupplementStackItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  $$SupplementStacksTableOrderingComposer get stackId {
    final $$SupplementStacksTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.stackId,
      referencedTable: $db.supplementStacks,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementStacksTableOrderingComposer(
            $db: $db,
            $table: $db.supplementStacks,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$SupplementsTableOrderingComposer get supplementId {
    final $$SupplementsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.supplementId,
      referencedTable: $db.supplements,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementsTableOrderingComposer(
            $db: $db,
            $table: $db.supplements,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$SupplementStackItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SupplementStackItemsTable> {
  $$SupplementStackItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  $$SupplementStacksTableAnnotationComposer get stackId {
    final $$SupplementStacksTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.stackId,
      referencedTable: $db.supplementStacks,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementStacksTableAnnotationComposer(
            $db: $db,
            $table: $db.supplementStacks,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$SupplementsTableAnnotationComposer get supplementId {
    final $$SupplementsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.supplementId,
      referencedTable: $db.supplements,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$SupplementsTableAnnotationComposer(
            $db: $db,
            $table: $db.supplements,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$SupplementStackItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SupplementStackItemsTable,
          DbSupplementStackItem,
          $$SupplementStackItemsTableFilterComposer,
          $$SupplementStackItemsTableOrderingComposer,
          $$SupplementStackItemsTableAnnotationComposer,
          $$SupplementStackItemsTableCreateCompanionBuilder,
          $$SupplementStackItemsTableUpdateCompanionBuilder,
          (DbSupplementStackItem, $$SupplementStackItemsTableReferences),
          DbSupplementStackItem,
          PrefetchHooks Function({bool stackId, bool supplementId})
        > {
  $$SupplementStackItemsTableTableManager(
    _$AppDatabase db,
    $SupplementStackItemsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SupplementStackItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SupplementStackItemsTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$SupplementStackItemsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> stackId = const Value.absent(),
                Value<int> supplementId = const Value.absent(),
              }) => SupplementStackItemsCompanion(
                id: id,
                stackId: stackId,
                supplementId: supplementId,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int stackId,
                required int supplementId,
              }) => SupplementStackItemsCompanion.insert(
                id: id,
                stackId: stackId,
                supplementId: supplementId,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$SupplementStackItemsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({stackId = false, supplementId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (stackId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.stackId,
                                referencedTable:
                                    $$SupplementStackItemsTableReferences
                                        ._stackIdTable(db),
                                referencedColumn:
                                    $$SupplementStackItemsTableReferences
                                        ._stackIdTable(db)
                                        .id,
                              )
                              as T;
                    }
                    if (supplementId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.supplementId,
                                referencedTable:
                                    $$SupplementStackItemsTableReferences
                                        ._supplementIdTable(db),
                                referencedColumn:
                                    $$SupplementStackItemsTableReferences
                                        ._supplementIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$SupplementStackItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SupplementStackItemsTable,
      DbSupplementStackItem,
      $$SupplementStackItemsTableFilterComposer,
      $$SupplementStackItemsTableOrderingComposer,
      $$SupplementStackItemsTableAnnotationComposer,
      $$SupplementStackItemsTableCreateCompanionBuilder,
      $$SupplementStackItemsTableUpdateCompanionBuilder,
      (DbSupplementStackItem, $$SupplementStackItemsTableReferences),
      DbSupplementStackItem,
      PrefetchHooks Function({bool stackId, bool supplementId})
    >;
typedef $$DailyHealthLogsTableCreateCompanionBuilder =
    DailyHealthLogsCompanion Function({
      Value<int> id,
      required int date,
      Value<int?> nutritionLogId,
      Value<double> weight,
      Value<double> bodyFat,
      Value<String?> notes,
    });
typedef $$DailyHealthLogsTableUpdateCompanionBuilder =
    DailyHealthLogsCompanion Function({
      Value<int> id,
      Value<int> date,
      Value<int?> nutritionLogId,
      Value<double> weight,
      Value<double> bodyFat,
      Value<String?> notes,
    });

final class $$DailyHealthLogsTableReferences
    extends
        BaseReferences<_$AppDatabase, $DailyHealthLogsTable, DbDailyHealthLog> {
  $$DailyHealthLogsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $NutritionLogsTable _nutritionLogIdTable(_$AppDatabase db) =>
      db.nutritionLogs.createAlias(
        $_aliasNameGenerator(
          db.dailyHealthLogs.nutritionLogId,
          db.nutritionLogs.id,
        ),
      );

  $$NutritionLogsTableProcessedTableManager? get nutritionLogId {
    final $_column = $_itemColumn<int>('nutrition_log_id');
    if ($_column == null) return null;
    final manager = $$NutritionLogsTableTableManager(
      $_db,
      $_db.nutritionLogs,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_nutritionLogIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$DailyHealthLogsTableFilterComposer
    extends Composer<_$AppDatabase, $DailyHealthLogsTable> {
  $$DailyHealthLogsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get bodyFat => $composableBuilder(
    column: $table.bodyFat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnFilters(column),
  );

  $$NutritionLogsTableFilterComposer get nutritionLogId {
    final $$NutritionLogsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.nutritionLogId,
      referencedTable: $db.nutritionLogs,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$NutritionLogsTableFilterComposer(
            $db: $db,
            $table: $db.nutritionLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$DailyHealthLogsTableOrderingComposer
    extends Composer<_$AppDatabase, $DailyHealthLogsTable> {
  $$DailyHealthLogsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get bodyFat => $composableBuilder(
    column: $table.bodyFat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnOrderings(column),
  );

  $$NutritionLogsTableOrderingComposer get nutritionLogId {
    final $$NutritionLogsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.nutritionLogId,
      referencedTable: $db.nutritionLogs,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$NutritionLogsTableOrderingComposer(
            $db: $db,
            $table: $db.nutritionLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$DailyHealthLogsTableAnnotationComposer
    extends Composer<_$AppDatabase, $DailyHealthLogsTable> {
  $$DailyHealthLogsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<double> get weight =>
      $composableBuilder(column: $table.weight, builder: (column) => column);

  GeneratedColumn<double> get bodyFat =>
      $composableBuilder(column: $table.bodyFat, builder: (column) => column);

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);

  $$NutritionLogsTableAnnotationComposer get nutritionLogId {
    final $$NutritionLogsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.nutritionLogId,
      referencedTable: $db.nutritionLogs,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$NutritionLogsTableAnnotationComposer(
            $db: $db,
            $table: $db.nutritionLogs,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$DailyHealthLogsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $DailyHealthLogsTable,
          DbDailyHealthLog,
          $$DailyHealthLogsTableFilterComposer,
          $$DailyHealthLogsTableOrderingComposer,
          $$DailyHealthLogsTableAnnotationComposer,
          $$DailyHealthLogsTableCreateCompanionBuilder,
          $$DailyHealthLogsTableUpdateCompanionBuilder,
          (DbDailyHealthLog, $$DailyHealthLogsTableReferences),
          DbDailyHealthLog,
          PrefetchHooks Function({bool nutritionLogId})
        > {
  $$DailyHealthLogsTableTableManager(
    _$AppDatabase db,
    $DailyHealthLogsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$DailyHealthLogsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$DailyHealthLogsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$DailyHealthLogsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> date = const Value.absent(),
                Value<int?> nutritionLogId = const Value.absent(),
                Value<double> weight = const Value.absent(),
                Value<double> bodyFat = const Value.absent(),
                Value<String?> notes = const Value.absent(),
              }) => DailyHealthLogsCompanion(
                id: id,
                date: date,
                nutritionLogId: nutritionLogId,
                weight: weight,
                bodyFat: bodyFat,
                notes: notes,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int date,
                Value<int?> nutritionLogId = const Value.absent(),
                Value<double> weight = const Value.absent(),
                Value<double> bodyFat = const Value.absent(),
                Value<String?> notes = const Value.absent(),
              }) => DailyHealthLogsCompanion.insert(
                id: id,
                date: date,
                nutritionLogId: nutritionLogId,
                weight: weight,
                bodyFat: bodyFat,
                notes: notes,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$DailyHealthLogsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({nutritionLogId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (nutritionLogId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.nutritionLogId,
                                referencedTable:
                                    $$DailyHealthLogsTableReferences
                                        ._nutritionLogIdTable(db),
                                referencedColumn:
                                    $$DailyHealthLogsTableReferences
                                        ._nutritionLogIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$DailyHealthLogsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $DailyHealthLogsTable,
      DbDailyHealthLog,
      $$DailyHealthLogsTableFilterComposer,
      $$DailyHealthLogsTableOrderingComposer,
      $$DailyHealthLogsTableAnnotationComposer,
      $$DailyHealthLogsTableCreateCompanionBuilder,
      $$DailyHealthLogsTableUpdateCompanionBuilder,
      (DbDailyHealthLog, $$DailyHealthLogsTableReferences),
      DbDailyHealthLog,
      PrefetchHooks Function({bool nutritionLogId})
    >;
typedef $$FastingSessionsTableCreateCompanionBuilder =
    FastingSessionsCompanion Function({
      Value<int> id,
      required int startTime,
      Value<int?> endTime,
      Value<int> duration,
      Value<int> isActive,
    });
typedef $$FastingSessionsTableUpdateCompanionBuilder =
    FastingSessionsCompanion Function({
      Value<int> id,
      Value<int> startTime,
      Value<int?> endTime,
      Value<int> duration,
      Value<int> isActive,
    });

class $$FastingSessionsTableFilterComposer
    extends Composer<_$AppDatabase, $FastingSessionsTable> {
  $$FastingSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get startTime => $composableBuilder(
    column: $table.startTime,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get endTime => $composableBuilder(
    column: $table.endTime,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get duration => $composableBuilder(
    column: $table.duration,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnFilters(column),
  );
}

class $$FastingSessionsTableOrderingComposer
    extends Composer<_$AppDatabase, $FastingSessionsTable> {
  $$FastingSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get startTime => $composableBuilder(
    column: $table.startTime,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get endTime => $composableBuilder(
    column: $table.endTime,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get duration => $composableBuilder(
    column: $table.duration,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get isActive => $composableBuilder(
    column: $table.isActive,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$FastingSessionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $FastingSessionsTable> {
  $$FastingSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get startTime =>
      $composableBuilder(column: $table.startTime, builder: (column) => column);

  GeneratedColumn<int> get endTime =>
      $composableBuilder(column: $table.endTime, builder: (column) => column);

  GeneratedColumn<int> get duration =>
      $composableBuilder(column: $table.duration, builder: (column) => column);

  GeneratedColumn<int> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);
}

class $$FastingSessionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $FastingSessionsTable,
          DbFastingSession,
          $$FastingSessionsTableFilterComposer,
          $$FastingSessionsTableOrderingComposer,
          $$FastingSessionsTableAnnotationComposer,
          $$FastingSessionsTableCreateCompanionBuilder,
          $$FastingSessionsTableUpdateCompanionBuilder,
          (
            DbFastingSession,
            BaseReferences<
              _$AppDatabase,
              $FastingSessionsTable,
              DbFastingSession
            >,
          ),
          DbFastingSession,
          PrefetchHooks Function()
        > {
  $$FastingSessionsTableTableManager(
    _$AppDatabase db,
    $FastingSessionsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$FastingSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$FastingSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$FastingSessionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> startTime = const Value.absent(),
                Value<int?> endTime = const Value.absent(),
                Value<int> duration = const Value.absent(),
                Value<int> isActive = const Value.absent(),
              }) => FastingSessionsCompanion(
                id: id,
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                isActive: isActive,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int startTime,
                Value<int?> endTime = const Value.absent(),
                Value<int> duration = const Value.absent(),
                Value<int> isActive = const Value.absent(),
              }) => FastingSessionsCompanion.insert(
                id: id,
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                isActive: isActive,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$FastingSessionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $FastingSessionsTable,
      DbFastingSession,
      $$FastingSessionsTableFilterComposer,
      $$FastingSessionsTableOrderingComposer,
      $$FastingSessionsTableAnnotationComposer,
      $$FastingSessionsTableCreateCompanionBuilder,
      $$FastingSessionsTableUpdateCompanionBuilder,
      (
        DbFastingSession,
        BaseReferences<_$AppDatabase, $FastingSessionsTable, DbFastingSession>,
      ),
      DbFastingSession,
      PrefetchHooks Function()
    >;
typedef $$BodyMeasurementsTableCreateCompanionBuilder =
    BodyMeasurementsCompanion Function({
      Value<int> id,
      required int date,
      required double weight,
      required double bodyFat,
      Value<double?> chest,
      Value<double?> waist,
      Value<double?> hips,
      Value<String?> notes,
    });
typedef $$BodyMeasurementsTableUpdateCompanionBuilder =
    BodyMeasurementsCompanion Function({
      Value<int> id,
      Value<int> date,
      Value<double> weight,
      Value<double> bodyFat,
      Value<double?> chest,
      Value<double?> waist,
      Value<double?> hips,
      Value<String?> notes,
    });

class $$BodyMeasurementsTableFilterComposer
    extends Composer<_$AppDatabase, $BodyMeasurementsTable> {
  $$BodyMeasurementsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get bodyFat => $composableBuilder(
    column: $table.bodyFat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get chest => $composableBuilder(
    column: $table.chest,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get waist => $composableBuilder(
    column: $table.waist,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get hips => $composableBuilder(
    column: $table.hips,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnFilters(column),
  );
}

class $$BodyMeasurementsTableOrderingComposer
    extends Composer<_$AppDatabase, $BodyMeasurementsTable> {
  $$BodyMeasurementsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get weight => $composableBuilder(
    column: $table.weight,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get bodyFat => $composableBuilder(
    column: $table.bodyFat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get chest => $composableBuilder(
    column: $table.chest,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get waist => $composableBuilder(
    column: $table.waist,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get hips => $composableBuilder(
    column: $table.hips,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$BodyMeasurementsTableAnnotationComposer
    extends Composer<_$AppDatabase, $BodyMeasurementsTable> {
  $$BodyMeasurementsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<double> get weight =>
      $composableBuilder(column: $table.weight, builder: (column) => column);

  GeneratedColumn<double> get bodyFat =>
      $composableBuilder(column: $table.bodyFat, builder: (column) => column);

  GeneratedColumn<double> get chest =>
      $composableBuilder(column: $table.chest, builder: (column) => column);

  GeneratedColumn<double> get waist =>
      $composableBuilder(column: $table.waist, builder: (column) => column);

  GeneratedColumn<double> get hips =>
      $composableBuilder(column: $table.hips, builder: (column) => column);

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);
}

class $$BodyMeasurementsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $BodyMeasurementsTable,
          DbBodyMeasurement,
          $$BodyMeasurementsTableFilterComposer,
          $$BodyMeasurementsTableOrderingComposer,
          $$BodyMeasurementsTableAnnotationComposer,
          $$BodyMeasurementsTableCreateCompanionBuilder,
          $$BodyMeasurementsTableUpdateCompanionBuilder,
          (
            DbBodyMeasurement,
            BaseReferences<
              _$AppDatabase,
              $BodyMeasurementsTable,
              DbBodyMeasurement
            >,
          ),
          DbBodyMeasurement,
          PrefetchHooks Function()
        > {
  $$BodyMeasurementsTableTableManager(
    _$AppDatabase db,
    $BodyMeasurementsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BodyMeasurementsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BodyMeasurementsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BodyMeasurementsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> date = const Value.absent(),
                Value<double> weight = const Value.absent(),
                Value<double> bodyFat = const Value.absent(),
                Value<double?> chest = const Value.absent(),
                Value<double?> waist = const Value.absent(),
                Value<double?> hips = const Value.absent(),
                Value<String?> notes = const Value.absent(),
              }) => BodyMeasurementsCompanion(
                id: id,
                date: date,
                weight: weight,
                bodyFat: bodyFat,
                chest: chest,
                waist: waist,
                hips: hips,
                notes: notes,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int date,
                required double weight,
                required double bodyFat,
                Value<double?> chest = const Value.absent(),
                Value<double?> waist = const Value.absent(),
                Value<double?> hips = const Value.absent(),
                Value<String?> notes = const Value.absent(),
              }) => BodyMeasurementsCompanion.insert(
                id: id,
                date: date,
                weight: weight,
                bodyFat: bodyFat,
                chest: chest,
                waist: waist,
                hips: hips,
                notes: notes,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$BodyMeasurementsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $BodyMeasurementsTable,
      DbBodyMeasurement,
      $$BodyMeasurementsTableFilterComposer,
      $$BodyMeasurementsTableOrderingComposer,
      $$BodyMeasurementsTableAnnotationComposer,
      $$BodyMeasurementsTableCreateCompanionBuilder,
      $$BodyMeasurementsTableUpdateCompanionBuilder,
      (
        DbBodyMeasurement,
        BaseReferences<
          _$AppDatabase,
          $BodyMeasurementsTable,
          DbBodyMeasurement
        >,
      ),
      DbBodyMeasurement,
      PrefetchHooks Function()
    >;
typedef $$CachedDashboardTableCreateCompanionBuilder =
    CachedDashboardCompanion Function({
      Value<int> id,
      required String jsonData,
      required int cachedAt,
    });
typedef $$CachedDashboardTableUpdateCompanionBuilder =
    CachedDashboardCompanion Function({
      Value<int> id,
      Value<String> jsonData,
      Value<int> cachedAt,
    });

class $$CachedDashboardTableFilterComposer
    extends Composer<_$AppDatabase, $CachedDashboardTable> {
  $$CachedDashboardTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedDashboardTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedDashboardTable> {
  $$CachedDashboardTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedDashboardTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedDashboardTable> {
  $$CachedDashboardTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get jsonData =>
      $composableBuilder(column: $table.jsonData, builder: (column) => column);

  GeneratedColumn<int> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedDashboardTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedDashboardTable,
          DbCachedDashboard,
          $$CachedDashboardTableFilterComposer,
          $$CachedDashboardTableOrderingComposer,
          $$CachedDashboardTableAnnotationComposer,
          $$CachedDashboardTableCreateCompanionBuilder,
          $$CachedDashboardTableUpdateCompanionBuilder,
          (
            DbCachedDashboard,
            BaseReferences<
              _$AppDatabase,
              $CachedDashboardTable,
              DbCachedDashboard
            >,
          ),
          DbCachedDashboard,
          PrefetchHooks Function()
        > {
  $$CachedDashboardTableTableManager(
    _$AppDatabase db,
    $CachedDashboardTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedDashboardTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedDashboardTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedDashboardTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> jsonData = const Value.absent(),
                Value<int> cachedAt = const Value.absent(),
              }) => CachedDashboardCompanion(
                id: id,
                jsonData: jsonData,
                cachedAt: cachedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String jsonData,
                required int cachedAt,
              }) => CachedDashboardCompanion.insert(
                id: id,
                jsonData: jsonData,
                cachedAt: cachedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedDashboardTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedDashboardTable,
      DbCachedDashboard,
      $$CachedDashboardTableFilterComposer,
      $$CachedDashboardTableOrderingComposer,
      $$CachedDashboardTableAnnotationComposer,
      $$CachedDashboardTableCreateCompanionBuilder,
      $$CachedDashboardTableUpdateCompanionBuilder,
      (
        DbCachedDashboard,
        BaseReferences<_$AppDatabase, $CachedDashboardTable, DbCachedDashboard>,
      ),
      DbCachedDashboard,
      PrefetchHooks Function()
    >;
typedef $$CachedActivitiesTableCreateCompanionBuilder =
    CachedActivitiesCompanion Function({
      required String activityId,
      required String jsonData,
      required int cachedAt,
      Value<int> rowid,
    });
typedef $$CachedActivitiesTableUpdateCompanionBuilder =
    CachedActivitiesCompanion Function({
      Value<String> activityId,
      Value<String> jsonData,
      Value<int> cachedAt,
      Value<int> rowid,
    });

class $$CachedActivitiesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedActivitiesTable> {
  $$CachedActivitiesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get activityId => $composableBuilder(
    column: $table.activityId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedActivitiesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedActivitiesTable> {
  $$CachedActivitiesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get activityId => $composableBuilder(
    column: $table.activityId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedActivitiesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedActivitiesTable> {
  $$CachedActivitiesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get activityId => $composableBuilder(
    column: $table.activityId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get jsonData =>
      $composableBuilder(column: $table.jsonData, builder: (column) => column);

  GeneratedColumn<int> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedActivitiesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedActivitiesTable,
          DbCachedActivity,
          $$CachedActivitiesTableFilterComposer,
          $$CachedActivitiesTableOrderingComposer,
          $$CachedActivitiesTableAnnotationComposer,
          $$CachedActivitiesTableCreateCompanionBuilder,
          $$CachedActivitiesTableUpdateCompanionBuilder,
          (
            DbCachedActivity,
            BaseReferences<
              _$AppDatabase,
              $CachedActivitiesTable,
              DbCachedActivity
            >,
          ),
          DbCachedActivity,
          PrefetchHooks Function()
        > {
  $$CachedActivitiesTableTableManager(
    _$AppDatabase db,
    $CachedActivitiesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedActivitiesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedActivitiesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedActivitiesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> activityId = const Value.absent(),
                Value<String> jsonData = const Value.absent(),
                Value<int> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedActivitiesCompanion(
                activityId: activityId,
                jsonData: jsonData,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String activityId,
                required String jsonData,
                required int cachedAt,
                Value<int> rowid = const Value.absent(),
              }) => CachedActivitiesCompanion.insert(
                activityId: activityId,
                jsonData: jsonData,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedActivitiesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedActivitiesTable,
      DbCachedActivity,
      $$CachedActivitiesTableFilterComposer,
      $$CachedActivitiesTableOrderingComposer,
      $$CachedActivitiesTableAnnotationComposer,
      $$CachedActivitiesTableCreateCompanionBuilder,
      $$CachedActivitiesTableUpdateCompanionBuilder,
      (
        DbCachedActivity,
        BaseReferences<_$AppDatabase, $CachedActivitiesTable, DbCachedActivity>,
      ),
      DbCachedActivity,
      PrefetchHooks Function()
    >;
typedef $$CachedChatMessagesTableCreateCompanionBuilder =
    CachedChatMessagesCompanion Function({
      required String sessionId,
      required String jsonData,
      required int cachedAt,
      Value<int> rowid,
    });
typedef $$CachedChatMessagesTableUpdateCompanionBuilder =
    CachedChatMessagesCompanion Function({
      Value<String> sessionId,
      Value<String> jsonData,
      Value<int> cachedAt,
      Value<int> rowid,
    });

class $$CachedChatMessagesTableFilterComposer
    extends Composer<_$AppDatabase, $CachedChatMessagesTable> {
  $$CachedChatMessagesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get sessionId => $composableBuilder(
    column: $table.sessionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedChatMessagesTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedChatMessagesTable> {
  $$CachedChatMessagesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get sessionId => $composableBuilder(
    column: $table.sessionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get jsonData => $composableBuilder(
    column: $table.jsonData,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedChatMessagesTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedChatMessagesTable> {
  $$CachedChatMessagesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get sessionId =>
      $composableBuilder(column: $table.sessionId, builder: (column) => column);

  GeneratedColumn<String> get jsonData =>
      $composableBuilder(column: $table.jsonData, builder: (column) => column);

  GeneratedColumn<int> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedChatMessagesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedChatMessagesTable,
          DbCachedChatMessage,
          $$CachedChatMessagesTableFilterComposer,
          $$CachedChatMessagesTableOrderingComposer,
          $$CachedChatMessagesTableAnnotationComposer,
          $$CachedChatMessagesTableCreateCompanionBuilder,
          $$CachedChatMessagesTableUpdateCompanionBuilder,
          (
            DbCachedChatMessage,
            BaseReferences<
              _$AppDatabase,
              $CachedChatMessagesTable,
              DbCachedChatMessage
            >,
          ),
          DbCachedChatMessage,
          PrefetchHooks Function()
        > {
  $$CachedChatMessagesTableTableManager(
    _$AppDatabase db,
    $CachedChatMessagesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedChatMessagesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedChatMessagesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedChatMessagesTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> sessionId = const Value.absent(),
                Value<String> jsonData = const Value.absent(),
                Value<int> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedChatMessagesCompanion(
                sessionId: sessionId,
                jsonData: jsonData,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String sessionId,
                required String jsonData,
                required int cachedAt,
                Value<int> rowid = const Value.absent(),
              }) => CachedChatMessagesCompanion.insert(
                sessionId: sessionId,
                jsonData: jsonData,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedChatMessagesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedChatMessagesTable,
      DbCachedChatMessage,
      $$CachedChatMessagesTableFilterComposer,
      $$CachedChatMessagesTableOrderingComposer,
      $$CachedChatMessagesTableAnnotationComposer,
      $$CachedChatMessagesTableCreateCompanionBuilder,
      $$CachedChatMessagesTableUpdateCompanionBuilder,
      (
        DbCachedChatMessage,
        BaseReferences<
          _$AppDatabase,
          $CachedChatMessagesTable,
          DbCachedChatMessage
        >,
      ),
      DbCachedChatMessage,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$NutritionLogsTableTableManager get nutritionLogs =>
      $$NutritionLogsTableTableManager(_db, _db.nutritionLogs);
  $$FoodItemsTableTableManager get foodItems =>
      $$FoodItemsTableTableManager(_db, _db.foodItems);
  $$SupplementsTableTableManager get supplements =>
      $$SupplementsTableTableManager(_db, _db.supplements);
  $$SupplementStacksTableTableManager get supplementStacks =>
      $$SupplementStacksTableTableManager(_db, _db.supplementStacks);
  $$SupplementStackItemsTableTableManager get supplementStackItems =>
      $$SupplementStackItemsTableTableManager(_db, _db.supplementStackItems);
  $$DailyHealthLogsTableTableManager get dailyHealthLogs =>
      $$DailyHealthLogsTableTableManager(_db, _db.dailyHealthLogs);
  $$FastingSessionsTableTableManager get fastingSessions =>
      $$FastingSessionsTableTableManager(_db, _db.fastingSessions);
  $$BodyMeasurementsTableTableManager get bodyMeasurements =>
      $$BodyMeasurementsTableTableManager(_db, _db.bodyMeasurements);
  $$CachedDashboardTableTableManager get cachedDashboard =>
      $$CachedDashboardTableTableManager(_db, _db.cachedDashboard);
  $$CachedActivitiesTableTableManager get cachedActivities =>
      $$CachedActivitiesTableTableManager(_db, _db.cachedActivities);
  $$CachedChatMessagesTableTableManager get cachedChatMessages =>
      $$CachedChatMessagesTableTableManager(_db, _db.cachedChatMessages);
}
