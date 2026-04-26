// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'health_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$NutritionLog {

 int get id; DateTime get date; double get calories; double get protein; double get carbs; double get fat; double get water; String? get notes; DateTime get createdAt;
/// Create a copy of NutritionLog
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NutritionLogCopyWith<NutritionLog> get copyWith => _$NutritionLogCopyWithImpl<NutritionLog>(this as NutritionLog, _$identity);

  /// Serializes this NutritionLog to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NutritionLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fat, fat) || other.fat == fat)&&(identical(other.water, water) || other.water == water)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,calories,protein,carbs,fat,water,notes,createdAt);

@override
String toString() {
  return 'NutritionLog(id: $id, date: $date, calories: $calories, protein: $protein, carbs: $carbs, fat: $fat, water: $water, notes: $notes, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $NutritionLogCopyWith<$Res>  {
  factory $NutritionLogCopyWith(NutritionLog value, $Res Function(NutritionLog) _then) = _$NutritionLogCopyWithImpl;
@useResult
$Res call({
 int id, DateTime date, double calories, double protein, double carbs, double fat, double water, String? notes, DateTime createdAt
});




}
/// @nodoc
class _$NutritionLogCopyWithImpl<$Res>
    implements $NutritionLogCopyWith<$Res> {
  _$NutritionLogCopyWithImpl(this._self, this._then);

  final NutritionLog _self;
  final $Res Function(NutritionLog) _then;

/// Create a copy of NutritionLog
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? date = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fat = null,Object? water = null,Object? notes = freezed,Object? createdAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fat: null == fat ? _self.fat : fat // ignore: cast_nullable_to_non_nullable
as double,water: null == water ? _self.water : water // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [NutritionLog].
extension NutritionLogPatterns on NutritionLog {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NutritionLog value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NutritionLog() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NutritionLog value)  $default,){
final _that = this;
switch (_that) {
case _NutritionLog():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NutritionLog value)?  $default,){
final _that = this;
switch (_that) {
case _NutritionLog() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  DateTime date,  double calories,  double protein,  double carbs,  double fat,  double water,  String? notes,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NutritionLog() when $default != null:
return $default(_that.id,_that.date,_that.calories,_that.protein,_that.carbs,_that.fat,_that.water,_that.notes,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  DateTime date,  double calories,  double protein,  double carbs,  double fat,  double water,  String? notes,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _NutritionLog():
return $default(_that.id,_that.date,_that.calories,_that.protein,_that.carbs,_that.fat,_that.water,_that.notes,_that.createdAt);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  DateTime date,  double calories,  double protein,  double carbs,  double fat,  double water,  String? notes,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _NutritionLog() when $default != null:
return $default(_that.id,_that.date,_that.calories,_that.protein,_that.carbs,_that.fat,_that.water,_that.notes,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NutritionLog extends NutritionLog {
  const _NutritionLog({required this.id, required this.date, required this.calories, required this.protein, required this.carbs, required this.fat, required this.water, this.notes, required this.createdAt}): super._();
  factory _NutritionLog.fromJson(Map<String, dynamic> json) => _$NutritionLogFromJson(json);

@override final  int id;
@override final  DateTime date;
@override final  double calories;
@override final  double protein;
@override final  double carbs;
@override final  double fat;
@override final  double water;
@override final  String? notes;
@override final  DateTime createdAt;

/// Create a copy of NutritionLog
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NutritionLogCopyWith<_NutritionLog> get copyWith => __$NutritionLogCopyWithImpl<_NutritionLog>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NutritionLogToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NutritionLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fat, fat) || other.fat == fat)&&(identical(other.water, water) || other.water == water)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,calories,protein,carbs,fat,water,notes,createdAt);

@override
String toString() {
  return 'NutritionLog(id: $id, date: $date, calories: $calories, protein: $protein, carbs: $carbs, fat: $fat, water: $water, notes: $notes, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$NutritionLogCopyWith<$Res> implements $NutritionLogCopyWith<$Res> {
  factory _$NutritionLogCopyWith(_NutritionLog value, $Res Function(_NutritionLog) _then) = __$NutritionLogCopyWithImpl;
@override @useResult
$Res call({
 int id, DateTime date, double calories, double protein, double carbs, double fat, double water, String? notes, DateTime createdAt
});




}
/// @nodoc
class __$NutritionLogCopyWithImpl<$Res>
    implements _$NutritionLogCopyWith<$Res> {
  __$NutritionLogCopyWithImpl(this._self, this._then);

  final _NutritionLog _self;
  final $Res Function(_NutritionLog) _then;

/// Create a copy of NutritionLog
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? date = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fat = null,Object? water = null,Object? notes = freezed,Object? createdAt = null,}) {
  return _then(_NutritionLog(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fat: null == fat ? _self.fat : fat // ignore: cast_nullable_to_non_nullable
as double,water: null == water ? _self.water : water // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$FoodItem {

 int get id; String get name; double get calories; double get protein; double get carbs; double get fat; double get servingSize; String? get barcode;
/// Create a copy of FoodItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FoodItemCopyWith<FoodItem> get copyWith => _$FoodItemCopyWithImpl<FoodItem>(this as FoodItem, _$identity);

  /// Serializes this FoodItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FoodItem&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fat, fat) || other.fat == fat)&&(identical(other.servingSize, servingSize) || other.servingSize == servingSize)&&(identical(other.barcode, barcode) || other.barcode == barcode));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,calories,protein,carbs,fat,servingSize,barcode);

@override
String toString() {
  return 'FoodItem(id: $id, name: $name, calories: $calories, protein: $protein, carbs: $carbs, fat: $fat, servingSize: $servingSize, barcode: $barcode)';
}


}

/// @nodoc
abstract mixin class $FoodItemCopyWith<$Res>  {
  factory $FoodItemCopyWith(FoodItem value, $Res Function(FoodItem) _then) = _$FoodItemCopyWithImpl;
@useResult
$Res call({
 int id, String name, double calories, double protein, double carbs, double fat, double servingSize, String? barcode
});




}
/// @nodoc
class _$FoodItemCopyWithImpl<$Res>
    implements $FoodItemCopyWith<$Res> {
  _$FoodItemCopyWithImpl(this._self, this._then);

  final FoodItem _self;
  final $Res Function(FoodItem) _then;

/// Create a copy of FoodItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fat = null,Object? servingSize = null,Object? barcode = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fat: null == fat ? _self.fat : fat // ignore: cast_nullable_to_non_nullable
as double,servingSize: null == servingSize ? _self.servingSize : servingSize // ignore: cast_nullable_to_non_nullable
as double,barcode: freezed == barcode ? _self.barcode : barcode // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [FoodItem].
extension FoodItemPatterns on FoodItem {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FoodItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FoodItem() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FoodItem value)  $default,){
final _that = this;
switch (_that) {
case _FoodItem():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FoodItem value)?  $default,){
final _that = this;
switch (_that) {
case _FoodItem() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name,  double calories,  double protein,  double carbs,  double fat,  double servingSize,  String? barcode)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FoodItem() when $default != null:
return $default(_that.id,_that.name,_that.calories,_that.protein,_that.carbs,_that.fat,_that.servingSize,_that.barcode);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name,  double calories,  double protein,  double carbs,  double fat,  double servingSize,  String? barcode)  $default,) {final _that = this;
switch (_that) {
case _FoodItem():
return $default(_that.id,_that.name,_that.calories,_that.protein,_that.carbs,_that.fat,_that.servingSize,_that.barcode);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name,  double calories,  double protein,  double carbs,  double fat,  double servingSize,  String? barcode)?  $default,) {final _that = this;
switch (_that) {
case _FoodItem() when $default != null:
return $default(_that.id,_that.name,_that.calories,_that.protein,_that.carbs,_that.fat,_that.servingSize,_that.barcode);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FoodItem extends FoodItem {
  const _FoodItem({required this.id, required this.name, required this.calories, required this.protein, required this.carbs, required this.fat, required this.servingSize, this.barcode}): super._();
  factory _FoodItem.fromJson(Map<String, dynamic> json) => _$FoodItemFromJson(json);

@override final  int id;
@override final  String name;
@override final  double calories;
@override final  double protein;
@override final  double carbs;
@override final  double fat;
@override final  double servingSize;
@override final  String? barcode;

/// Create a copy of FoodItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FoodItemCopyWith<_FoodItem> get copyWith => __$FoodItemCopyWithImpl<_FoodItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FoodItemToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FoodItem&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fat, fat) || other.fat == fat)&&(identical(other.servingSize, servingSize) || other.servingSize == servingSize)&&(identical(other.barcode, barcode) || other.barcode == barcode));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,calories,protein,carbs,fat,servingSize,barcode);

@override
String toString() {
  return 'FoodItem(id: $id, name: $name, calories: $calories, protein: $protein, carbs: $carbs, fat: $fat, servingSize: $servingSize, barcode: $barcode)';
}


}

/// @nodoc
abstract mixin class _$FoodItemCopyWith<$Res> implements $FoodItemCopyWith<$Res> {
  factory _$FoodItemCopyWith(_FoodItem value, $Res Function(_FoodItem) _then) = __$FoodItemCopyWithImpl;
@override @useResult
$Res call({
 int id, String name, double calories, double protein, double carbs, double fat, double servingSize, String? barcode
});




}
/// @nodoc
class __$FoodItemCopyWithImpl<$Res>
    implements _$FoodItemCopyWith<$Res> {
  __$FoodItemCopyWithImpl(this._self, this._then);

  final _FoodItem _self;
  final $Res Function(_FoodItem) _then;

/// Create a copy of FoodItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fat = null,Object? servingSize = null,Object? barcode = freezed,}) {
  return _then(_FoodItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fat: null == fat ? _self.fat : fat // ignore: cast_nullable_to_non_nullable
as double,servingSize: null == servingSize ? _self.servingSize : servingSize // ignore: cast_nullable_to_non_nullable
as double,barcode: freezed == barcode ? _self.barcode : barcode // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$Supplement {

 int get id; String get name;@JsonKey(name: 'amount') String get amount;@JsonKey(name: 'unit') String get unit;@JsonKey(name: 'timeOfDay') String get timeOfDay;@JsonKey(name: 'daysOfWeek') String get daysOfWeek; bool get isActive;@JsonKey(name: 'stackId') int? get stackId; int get order;@JsonKey(name: 'dosage') String get dosage;@JsonKey(name: 'frequency') String get frequency;
/// Create a copy of Supplement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementCopyWith<Supplement> get copyWith => _$SupplementCopyWithImpl<Supplement>(this as Supplement, _$identity);

  /// Serializes this Supplement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Supplement&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.timeOfDay, timeOfDay) || other.timeOfDay == timeOfDay)&&(identical(other.daysOfWeek, daysOfWeek) || other.daysOfWeek == daysOfWeek)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.stackId, stackId) || other.stackId == stackId)&&(identical(other.order, order) || other.order == order)&&(identical(other.dosage, dosage) || other.dosage == dosage)&&(identical(other.frequency, frequency) || other.frequency == frequency));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,amount,unit,timeOfDay,daysOfWeek,isActive,stackId,order,dosage,frequency);

@override
String toString() {
  return 'Supplement(id: $id, name: $name, amount: $amount, unit: $unit, timeOfDay: $timeOfDay, daysOfWeek: $daysOfWeek, isActive: $isActive, stackId: $stackId, order: $order, dosage: $dosage, frequency: $frequency)';
}


}

/// @nodoc
abstract mixin class $SupplementCopyWith<$Res>  {
  factory $SupplementCopyWith(Supplement value, $Res Function(Supplement) _then) = _$SupplementCopyWithImpl;
@useResult
$Res call({
 int id, String name,@JsonKey(name: 'amount') String amount,@JsonKey(name: 'unit') String unit,@JsonKey(name: 'timeOfDay') String timeOfDay,@JsonKey(name: 'daysOfWeek') String daysOfWeek, bool isActive,@JsonKey(name: 'stackId') int? stackId, int order,@JsonKey(name: 'dosage') String dosage,@JsonKey(name: 'frequency') String frequency
});




}
/// @nodoc
class _$SupplementCopyWithImpl<$Res>
    implements $SupplementCopyWith<$Res> {
  _$SupplementCopyWithImpl(this._self, this._then);

  final Supplement _self;
  final $Res Function(Supplement) _then;

/// Create a copy of Supplement
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? amount = null,Object? unit = null,Object? timeOfDay = null,Object? daysOfWeek = null,Object? isActive = null,Object? stackId = freezed,Object? order = null,Object? dosage = null,Object? frequency = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as String,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,timeOfDay: null == timeOfDay ? _self.timeOfDay : timeOfDay // ignore: cast_nullable_to_non_nullable
as String,daysOfWeek: null == daysOfWeek ? _self.daysOfWeek : daysOfWeek // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,stackId: freezed == stackId ? _self.stackId : stackId // ignore: cast_nullable_to_non_nullable
as int?,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,dosage: null == dosage ? _self.dosage : dosage // ignore: cast_nullable_to_non_nullable
as String,frequency: null == frequency ? _self.frequency : frequency // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Supplement].
extension SupplementPatterns on Supplement {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Supplement value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Supplement value)  $default,){
final _that = this;
switch (_that) {
case _Supplement():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Supplement value)?  $default,){
final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name, @JsonKey(name: 'amount')  String amount, @JsonKey(name: 'unit')  String unit, @JsonKey(name: 'timeOfDay')  String timeOfDay, @JsonKey(name: 'daysOfWeek')  String daysOfWeek,  bool isActive, @JsonKey(name: 'stackId')  int? stackId,  int order, @JsonKey(name: 'dosage')  String dosage, @JsonKey(name: 'frequency')  String frequency)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that.id,_that.name,_that.amount,_that.unit,_that.timeOfDay,_that.daysOfWeek,_that.isActive,_that.stackId,_that.order,_that.dosage,_that.frequency);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name, @JsonKey(name: 'amount')  String amount, @JsonKey(name: 'unit')  String unit, @JsonKey(name: 'timeOfDay')  String timeOfDay, @JsonKey(name: 'daysOfWeek')  String daysOfWeek,  bool isActive, @JsonKey(name: 'stackId')  int? stackId,  int order, @JsonKey(name: 'dosage')  String dosage, @JsonKey(name: 'frequency')  String frequency)  $default,) {final _that = this;
switch (_that) {
case _Supplement():
return $default(_that.id,_that.name,_that.amount,_that.unit,_that.timeOfDay,_that.daysOfWeek,_that.isActive,_that.stackId,_that.order,_that.dosage,_that.frequency);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name, @JsonKey(name: 'amount')  String amount, @JsonKey(name: 'unit')  String unit, @JsonKey(name: 'timeOfDay')  String timeOfDay, @JsonKey(name: 'daysOfWeek')  String daysOfWeek,  bool isActive, @JsonKey(name: 'stackId')  int? stackId,  int order, @JsonKey(name: 'dosage')  String dosage, @JsonKey(name: 'frequency')  String frequency)?  $default,) {final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that.id,_that.name,_that.amount,_that.unit,_that.timeOfDay,_that.daysOfWeek,_that.isActive,_that.stackId,_that.order,_that.dosage,_that.frequency);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Supplement extends Supplement {
  const _Supplement({required this.id, required this.name, @JsonKey(name: 'amount') this.amount = '', @JsonKey(name: 'unit') this.unit = 'mg', @JsonKey(name: 'timeOfDay') this.timeOfDay = 'MORNING', @JsonKey(name: 'daysOfWeek') this.daysOfWeek = '[]', this.isActive = true, @JsonKey(name: 'stackId') this.stackId, this.order = 0, @JsonKey(name: 'dosage') this.dosage = '', @JsonKey(name: 'frequency') this.frequency = 'Daily'}): super._();
  factory _Supplement.fromJson(Map<String, dynamic> json) => _$SupplementFromJson(json);

@override final  int id;
@override final  String name;
@override@JsonKey(name: 'amount') final  String amount;
@override@JsonKey(name: 'unit') final  String unit;
@override@JsonKey(name: 'timeOfDay') final  String timeOfDay;
@override@JsonKey(name: 'daysOfWeek') final  String daysOfWeek;
@override@JsonKey() final  bool isActive;
@override@JsonKey(name: 'stackId') final  int? stackId;
@override@JsonKey() final  int order;
@override@JsonKey(name: 'dosage') final  String dosage;
@override@JsonKey(name: 'frequency') final  String frequency;

/// Create a copy of Supplement
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupplementCopyWith<_Supplement> get copyWith => __$SupplementCopyWithImpl<_Supplement>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupplementToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Supplement&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.timeOfDay, timeOfDay) || other.timeOfDay == timeOfDay)&&(identical(other.daysOfWeek, daysOfWeek) || other.daysOfWeek == daysOfWeek)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.stackId, stackId) || other.stackId == stackId)&&(identical(other.order, order) || other.order == order)&&(identical(other.dosage, dosage) || other.dosage == dosage)&&(identical(other.frequency, frequency) || other.frequency == frequency));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,amount,unit,timeOfDay,daysOfWeek,isActive,stackId,order,dosage,frequency);

@override
String toString() {
  return 'Supplement(id: $id, name: $name, amount: $amount, unit: $unit, timeOfDay: $timeOfDay, daysOfWeek: $daysOfWeek, isActive: $isActive, stackId: $stackId, order: $order, dosage: $dosage, frequency: $frequency)';
}


}

/// @nodoc
abstract mixin class _$SupplementCopyWith<$Res> implements $SupplementCopyWith<$Res> {
  factory _$SupplementCopyWith(_Supplement value, $Res Function(_Supplement) _then) = __$SupplementCopyWithImpl;
@override @useResult
$Res call({
 int id, String name,@JsonKey(name: 'amount') String amount,@JsonKey(name: 'unit') String unit,@JsonKey(name: 'timeOfDay') String timeOfDay,@JsonKey(name: 'daysOfWeek') String daysOfWeek, bool isActive,@JsonKey(name: 'stackId') int? stackId, int order,@JsonKey(name: 'dosage') String dosage,@JsonKey(name: 'frequency') String frequency
});




}
/// @nodoc
class __$SupplementCopyWithImpl<$Res>
    implements _$SupplementCopyWith<$Res> {
  __$SupplementCopyWithImpl(this._self, this._then);

  final _Supplement _self;
  final $Res Function(_Supplement) _then;

/// Create a copy of Supplement
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? amount = null,Object? unit = null,Object? timeOfDay = null,Object? daysOfWeek = null,Object? isActive = null,Object? stackId = freezed,Object? order = null,Object? dosage = null,Object? frequency = null,}) {
  return _then(_Supplement(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as String,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,timeOfDay: null == timeOfDay ? _self.timeOfDay : timeOfDay // ignore: cast_nullable_to_non_nullable
as String,daysOfWeek: null == daysOfWeek ? _self.daysOfWeek : daysOfWeek // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,stackId: freezed == stackId ? _self.stackId : stackId // ignore: cast_nullable_to_non_nullable
as int?,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,dosage: null == dosage ? _self.dosage : dosage // ignore: cast_nullable_to_non_nullable
as String,frequency: null == frequency ? _self.frequency : frequency // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SupplementStack {

 int get id; String get name; List<Supplement> get supplements; bool get isActive;
/// Create a copy of SupplementStack
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementStackCopyWith<SupplementStack> get copyWith => _$SupplementStackCopyWithImpl<SupplementStack>(this as SupplementStack, _$identity);

  /// Serializes this SupplementStack to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupplementStack&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other.supplements, supplements)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(supplements),isActive);

@override
String toString() {
  return 'SupplementStack(id: $id, name: $name, supplements: $supplements, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $SupplementStackCopyWith<$Res>  {
  factory $SupplementStackCopyWith(SupplementStack value, $Res Function(SupplementStack) _then) = _$SupplementStackCopyWithImpl;
@useResult
$Res call({
 int id, String name, List<Supplement> supplements, bool isActive
});




}
/// @nodoc
class _$SupplementStackCopyWithImpl<$Res>
    implements $SupplementStackCopyWith<$Res> {
  _$SupplementStackCopyWithImpl(this._self, this._then);

  final SupplementStack _self;
  final $Res Function(SupplementStack) _then;

/// Create a copy of SupplementStack
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? supplements = null,Object? isActive = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,supplements: null == supplements ? _self.supplements : supplements // ignore: cast_nullable_to_non_nullable
as List<Supplement>,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [SupplementStack].
extension SupplementStackPatterns on SupplementStack {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupplementStack value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupplementStack() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupplementStack value)  $default,){
final _that = this;
switch (_that) {
case _SupplementStack():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupplementStack value)?  $default,){
final _that = this;
switch (_that) {
case _SupplementStack() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name,  List<Supplement> supplements,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupplementStack() when $default != null:
return $default(_that.id,_that.name,_that.supplements,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name,  List<Supplement> supplements,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _SupplementStack():
return $default(_that.id,_that.name,_that.supplements,_that.isActive);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name,  List<Supplement> supplements,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _SupplementStack() when $default != null:
return $default(_that.id,_that.name,_that.supplements,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupplementStack extends SupplementStack {
  const _SupplementStack({required this.id, required this.name, required final  List<Supplement> supplements, required this.isActive}): _supplements = supplements,super._();
  factory _SupplementStack.fromJson(Map<String, dynamic> json) => _$SupplementStackFromJson(json);

@override final  int id;
@override final  String name;
 final  List<Supplement> _supplements;
@override List<Supplement> get supplements {
  if (_supplements is EqualUnmodifiableListView) return _supplements;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_supplements);
}

@override final  bool isActive;

/// Create a copy of SupplementStack
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupplementStackCopyWith<_SupplementStack> get copyWith => __$SupplementStackCopyWithImpl<_SupplementStack>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupplementStackToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupplementStack&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other._supplements, _supplements)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(_supplements),isActive);

@override
String toString() {
  return 'SupplementStack(id: $id, name: $name, supplements: $supplements, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$SupplementStackCopyWith<$Res> implements $SupplementStackCopyWith<$Res> {
  factory _$SupplementStackCopyWith(_SupplementStack value, $Res Function(_SupplementStack) _then) = __$SupplementStackCopyWithImpl;
@override @useResult
$Res call({
 int id, String name, List<Supplement> supplements, bool isActive
});




}
/// @nodoc
class __$SupplementStackCopyWithImpl<$Res>
    implements _$SupplementStackCopyWith<$Res> {
  __$SupplementStackCopyWithImpl(this._self, this._then);

  final _SupplementStack _self;
  final $Res Function(_SupplementStack) _then;

/// Create a copy of SupplementStack
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? supplements = null,Object? isActive = null,}) {
  return _then(_SupplementStack(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,supplements: null == supplements ? _self._supplements : supplements // ignore: cast_nullable_to_non_nullable
as List<Supplement>,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$DailyHealthLog {

 int get id; DateTime get date; int get steps; double? get weight; double get waterIntake; int get exerciseCalories; List<SupplementLog> get supplementLogs; List<FoodLogEntry> get foodLogs; DailyHealthMeta? get meta;
/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyHealthLogCopyWith<DailyHealthLog> get copyWith => _$DailyHealthLogCopyWithImpl<DailyHealthLog>(this as DailyHealthLog, _$identity);

  /// Serializes this DailyHealthLog to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyHealthLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.steps, steps) || other.steps == steps)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.waterIntake, waterIntake) || other.waterIntake == waterIntake)&&(identical(other.exerciseCalories, exerciseCalories) || other.exerciseCalories == exerciseCalories)&&const DeepCollectionEquality().equals(other.supplementLogs, supplementLogs)&&const DeepCollectionEquality().equals(other.foodLogs, foodLogs)&&(identical(other.meta, meta) || other.meta == meta));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,steps,weight,waterIntake,exerciseCalories,const DeepCollectionEquality().hash(supplementLogs),const DeepCollectionEquality().hash(foodLogs),meta);

@override
String toString() {
  return 'DailyHealthLog(id: $id, date: $date, steps: $steps, weight: $weight, waterIntake: $waterIntake, exerciseCalories: $exerciseCalories, supplementLogs: $supplementLogs, foodLogs: $foodLogs, meta: $meta)';
}


}

/// @nodoc
abstract mixin class $DailyHealthLogCopyWith<$Res>  {
  factory $DailyHealthLogCopyWith(DailyHealthLog value, $Res Function(DailyHealthLog) _then) = _$DailyHealthLogCopyWithImpl;
@useResult
$Res call({
 int id, DateTime date, int steps, double? weight, double waterIntake, int exerciseCalories, List<SupplementLog> supplementLogs, List<FoodLogEntry> foodLogs, DailyHealthMeta? meta
});


$DailyHealthMetaCopyWith<$Res>? get meta;

}
/// @nodoc
class _$DailyHealthLogCopyWithImpl<$Res>
    implements $DailyHealthLogCopyWith<$Res> {
  _$DailyHealthLogCopyWithImpl(this._self, this._then);

  final DailyHealthLog _self;
  final $Res Function(DailyHealthLog) _then;

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? date = null,Object? steps = null,Object? weight = freezed,Object? waterIntake = null,Object? exerciseCalories = null,Object? supplementLogs = null,Object? foodLogs = null,Object? meta = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as int,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,waterIntake: null == waterIntake ? _self.waterIntake : waterIntake // ignore: cast_nullable_to_non_nullable
as double,exerciseCalories: null == exerciseCalories ? _self.exerciseCalories : exerciseCalories // ignore: cast_nullable_to_non_nullable
as int,supplementLogs: null == supplementLogs ? _self.supplementLogs : supplementLogs // ignore: cast_nullable_to_non_nullable
as List<SupplementLog>,foodLogs: null == foodLogs ? _self.foodLogs : foodLogs // ignore: cast_nullable_to_non_nullable
as List<FoodLogEntry>,meta: freezed == meta ? _self.meta : meta // ignore: cast_nullable_to_non_nullable
as DailyHealthMeta?,
  ));
}
/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyHealthMetaCopyWith<$Res>? get meta {
    if (_self.meta == null) {
    return null;
  }

  return $DailyHealthMetaCopyWith<$Res>(_self.meta!, (value) {
    return _then(_self.copyWith(meta: value));
  });
}
}


/// Adds pattern-matching-related methods to [DailyHealthLog].
extension DailyHealthLogPatterns on DailyHealthLog {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyHealthLog value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyHealthLog value)  $default,){
final _that = this;
switch (_that) {
case _DailyHealthLog():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyHealthLog value)?  $default,){
final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  DateTime date,  int steps,  double? weight,  double waterIntake,  int exerciseCalories,  List<SupplementLog> supplementLogs,  List<FoodLogEntry> foodLogs,  DailyHealthMeta? meta)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that.id,_that.date,_that.steps,_that.weight,_that.waterIntake,_that.exerciseCalories,_that.supplementLogs,_that.foodLogs,_that.meta);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  DateTime date,  int steps,  double? weight,  double waterIntake,  int exerciseCalories,  List<SupplementLog> supplementLogs,  List<FoodLogEntry> foodLogs,  DailyHealthMeta? meta)  $default,) {final _that = this;
switch (_that) {
case _DailyHealthLog():
return $default(_that.id,_that.date,_that.steps,_that.weight,_that.waterIntake,_that.exerciseCalories,_that.supplementLogs,_that.foodLogs,_that.meta);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  DateTime date,  int steps,  double? weight,  double waterIntake,  int exerciseCalories,  List<SupplementLog> supplementLogs,  List<FoodLogEntry> foodLogs,  DailyHealthMeta? meta)?  $default,) {final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that.id,_that.date,_that.steps,_that.weight,_that.waterIntake,_that.exerciseCalories,_that.supplementLogs,_that.foodLogs,_that.meta);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyHealthLog extends DailyHealthLog {
  const _DailyHealthLog({required this.id, required this.date, this.steps = 0, this.weight, this.waterIntake = 0, this.exerciseCalories = 0, final  List<SupplementLog> supplementLogs = const [], final  List<FoodLogEntry> foodLogs = const [], this.meta}): _supplementLogs = supplementLogs,_foodLogs = foodLogs,super._();
  factory _DailyHealthLog.fromJson(Map<String, dynamic> json) => _$DailyHealthLogFromJson(json);

@override final  int id;
@override final  DateTime date;
@override@JsonKey() final  int steps;
@override final  double? weight;
@override@JsonKey() final  double waterIntake;
@override@JsonKey() final  int exerciseCalories;
 final  List<SupplementLog> _supplementLogs;
@override@JsonKey() List<SupplementLog> get supplementLogs {
  if (_supplementLogs is EqualUnmodifiableListView) return _supplementLogs;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_supplementLogs);
}

 final  List<FoodLogEntry> _foodLogs;
@override@JsonKey() List<FoodLogEntry> get foodLogs {
  if (_foodLogs is EqualUnmodifiableListView) return _foodLogs;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_foodLogs);
}

@override final  DailyHealthMeta? meta;

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyHealthLogCopyWith<_DailyHealthLog> get copyWith => __$DailyHealthLogCopyWithImpl<_DailyHealthLog>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyHealthLogToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyHealthLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.steps, steps) || other.steps == steps)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.waterIntake, waterIntake) || other.waterIntake == waterIntake)&&(identical(other.exerciseCalories, exerciseCalories) || other.exerciseCalories == exerciseCalories)&&const DeepCollectionEquality().equals(other._supplementLogs, _supplementLogs)&&const DeepCollectionEquality().equals(other._foodLogs, _foodLogs)&&(identical(other.meta, meta) || other.meta == meta));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,steps,weight,waterIntake,exerciseCalories,const DeepCollectionEquality().hash(_supplementLogs),const DeepCollectionEquality().hash(_foodLogs),meta);

@override
String toString() {
  return 'DailyHealthLog(id: $id, date: $date, steps: $steps, weight: $weight, waterIntake: $waterIntake, exerciseCalories: $exerciseCalories, supplementLogs: $supplementLogs, foodLogs: $foodLogs, meta: $meta)';
}


}

/// @nodoc
abstract mixin class _$DailyHealthLogCopyWith<$Res> implements $DailyHealthLogCopyWith<$Res> {
  factory _$DailyHealthLogCopyWith(_DailyHealthLog value, $Res Function(_DailyHealthLog) _then) = __$DailyHealthLogCopyWithImpl;
@override @useResult
$Res call({
 int id, DateTime date, int steps, double? weight, double waterIntake, int exerciseCalories, List<SupplementLog> supplementLogs, List<FoodLogEntry> foodLogs, DailyHealthMeta? meta
});


@override $DailyHealthMetaCopyWith<$Res>? get meta;

}
/// @nodoc
class __$DailyHealthLogCopyWithImpl<$Res>
    implements _$DailyHealthLogCopyWith<$Res> {
  __$DailyHealthLogCopyWithImpl(this._self, this._then);

  final _DailyHealthLog _self;
  final $Res Function(_DailyHealthLog) _then;

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? date = null,Object? steps = null,Object? weight = freezed,Object? waterIntake = null,Object? exerciseCalories = null,Object? supplementLogs = null,Object? foodLogs = null,Object? meta = freezed,}) {
  return _then(_DailyHealthLog(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as int,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,waterIntake: null == waterIntake ? _self.waterIntake : waterIntake // ignore: cast_nullable_to_non_nullable
as double,exerciseCalories: null == exerciseCalories ? _self.exerciseCalories : exerciseCalories // ignore: cast_nullable_to_non_nullable
as int,supplementLogs: null == supplementLogs ? _self._supplementLogs : supplementLogs // ignore: cast_nullable_to_non_nullable
as List<SupplementLog>,foodLogs: null == foodLogs ? _self._foodLogs : foodLogs // ignore: cast_nullable_to_non_nullable
as List<FoodLogEntry>,meta: freezed == meta ? _self.meta : meta // ignore: cast_nullable_to_non_nullable
as DailyHealthMeta?,
  ));
}

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DailyHealthMetaCopyWith<$Res>? get meta {
    if (_self.meta == null) {
    return null;
  }

  return $DailyHealthMetaCopyWith<$Res>(_self.meta!, (value) {
    return _then(_self.copyWith(meta: value));
  });
}
}


/// @nodoc
mixin _$SupplementLog {

 String get supplementId; DateTime get date; bool get taken;
/// Create a copy of SupplementLog
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementLogCopyWith<SupplementLog> get copyWith => _$SupplementLogCopyWithImpl<SupplementLog>(this as SupplementLog, _$identity);

  /// Serializes this SupplementLog to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupplementLog&&(identical(other.supplementId, supplementId) || other.supplementId == supplementId)&&(identical(other.date, date) || other.date == date)&&(identical(other.taken, taken) || other.taken == taken));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,supplementId,date,taken);

@override
String toString() {
  return 'SupplementLog(supplementId: $supplementId, date: $date, taken: $taken)';
}


}

/// @nodoc
abstract mixin class $SupplementLogCopyWith<$Res>  {
  factory $SupplementLogCopyWith(SupplementLog value, $Res Function(SupplementLog) _then) = _$SupplementLogCopyWithImpl;
@useResult
$Res call({
 String supplementId, DateTime date, bool taken
});




}
/// @nodoc
class _$SupplementLogCopyWithImpl<$Res>
    implements $SupplementLogCopyWith<$Res> {
  _$SupplementLogCopyWithImpl(this._self, this._then);

  final SupplementLog _self;
  final $Res Function(SupplementLog) _then;

/// Create a copy of SupplementLog
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? supplementId = null,Object? date = null,Object? taken = null,}) {
  return _then(_self.copyWith(
supplementId: null == supplementId ? _self.supplementId : supplementId // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,taken: null == taken ? _self.taken : taken // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [SupplementLog].
extension SupplementLogPatterns on SupplementLog {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupplementLog value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupplementLog() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupplementLog value)  $default,){
final _that = this;
switch (_that) {
case _SupplementLog():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupplementLog value)?  $default,){
final _that = this;
switch (_that) {
case _SupplementLog() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String supplementId,  DateTime date,  bool taken)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupplementLog() when $default != null:
return $default(_that.supplementId,_that.date,_that.taken);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String supplementId,  DateTime date,  bool taken)  $default,) {final _that = this;
switch (_that) {
case _SupplementLog():
return $default(_that.supplementId,_that.date,_that.taken);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String supplementId,  DateTime date,  bool taken)?  $default,) {final _that = this;
switch (_that) {
case _SupplementLog() when $default != null:
return $default(_that.supplementId,_that.date,_that.taken);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupplementLog extends SupplementLog {
  const _SupplementLog({required this.supplementId, required this.date, this.taken = false}): super._();
  factory _SupplementLog.fromJson(Map<String, dynamic> json) => _$SupplementLogFromJson(json);

@override final  String supplementId;
@override final  DateTime date;
@override@JsonKey() final  bool taken;

/// Create a copy of SupplementLog
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupplementLogCopyWith<_SupplementLog> get copyWith => __$SupplementLogCopyWithImpl<_SupplementLog>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupplementLogToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupplementLog&&(identical(other.supplementId, supplementId) || other.supplementId == supplementId)&&(identical(other.date, date) || other.date == date)&&(identical(other.taken, taken) || other.taken == taken));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,supplementId,date,taken);

@override
String toString() {
  return 'SupplementLog(supplementId: $supplementId, date: $date, taken: $taken)';
}


}

/// @nodoc
abstract mixin class _$SupplementLogCopyWith<$Res> implements $SupplementLogCopyWith<$Res> {
  factory _$SupplementLogCopyWith(_SupplementLog value, $Res Function(_SupplementLog) _then) = __$SupplementLogCopyWithImpl;
@override @useResult
$Res call({
 String supplementId, DateTime date, bool taken
});




}
/// @nodoc
class __$SupplementLogCopyWithImpl<$Res>
    implements _$SupplementLogCopyWith<$Res> {
  __$SupplementLogCopyWithImpl(this._self, this._then);

  final _SupplementLog _self;
  final $Res Function(_SupplementLog) _then;

/// Create a copy of SupplementLog
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? supplementId = null,Object? date = null,Object? taken = null,}) {
  return _then(_SupplementLog(
supplementId: null == supplementId ? _self.supplementId : supplementId // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,taken: null == taken ? _self.taken : taken // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$FoodLogEntry {

 String get id; String get mealType; String get name; double? get quantity; double? get calories; double? get protein; double? get carbs; double? get fats; String? get foodItemId;
/// Create a copy of FoodLogEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FoodLogEntryCopyWith<FoodLogEntry> get copyWith => _$FoodLogEntryCopyWithImpl<FoodLogEntry>(this as FoodLogEntry, _$identity);

  /// Serializes this FoodLogEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FoodLogEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.mealType, mealType) || other.mealType == mealType)&&(identical(other.name, name) || other.name == name)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fats, fats) || other.fats == fats)&&(identical(other.foodItemId, foodItemId) || other.foodItemId == foodItemId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,mealType,name,quantity,calories,protein,carbs,fats,foodItemId);

@override
String toString() {
  return 'FoodLogEntry(id: $id, mealType: $mealType, name: $name, quantity: $quantity, calories: $calories, protein: $protein, carbs: $carbs, fats: $fats, foodItemId: $foodItemId)';
}


}

/// @nodoc
abstract mixin class $FoodLogEntryCopyWith<$Res>  {
  factory $FoodLogEntryCopyWith(FoodLogEntry value, $Res Function(FoodLogEntry) _then) = _$FoodLogEntryCopyWithImpl;
@useResult
$Res call({
 String id, String mealType, String name, double? quantity, double? calories, double? protein, double? carbs, double? fats, String? foodItemId
});




}
/// @nodoc
class _$FoodLogEntryCopyWithImpl<$Res>
    implements $FoodLogEntryCopyWith<$Res> {
  _$FoodLogEntryCopyWithImpl(this._self, this._then);

  final FoodLogEntry _self;
  final $Res Function(FoodLogEntry) _then;

/// Create a copy of FoodLogEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? mealType = null,Object? name = null,Object? quantity = freezed,Object? calories = freezed,Object? protein = freezed,Object? carbs = freezed,Object? fats = freezed,Object? foodItemId = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,mealType: null == mealType ? _self.mealType : mealType // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,quantity: freezed == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as double?,calories: freezed == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double?,protein: freezed == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double?,carbs: freezed == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double?,fats: freezed == fats ? _self.fats : fats // ignore: cast_nullable_to_non_nullable
as double?,foodItemId: freezed == foodItemId ? _self.foodItemId : foodItemId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [FoodLogEntry].
extension FoodLogEntryPatterns on FoodLogEntry {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FoodLogEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FoodLogEntry() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FoodLogEntry value)  $default,){
final _that = this;
switch (_that) {
case _FoodLogEntry():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FoodLogEntry value)?  $default,){
final _that = this;
switch (_that) {
case _FoodLogEntry() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String mealType,  String name,  double? quantity,  double? calories,  double? protein,  double? carbs,  double? fats,  String? foodItemId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FoodLogEntry() when $default != null:
return $default(_that.id,_that.mealType,_that.name,_that.quantity,_that.calories,_that.protein,_that.carbs,_that.fats,_that.foodItemId);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String mealType,  String name,  double? quantity,  double? calories,  double? protein,  double? carbs,  double? fats,  String? foodItemId)  $default,) {final _that = this;
switch (_that) {
case _FoodLogEntry():
return $default(_that.id,_that.mealType,_that.name,_that.quantity,_that.calories,_that.protein,_that.carbs,_that.fats,_that.foodItemId);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String mealType,  String name,  double? quantity,  double? calories,  double? protein,  double? carbs,  double? fats,  String? foodItemId)?  $default,) {final _that = this;
switch (_that) {
case _FoodLogEntry() when $default != null:
return $default(_that.id,_that.mealType,_that.name,_that.quantity,_that.calories,_that.protein,_that.carbs,_that.fats,_that.foodItemId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FoodLogEntry extends FoodLogEntry {
  const _FoodLogEntry({this.id = '', required this.mealType, required this.name, this.quantity, this.calories, this.protein, this.carbs, this.fats, this.foodItemId}): super._();
  factory _FoodLogEntry.fromJson(Map<String, dynamic> json) => _$FoodLogEntryFromJson(json);

@override@JsonKey() final  String id;
@override final  String mealType;
@override final  String name;
@override final  double? quantity;
@override final  double? calories;
@override final  double? protein;
@override final  double? carbs;
@override final  double? fats;
@override final  String? foodItemId;

/// Create a copy of FoodLogEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FoodLogEntryCopyWith<_FoodLogEntry> get copyWith => __$FoodLogEntryCopyWithImpl<_FoodLogEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FoodLogEntryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FoodLogEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.mealType, mealType) || other.mealType == mealType)&&(identical(other.name, name) || other.name == name)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fats, fats) || other.fats == fats)&&(identical(other.foodItemId, foodItemId) || other.foodItemId == foodItemId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,mealType,name,quantity,calories,protein,carbs,fats,foodItemId);

@override
String toString() {
  return 'FoodLogEntry(id: $id, mealType: $mealType, name: $name, quantity: $quantity, calories: $calories, protein: $protein, carbs: $carbs, fats: $fats, foodItemId: $foodItemId)';
}


}

/// @nodoc
abstract mixin class _$FoodLogEntryCopyWith<$Res> implements $FoodLogEntryCopyWith<$Res> {
  factory _$FoodLogEntryCopyWith(_FoodLogEntry value, $Res Function(_FoodLogEntry) _then) = __$FoodLogEntryCopyWithImpl;
@override @useResult
$Res call({
 String id, String mealType, String name, double? quantity, double? calories, double? protein, double? carbs, double? fats, String? foodItemId
});




}
/// @nodoc
class __$FoodLogEntryCopyWithImpl<$Res>
    implements _$FoodLogEntryCopyWith<$Res> {
  __$FoodLogEntryCopyWithImpl(this._self, this._then);

  final _FoodLogEntry _self;
  final $Res Function(_FoodLogEntry) _then;

/// Create a copy of FoodLogEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? mealType = null,Object? name = null,Object? quantity = freezed,Object? calories = freezed,Object? protein = freezed,Object? carbs = freezed,Object? fats = freezed,Object? foodItemId = freezed,}) {
  return _then(_FoodLogEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,mealType: null == mealType ? _self.mealType : mealType // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,quantity: freezed == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as double?,calories: freezed == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double?,protein: freezed == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double?,carbs: freezed == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double?,fats: freezed == fats ? _self.fats : fats // ignore: cast_nullable_to_non_nullable
as double?,foodItemId: freezed == foodItemId ? _self.foodItemId : foodItemId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$DailyHealthMeta {

 bool get hasStepHistory;
/// Create a copy of DailyHealthMeta
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyHealthMetaCopyWith<DailyHealthMeta> get copyWith => _$DailyHealthMetaCopyWithImpl<DailyHealthMeta>(this as DailyHealthMeta, _$identity);

  /// Serializes this DailyHealthMeta to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyHealthMeta&&(identical(other.hasStepHistory, hasStepHistory) || other.hasStepHistory == hasStepHistory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hasStepHistory);

@override
String toString() {
  return 'DailyHealthMeta(hasStepHistory: $hasStepHistory)';
}


}

/// @nodoc
abstract mixin class $DailyHealthMetaCopyWith<$Res>  {
  factory $DailyHealthMetaCopyWith(DailyHealthMeta value, $Res Function(DailyHealthMeta) _then) = _$DailyHealthMetaCopyWithImpl;
@useResult
$Res call({
 bool hasStepHistory
});




}
/// @nodoc
class _$DailyHealthMetaCopyWithImpl<$Res>
    implements $DailyHealthMetaCopyWith<$Res> {
  _$DailyHealthMetaCopyWithImpl(this._self, this._then);

  final DailyHealthMeta _self;
  final $Res Function(DailyHealthMeta) _then;

/// Create a copy of DailyHealthMeta
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? hasStepHistory = null,}) {
  return _then(_self.copyWith(
hasStepHistory: null == hasStepHistory ? _self.hasStepHistory : hasStepHistory // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [DailyHealthMeta].
extension DailyHealthMetaPatterns on DailyHealthMeta {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyHealthMeta value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyHealthMeta() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyHealthMeta value)  $default,){
final _that = this;
switch (_that) {
case _DailyHealthMeta():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyHealthMeta value)?  $default,){
final _that = this;
switch (_that) {
case _DailyHealthMeta() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool hasStepHistory)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyHealthMeta() when $default != null:
return $default(_that.hasStepHistory);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool hasStepHistory)  $default,) {final _that = this;
switch (_that) {
case _DailyHealthMeta():
return $default(_that.hasStepHistory);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool hasStepHistory)?  $default,) {final _that = this;
switch (_that) {
case _DailyHealthMeta() when $default != null:
return $default(_that.hasStepHistory);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyHealthMeta extends DailyHealthMeta {
  const _DailyHealthMeta({this.hasStepHistory = false}): super._();
  factory _DailyHealthMeta.fromJson(Map<String, dynamic> json) => _$DailyHealthMetaFromJson(json);

@override@JsonKey() final  bool hasStepHistory;

/// Create a copy of DailyHealthMeta
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyHealthMetaCopyWith<_DailyHealthMeta> get copyWith => __$DailyHealthMetaCopyWithImpl<_DailyHealthMeta>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyHealthMetaToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyHealthMeta&&(identical(other.hasStepHistory, hasStepHistory) || other.hasStepHistory == hasStepHistory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,hasStepHistory);

@override
String toString() {
  return 'DailyHealthMeta(hasStepHistory: $hasStepHistory)';
}


}

/// @nodoc
abstract mixin class _$DailyHealthMetaCopyWith<$Res> implements $DailyHealthMetaCopyWith<$Res> {
  factory _$DailyHealthMetaCopyWith(_DailyHealthMeta value, $Res Function(_DailyHealthMeta) _then) = __$DailyHealthMetaCopyWithImpl;
@override @useResult
$Res call({
 bool hasStepHistory
});




}
/// @nodoc
class __$DailyHealthMetaCopyWithImpl<$Res>
    implements _$DailyHealthMetaCopyWith<$Res> {
  __$DailyHealthMetaCopyWithImpl(this._self, this._then);

  final _DailyHealthMeta _self;
  final $Res Function(_DailyHealthMeta) _then;

/// Create a copy of DailyHealthMeta
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? hasStepHistory = null,}) {
  return _then(_DailyHealthMeta(
hasStepHistory: null == hasStepHistory ? _self.hasStepHistory : hasStepHistory // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$FastingSession {

 int get id; DateTime get startTime; DateTime? get endTime; int get duration; bool get isActive;
/// Create a copy of FastingSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FastingSessionCopyWith<FastingSession> get copyWith => _$FastingSessionCopyWithImpl<FastingSession>(this as FastingSession, _$identity);

  /// Serializes this FastingSession to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FastingSession&&(identical(other.id, id) || other.id == id)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.duration, duration) || other.duration == duration)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,startTime,endTime,duration,isActive);

@override
String toString() {
  return 'FastingSession(id: $id, startTime: $startTime, endTime: $endTime, duration: $duration, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $FastingSessionCopyWith<$Res>  {
  factory $FastingSessionCopyWith(FastingSession value, $Res Function(FastingSession) _then) = _$FastingSessionCopyWithImpl;
@useResult
$Res call({
 int id, DateTime startTime, DateTime? endTime, int duration, bool isActive
});




}
/// @nodoc
class _$FastingSessionCopyWithImpl<$Res>
    implements $FastingSessionCopyWith<$Res> {
  _$FastingSessionCopyWithImpl(this._self, this._then);

  final FastingSession _self;
  final $Res Function(FastingSession) _then;

/// Create a copy of FastingSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? startTime = null,Object? endTime = freezed,Object? duration = null,Object? isActive = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime?,duration: null == duration ? _self.duration : duration // ignore: cast_nullable_to_non_nullable
as int,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [FastingSession].
extension FastingSessionPatterns on FastingSession {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FastingSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FastingSession() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FastingSession value)  $default,){
final _that = this;
switch (_that) {
case _FastingSession():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FastingSession value)?  $default,){
final _that = this;
switch (_that) {
case _FastingSession() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  DateTime startTime,  DateTime? endTime,  int duration,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FastingSession() when $default != null:
return $default(_that.id,_that.startTime,_that.endTime,_that.duration,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  DateTime startTime,  DateTime? endTime,  int duration,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _FastingSession():
return $default(_that.id,_that.startTime,_that.endTime,_that.duration,_that.isActive);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  DateTime startTime,  DateTime? endTime,  int duration,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _FastingSession() when $default != null:
return $default(_that.id,_that.startTime,_that.endTime,_that.duration,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FastingSession extends FastingSession {
  const _FastingSession({required this.id, required this.startTime, this.endTime, required this.duration, required this.isActive}): super._();
  factory _FastingSession.fromJson(Map<String, dynamic> json) => _$FastingSessionFromJson(json);

@override final  int id;
@override final  DateTime startTime;
@override final  DateTime? endTime;
@override final  int duration;
@override final  bool isActive;

/// Create a copy of FastingSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FastingSessionCopyWith<_FastingSession> get copyWith => __$FastingSessionCopyWithImpl<_FastingSession>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FastingSessionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FastingSession&&(identical(other.id, id) || other.id == id)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.duration, duration) || other.duration == duration)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,startTime,endTime,duration,isActive);

@override
String toString() {
  return 'FastingSession(id: $id, startTime: $startTime, endTime: $endTime, duration: $duration, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$FastingSessionCopyWith<$Res> implements $FastingSessionCopyWith<$Res> {
  factory _$FastingSessionCopyWith(_FastingSession value, $Res Function(_FastingSession) _then) = __$FastingSessionCopyWithImpl;
@override @useResult
$Res call({
 int id, DateTime startTime, DateTime? endTime, int duration, bool isActive
});




}
/// @nodoc
class __$FastingSessionCopyWithImpl<$Res>
    implements _$FastingSessionCopyWith<$Res> {
  __$FastingSessionCopyWithImpl(this._self, this._then);

  final _FastingSession _self;
  final $Res Function(_FastingSession) _then;

/// Create a copy of FastingSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? startTime = null,Object? endTime = freezed,Object? duration = null,Object? isActive = null,}) {
  return _then(_FastingSession(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,startTime: null == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as DateTime,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as DateTime?,duration: null == duration ? _self.duration : duration // ignore: cast_nullable_to_non_nullable
as int,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$BodyMeasurement {

 int get id; DateTime get date; double get weight; double get bodyFat; double? get chest; double? get waist; double? get hips; String? get notes;
/// Create a copy of BodyMeasurement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BodyMeasurementCopyWith<BodyMeasurement> get copyWith => _$BodyMeasurementCopyWithImpl<BodyMeasurement>(this as BodyMeasurement, _$identity);

  /// Serializes this BodyMeasurement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BodyMeasurement&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.bodyFat, bodyFat) || other.bodyFat == bodyFat)&&(identical(other.chest, chest) || other.chest == chest)&&(identical(other.waist, waist) || other.waist == waist)&&(identical(other.hips, hips) || other.hips == hips)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,weight,bodyFat,chest,waist,hips,notes);

@override
String toString() {
  return 'BodyMeasurement(id: $id, date: $date, weight: $weight, bodyFat: $bodyFat, chest: $chest, waist: $waist, hips: $hips, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $BodyMeasurementCopyWith<$Res>  {
  factory $BodyMeasurementCopyWith(BodyMeasurement value, $Res Function(BodyMeasurement) _then) = _$BodyMeasurementCopyWithImpl;
@useResult
$Res call({
 int id, DateTime date, double weight, double bodyFat, double? chest, double? waist, double? hips, String? notes
});




}
/// @nodoc
class _$BodyMeasurementCopyWithImpl<$Res>
    implements $BodyMeasurementCopyWith<$Res> {
  _$BodyMeasurementCopyWithImpl(this._self, this._then);

  final BodyMeasurement _self;
  final $Res Function(BodyMeasurement) _then;

/// Create a copy of BodyMeasurement
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? date = null,Object? weight = null,Object? bodyFat = null,Object? chest = freezed,Object? waist = freezed,Object? hips = freezed,Object? notes = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,bodyFat: null == bodyFat ? _self.bodyFat : bodyFat // ignore: cast_nullable_to_non_nullable
as double,chest: freezed == chest ? _self.chest : chest // ignore: cast_nullable_to_non_nullable
as double?,waist: freezed == waist ? _self.waist : waist // ignore: cast_nullable_to_non_nullable
as double?,hips: freezed == hips ? _self.hips : hips // ignore: cast_nullable_to_non_nullable
as double?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [BodyMeasurement].
extension BodyMeasurementPatterns on BodyMeasurement {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BodyMeasurement value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BodyMeasurement() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BodyMeasurement value)  $default,){
final _that = this;
switch (_that) {
case _BodyMeasurement():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BodyMeasurement value)?  $default,){
final _that = this;
switch (_that) {
case _BodyMeasurement() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  DateTime date,  double weight,  double bodyFat,  double? chest,  double? waist,  double? hips,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BodyMeasurement() when $default != null:
return $default(_that.id,_that.date,_that.weight,_that.bodyFat,_that.chest,_that.waist,_that.hips,_that.notes);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  DateTime date,  double weight,  double bodyFat,  double? chest,  double? waist,  double? hips,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _BodyMeasurement():
return $default(_that.id,_that.date,_that.weight,_that.bodyFat,_that.chest,_that.waist,_that.hips,_that.notes);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  DateTime date,  double weight,  double bodyFat,  double? chest,  double? waist,  double? hips,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _BodyMeasurement() when $default != null:
return $default(_that.id,_that.date,_that.weight,_that.bodyFat,_that.chest,_that.waist,_that.hips,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BodyMeasurement extends BodyMeasurement {
  const _BodyMeasurement({required this.id, required this.date, required this.weight, required this.bodyFat, this.chest, this.waist, this.hips, this.notes}): super._();
  factory _BodyMeasurement.fromJson(Map<String, dynamic> json) => _$BodyMeasurementFromJson(json);

@override final  int id;
@override final  DateTime date;
@override final  double weight;
@override final  double bodyFat;
@override final  double? chest;
@override final  double? waist;
@override final  double? hips;
@override final  String? notes;

/// Create a copy of BodyMeasurement
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BodyMeasurementCopyWith<_BodyMeasurement> get copyWith => __$BodyMeasurementCopyWithImpl<_BodyMeasurement>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BodyMeasurementToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BodyMeasurement&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.bodyFat, bodyFat) || other.bodyFat == bodyFat)&&(identical(other.chest, chest) || other.chest == chest)&&(identical(other.waist, waist) || other.waist == waist)&&(identical(other.hips, hips) || other.hips == hips)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,weight,bodyFat,chest,waist,hips,notes);

@override
String toString() {
  return 'BodyMeasurement(id: $id, date: $date, weight: $weight, bodyFat: $bodyFat, chest: $chest, waist: $waist, hips: $hips, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$BodyMeasurementCopyWith<$Res> implements $BodyMeasurementCopyWith<$Res> {
  factory _$BodyMeasurementCopyWith(_BodyMeasurement value, $Res Function(_BodyMeasurement) _then) = __$BodyMeasurementCopyWithImpl;
@override @useResult
$Res call({
 int id, DateTime date, double weight, double bodyFat, double? chest, double? waist, double? hips, String? notes
});




}
/// @nodoc
class __$BodyMeasurementCopyWithImpl<$Res>
    implements _$BodyMeasurementCopyWith<$Res> {
  __$BodyMeasurementCopyWithImpl(this._self, this._then);

  final _BodyMeasurement _self;
  final $Res Function(_BodyMeasurement) _then;

/// Create a copy of BodyMeasurement
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? date = null,Object? weight = null,Object? bodyFat = null,Object? chest = freezed,Object? waist = freezed,Object? hips = freezed,Object? notes = freezed,}) {
  return _then(_BodyMeasurement(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,bodyFat: null == bodyFat ? _self.bodyFat : bodyFat // ignore: cast_nullable_to_non_nullable
as double,chest: freezed == chest ? _self.chest : chest // ignore: cast_nullable_to_non_nullable
as double?,waist: freezed == waist ? _self.waist : waist // ignore: cast_nullable_to_non_nullable
as double?,hips: freezed == hips ? _self.hips : hips // ignore: cast_nullable_to_non_nullable
as double?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$NutritionAnalytics {

 double get macroAdherenceScore; List<DailyNutrition> get dailyData; List<MicronutrientSummary> get micronutrients;
/// Create a copy of NutritionAnalytics
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NutritionAnalyticsCopyWith<NutritionAnalytics> get copyWith => _$NutritionAnalyticsCopyWithImpl<NutritionAnalytics>(this as NutritionAnalytics, _$identity);

  /// Serializes this NutritionAnalytics to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NutritionAnalytics&&(identical(other.macroAdherenceScore, macroAdherenceScore) || other.macroAdherenceScore == macroAdherenceScore)&&const DeepCollectionEquality().equals(other.dailyData, dailyData)&&const DeepCollectionEquality().equals(other.micronutrients, micronutrients));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,macroAdherenceScore,const DeepCollectionEquality().hash(dailyData),const DeepCollectionEquality().hash(micronutrients));

@override
String toString() {
  return 'NutritionAnalytics(macroAdherenceScore: $macroAdherenceScore, dailyData: $dailyData, micronutrients: $micronutrients)';
}


}

/// @nodoc
abstract mixin class $NutritionAnalyticsCopyWith<$Res>  {
  factory $NutritionAnalyticsCopyWith(NutritionAnalytics value, $Res Function(NutritionAnalytics) _then) = _$NutritionAnalyticsCopyWithImpl;
@useResult
$Res call({
 double macroAdherenceScore, List<DailyNutrition> dailyData, List<MicronutrientSummary> micronutrients
});




}
/// @nodoc
class _$NutritionAnalyticsCopyWithImpl<$Res>
    implements $NutritionAnalyticsCopyWith<$Res> {
  _$NutritionAnalyticsCopyWithImpl(this._self, this._then);

  final NutritionAnalytics _self;
  final $Res Function(NutritionAnalytics) _then;

/// Create a copy of NutritionAnalytics
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? macroAdherenceScore = null,Object? dailyData = null,Object? micronutrients = null,}) {
  return _then(_self.copyWith(
macroAdherenceScore: null == macroAdherenceScore ? _self.macroAdherenceScore : macroAdherenceScore // ignore: cast_nullable_to_non_nullable
as double,dailyData: null == dailyData ? _self.dailyData : dailyData // ignore: cast_nullable_to_non_nullable
as List<DailyNutrition>,micronutrients: null == micronutrients ? _self.micronutrients : micronutrients // ignore: cast_nullable_to_non_nullable
as List<MicronutrientSummary>,
  ));
}

}


/// Adds pattern-matching-related methods to [NutritionAnalytics].
extension NutritionAnalyticsPatterns on NutritionAnalytics {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NutritionAnalytics value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NutritionAnalytics() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NutritionAnalytics value)  $default,){
final _that = this;
switch (_that) {
case _NutritionAnalytics():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NutritionAnalytics value)?  $default,){
final _that = this;
switch (_that) {
case _NutritionAnalytics() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double macroAdherenceScore,  List<DailyNutrition> dailyData,  List<MicronutrientSummary> micronutrients)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NutritionAnalytics() when $default != null:
return $default(_that.macroAdherenceScore,_that.dailyData,_that.micronutrients);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double macroAdherenceScore,  List<DailyNutrition> dailyData,  List<MicronutrientSummary> micronutrients)  $default,) {final _that = this;
switch (_that) {
case _NutritionAnalytics():
return $default(_that.macroAdherenceScore,_that.dailyData,_that.micronutrients);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double macroAdherenceScore,  List<DailyNutrition> dailyData,  List<MicronutrientSummary> micronutrients)?  $default,) {final _that = this;
switch (_that) {
case _NutritionAnalytics() when $default != null:
return $default(_that.macroAdherenceScore,_that.dailyData,_that.micronutrients);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NutritionAnalytics extends NutritionAnalytics {
  const _NutritionAnalytics({this.macroAdherenceScore = 0, final  List<DailyNutrition> dailyData = const [], final  List<MicronutrientSummary> micronutrients = const []}): _dailyData = dailyData,_micronutrients = micronutrients,super._();
  factory _NutritionAnalytics.fromJson(Map<String, dynamic> json) => _$NutritionAnalyticsFromJson(json);

@override@JsonKey() final  double macroAdherenceScore;
 final  List<DailyNutrition> _dailyData;
@override@JsonKey() List<DailyNutrition> get dailyData {
  if (_dailyData is EqualUnmodifiableListView) return _dailyData;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_dailyData);
}

 final  List<MicronutrientSummary> _micronutrients;
@override@JsonKey() List<MicronutrientSummary> get micronutrients {
  if (_micronutrients is EqualUnmodifiableListView) return _micronutrients;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_micronutrients);
}


/// Create a copy of NutritionAnalytics
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NutritionAnalyticsCopyWith<_NutritionAnalytics> get copyWith => __$NutritionAnalyticsCopyWithImpl<_NutritionAnalytics>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NutritionAnalyticsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NutritionAnalytics&&(identical(other.macroAdherenceScore, macroAdherenceScore) || other.macroAdherenceScore == macroAdherenceScore)&&const DeepCollectionEquality().equals(other._dailyData, _dailyData)&&const DeepCollectionEquality().equals(other._micronutrients, _micronutrients));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,macroAdherenceScore,const DeepCollectionEquality().hash(_dailyData),const DeepCollectionEquality().hash(_micronutrients));

@override
String toString() {
  return 'NutritionAnalytics(macroAdherenceScore: $macroAdherenceScore, dailyData: $dailyData, micronutrients: $micronutrients)';
}


}

/// @nodoc
abstract mixin class _$NutritionAnalyticsCopyWith<$Res> implements $NutritionAnalyticsCopyWith<$Res> {
  factory _$NutritionAnalyticsCopyWith(_NutritionAnalytics value, $Res Function(_NutritionAnalytics) _then) = __$NutritionAnalyticsCopyWithImpl;
@override @useResult
$Res call({
 double macroAdherenceScore, List<DailyNutrition> dailyData, List<MicronutrientSummary> micronutrients
});




}
/// @nodoc
class __$NutritionAnalyticsCopyWithImpl<$Res>
    implements _$NutritionAnalyticsCopyWith<$Res> {
  __$NutritionAnalyticsCopyWithImpl(this._self, this._then);

  final _NutritionAnalytics _self;
  final $Res Function(_NutritionAnalytics) _then;

/// Create a copy of NutritionAnalytics
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? macroAdherenceScore = null,Object? dailyData = null,Object? micronutrients = null,}) {
  return _then(_NutritionAnalytics(
macroAdherenceScore: null == macroAdherenceScore ? _self.macroAdherenceScore : macroAdherenceScore // ignore: cast_nullable_to_non_nullable
as double,dailyData: null == dailyData ? _self._dailyData : dailyData // ignore: cast_nullable_to_non_nullable
as List<DailyNutrition>,micronutrients: null == micronutrients ? _self._micronutrients : micronutrients // ignore: cast_nullable_to_non_nullable
as List<MicronutrientSummary>,
  ));
}


}


/// @nodoc
mixin _$DailyNutrition {

 DateTime get date; double get calories; double get protein; double get carbs; double get fats;
/// Create a copy of DailyNutrition
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyNutritionCopyWith<DailyNutrition> get copyWith => _$DailyNutritionCopyWithImpl<DailyNutrition>(this as DailyNutrition, _$identity);

  /// Serializes this DailyNutrition to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyNutrition&&(identical(other.date, date) || other.date == date)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fats, fats) || other.fats == fats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,calories,protein,carbs,fats);

@override
String toString() {
  return 'DailyNutrition(date: $date, calories: $calories, protein: $protein, carbs: $carbs, fats: $fats)';
}


}

/// @nodoc
abstract mixin class $DailyNutritionCopyWith<$Res>  {
  factory $DailyNutritionCopyWith(DailyNutrition value, $Res Function(DailyNutrition) _then) = _$DailyNutritionCopyWithImpl;
@useResult
$Res call({
 DateTime date, double calories, double protein, double carbs, double fats
});




}
/// @nodoc
class _$DailyNutritionCopyWithImpl<$Res>
    implements $DailyNutritionCopyWith<$Res> {
  _$DailyNutritionCopyWithImpl(this._self, this._then);

  final DailyNutrition _self;
  final $Res Function(DailyNutrition) _then;

/// Create a copy of DailyNutrition
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fats = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fats: null == fats ? _self.fats : fats // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [DailyNutrition].
extension DailyNutritionPatterns on DailyNutrition {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyNutrition value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyNutrition() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyNutrition value)  $default,){
final _that = this;
switch (_that) {
case _DailyNutrition():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyNutrition value)?  $default,){
final _that = this;
switch (_that) {
case _DailyNutrition() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DateTime date,  double calories,  double protein,  double carbs,  double fats)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyNutrition() when $default != null:
return $default(_that.date,_that.calories,_that.protein,_that.carbs,_that.fats);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DateTime date,  double calories,  double protein,  double carbs,  double fats)  $default,) {final _that = this;
switch (_that) {
case _DailyNutrition():
return $default(_that.date,_that.calories,_that.protein,_that.carbs,_that.fats);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DateTime date,  double calories,  double protein,  double carbs,  double fats)?  $default,) {final _that = this;
switch (_that) {
case _DailyNutrition() when $default != null:
return $default(_that.date,_that.calories,_that.protein,_that.carbs,_that.fats);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyNutrition extends DailyNutrition {
  const _DailyNutrition({required this.date, this.calories = 0, this.protein = 0, this.carbs = 0, this.fats = 0}): super._();
  factory _DailyNutrition.fromJson(Map<String, dynamic> json) => _$DailyNutritionFromJson(json);

@override final  DateTime date;
@override@JsonKey() final  double calories;
@override@JsonKey() final  double protein;
@override@JsonKey() final  double carbs;
@override@JsonKey() final  double fats;

/// Create a copy of DailyNutrition
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyNutritionCopyWith<_DailyNutrition> get copyWith => __$DailyNutritionCopyWithImpl<_DailyNutrition>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DailyNutritionToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyNutrition&&(identical(other.date, date) || other.date == date)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.protein, protein) || other.protein == protein)&&(identical(other.carbs, carbs) || other.carbs == carbs)&&(identical(other.fats, fats) || other.fats == fats));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,calories,protein,carbs,fats);

@override
String toString() {
  return 'DailyNutrition(date: $date, calories: $calories, protein: $protein, carbs: $carbs, fats: $fats)';
}


}

/// @nodoc
abstract mixin class _$DailyNutritionCopyWith<$Res> implements $DailyNutritionCopyWith<$Res> {
  factory _$DailyNutritionCopyWith(_DailyNutrition value, $Res Function(_DailyNutrition) _then) = __$DailyNutritionCopyWithImpl;
@override @useResult
$Res call({
 DateTime date, double calories, double protein, double carbs, double fats
});




}
/// @nodoc
class __$DailyNutritionCopyWithImpl<$Res>
    implements _$DailyNutritionCopyWith<$Res> {
  __$DailyNutritionCopyWithImpl(this._self, this._then);

  final _DailyNutrition _self;
  final $Res Function(_DailyNutrition) _then;

/// Create a copy of DailyNutrition
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? calories = null,Object? protein = null,Object? carbs = null,Object? fats = null,}) {
  return _then(_DailyNutrition(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,calories: null == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double,protein: null == protein ? _self.protein : protein // ignore: cast_nullable_to_non_nullable
as double,carbs: null == carbs ? _self.carbs : carbs // ignore: cast_nullable_to_non_nullable
as double,fats: null == fats ? _self.fats : fats // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$MicronutrientSummary {

 String get name; double get amount; String get unit; double get dailyValuePercent;
/// Create a copy of MicronutrientSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MicronutrientSummaryCopyWith<MicronutrientSummary> get copyWith => _$MicronutrientSummaryCopyWithImpl<MicronutrientSummary>(this as MicronutrientSummary, _$identity);

  /// Serializes this MicronutrientSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MicronutrientSummary&&(identical(other.name, name) || other.name == name)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.dailyValuePercent, dailyValuePercent) || other.dailyValuePercent == dailyValuePercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,amount,unit,dailyValuePercent);

@override
String toString() {
  return 'MicronutrientSummary(name: $name, amount: $amount, unit: $unit, dailyValuePercent: $dailyValuePercent)';
}


}

/// @nodoc
abstract mixin class $MicronutrientSummaryCopyWith<$Res>  {
  factory $MicronutrientSummaryCopyWith(MicronutrientSummary value, $Res Function(MicronutrientSummary) _then) = _$MicronutrientSummaryCopyWithImpl;
@useResult
$Res call({
 String name, double amount, String unit, double dailyValuePercent
});




}
/// @nodoc
class _$MicronutrientSummaryCopyWithImpl<$Res>
    implements $MicronutrientSummaryCopyWith<$Res> {
  _$MicronutrientSummaryCopyWithImpl(this._self, this._then);

  final MicronutrientSummary _self;
  final $Res Function(MicronutrientSummary) _then;

/// Create a copy of MicronutrientSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? amount = null,Object? unit = null,Object? dailyValuePercent = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,dailyValuePercent: null == dailyValuePercent ? _self.dailyValuePercent : dailyValuePercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [MicronutrientSummary].
extension MicronutrientSummaryPatterns on MicronutrientSummary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MicronutrientSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MicronutrientSummary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MicronutrientSummary value)  $default,){
final _that = this;
switch (_that) {
case _MicronutrientSummary():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MicronutrientSummary value)?  $default,){
final _that = this;
switch (_that) {
case _MicronutrientSummary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  double amount,  String unit,  double dailyValuePercent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MicronutrientSummary() when $default != null:
return $default(_that.name,_that.amount,_that.unit,_that.dailyValuePercent);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  double amount,  String unit,  double dailyValuePercent)  $default,) {final _that = this;
switch (_that) {
case _MicronutrientSummary():
return $default(_that.name,_that.amount,_that.unit,_that.dailyValuePercent);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  double amount,  String unit,  double dailyValuePercent)?  $default,) {final _that = this;
switch (_that) {
case _MicronutrientSummary() when $default != null:
return $default(_that.name,_that.amount,_that.unit,_that.dailyValuePercent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MicronutrientSummary extends MicronutrientSummary {
  const _MicronutrientSummary({required this.name, this.amount = 0, this.unit = '', this.dailyValuePercent = 0}): super._();
  factory _MicronutrientSummary.fromJson(Map<String, dynamic> json) => _$MicronutrientSummaryFromJson(json);

@override final  String name;
@override@JsonKey() final  double amount;
@override@JsonKey() final  String unit;
@override@JsonKey() final  double dailyValuePercent;

/// Create a copy of MicronutrientSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MicronutrientSummaryCopyWith<_MicronutrientSummary> get copyWith => __$MicronutrientSummaryCopyWithImpl<_MicronutrientSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MicronutrientSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _MicronutrientSummary&&(identical(other.name, name) || other.name == name)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.dailyValuePercent, dailyValuePercent) || other.dailyValuePercent == dailyValuePercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,amount,unit,dailyValuePercent);

@override
String toString() {
  return 'MicronutrientSummary(name: $name, amount: $amount, unit: $unit, dailyValuePercent: $dailyValuePercent)';
}


}

/// @nodoc
abstract mixin class _$MicronutrientSummaryCopyWith<$Res> implements $MicronutrientSummaryCopyWith<$Res> {
  factory _$MicronutrientSummaryCopyWith(_MicronutrientSummary value, $Res Function(_MicronutrientSummary) _then) = __$MicronutrientSummaryCopyWithImpl;
@override @useResult
$Res call({
 String name, double amount, String unit, double dailyValuePercent
});




}
/// @nodoc
class __$MicronutrientSummaryCopyWithImpl<$Res>
    implements _$MicronutrientSummaryCopyWith<$Res> {
  __$MicronutrientSummaryCopyWithImpl(this._self, this._then);

  final _MicronutrientSummary _self;
  final $Res Function(_MicronutrientSummary) _then;

/// Create a copy of MicronutrientSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? amount = null,Object? unit = null,Object? dailyValuePercent = null,}) {
  return _then(_MicronutrientSummary(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as double,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,dailyValuePercent: null == dailyValuePercent ? _self.dailyValuePercent : dailyValuePercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$SupplementAnalytics {

 List<SupplementAdherence> get supplements;
/// Create a copy of SupplementAnalytics
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementAnalyticsCopyWith<SupplementAnalytics> get copyWith => _$SupplementAnalyticsCopyWithImpl<SupplementAnalytics>(this as SupplementAnalytics, _$identity);

  /// Serializes this SupplementAnalytics to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupplementAnalytics&&const DeepCollectionEquality().equals(other.supplements, supplements));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(supplements));

@override
String toString() {
  return 'SupplementAnalytics(supplements: $supplements)';
}


}

/// @nodoc
abstract mixin class $SupplementAnalyticsCopyWith<$Res>  {
  factory $SupplementAnalyticsCopyWith(SupplementAnalytics value, $Res Function(SupplementAnalytics) _then) = _$SupplementAnalyticsCopyWithImpl;
@useResult
$Res call({
 List<SupplementAdherence> supplements
});




}
/// @nodoc
class _$SupplementAnalyticsCopyWithImpl<$Res>
    implements $SupplementAnalyticsCopyWith<$Res> {
  _$SupplementAnalyticsCopyWithImpl(this._self, this._then);

  final SupplementAnalytics _self;
  final $Res Function(SupplementAnalytics) _then;

/// Create a copy of SupplementAnalytics
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? supplements = null,}) {
  return _then(_self.copyWith(
supplements: null == supplements ? _self.supplements : supplements // ignore: cast_nullable_to_non_nullable
as List<SupplementAdherence>,
  ));
}

}


/// Adds pattern-matching-related methods to [SupplementAnalytics].
extension SupplementAnalyticsPatterns on SupplementAnalytics {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupplementAnalytics value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupplementAnalytics() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupplementAnalytics value)  $default,){
final _that = this;
switch (_that) {
case _SupplementAnalytics():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupplementAnalytics value)?  $default,){
final _that = this;
switch (_that) {
case _SupplementAnalytics() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<SupplementAdherence> supplements)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupplementAnalytics() when $default != null:
return $default(_that.supplements);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<SupplementAdherence> supplements)  $default,) {final _that = this;
switch (_that) {
case _SupplementAnalytics():
return $default(_that.supplements);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<SupplementAdherence> supplements)?  $default,) {final _that = this;
switch (_that) {
case _SupplementAnalytics() when $default != null:
return $default(_that.supplements);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupplementAnalytics extends SupplementAnalytics {
  const _SupplementAnalytics({final  List<SupplementAdherence> supplements = const []}): _supplements = supplements,super._();
  factory _SupplementAnalytics.fromJson(Map<String, dynamic> json) => _$SupplementAnalyticsFromJson(json);

 final  List<SupplementAdherence> _supplements;
@override@JsonKey() List<SupplementAdherence> get supplements {
  if (_supplements is EqualUnmodifiableListView) return _supplements;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_supplements);
}


/// Create a copy of SupplementAnalytics
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupplementAnalyticsCopyWith<_SupplementAnalytics> get copyWith => __$SupplementAnalyticsCopyWithImpl<_SupplementAnalytics>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupplementAnalyticsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupplementAnalytics&&const DeepCollectionEquality().equals(other._supplements, _supplements));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_supplements));

@override
String toString() {
  return 'SupplementAnalytics(supplements: $supplements)';
}


}

/// @nodoc
abstract mixin class _$SupplementAnalyticsCopyWith<$Res> implements $SupplementAnalyticsCopyWith<$Res> {
  factory _$SupplementAnalyticsCopyWith(_SupplementAnalytics value, $Res Function(_SupplementAnalytics) _then) = __$SupplementAnalyticsCopyWithImpl;
@override @useResult
$Res call({
 List<SupplementAdherence> supplements
});




}
/// @nodoc
class __$SupplementAnalyticsCopyWithImpl<$Res>
    implements _$SupplementAnalyticsCopyWith<$Res> {
  __$SupplementAnalyticsCopyWithImpl(this._self, this._then);

  final _SupplementAnalytics _self;
  final $Res Function(_SupplementAnalytics) _then;

/// Create a copy of SupplementAnalytics
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? supplements = null,}) {
  return _then(_SupplementAnalytics(
supplements: null == supplements ? _self._supplements : supplements // ignore: cast_nullable_to_non_nullable
as List<SupplementAdherence>,
  ));
}


}


/// @nodoc
mixin _$SupplementAdherence {

 String get name; double get adherencePercent; int get daysTaken; int get totalDays;
/// Create a copy of SupplementAdherence
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementAdherenceCopyWith<SupplementAdherence> get copyWith => _$SupplementAdherenceCopyWithImpl<SupplementAdherence>(this as SupplementAdherence, _$identity);

  /// Serializes this SupplementAdherence to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SupplementAdherence&&(identical(other.name, name) || other.name == name)&&(identical(other.adherencePercent, adherencePercent) || other.adherencePercent == adherencePercent)&&(identical(other.daysTaken, daysTaken) || other.daysTaken == daysTaken)&&(identical(other.totalDays, totalDays) || other.totalDays == totalDays));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,adherencePercent,daysTaken,totalDays);

@override
String toString() {
  return 'SupplementAdherence(name: $name, adherencePercent: $adherencePercent, daysTaken: $daysTaken, totalDays: $totalDays)';
}


}

/// @nodoc
abstract mixin class $SupplementAdherenceCopyWith<$Res>  {
  factory $SupplementAdherenceCopyWith(SupplementAdherence value, $Res Function(SupplementAdherence) _then) = _$SupplementAdherenceCopyWithImpl;
@useResult
$Res call({
 String name, double adherencePercent, int daysTaken, int totalDays
});




}
/// @nodoc
class _$SupplementAdherenceCopyWithImpl<$Res>
    implements $SupplementAdherenceCopyWith<$Res> {
  _$SupplementAdherenceCopyWithImpl(this._self, this._then);

  final SupplementAdherence _self;
  final $Res Function(SupplementAdherence) _then;

/// Create a copy of SupplementAdherence
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? adherencePercent = null,Object? daysTaken = null,Object? totalDays = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,adherencePercent: null == adherencePercent ? _self.adherencePercent : adherencePercent // ignore: cast_nullable_to_non_nullable
as double,daysTaken: null == daysTaken ? _self.daysTaken : daysTaken // ignore: cast_nullable_to_non_nullable
as int,totalDays: null == totalDays ? _self.totalDays : totalDays // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SupplementAdherence].
extension SupplementAdherencePatterns on SupplementAdherence {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SupplementAdherence value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SupplementAdherence() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SupplementAdherence value)  $default,){
final _that = this;
switch (_that) {
case _SupplementAdherence():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SupplementAdherence value)?  $default,){
final _that = this;
switch (_that) {
case _SupplementAdherence() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  double adherencePercent,  int daysTaken,  int totalDays)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SupplementAdherence() when $default != null:
return $default(_that.name,_that.adherencePercent,_that.daysTaken,_that.totalDays);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  double adherencePercent,  int daysTaken,  int totalDays)  $default,) {final _that = this;
switch (_that) {
case _SupplementAdherence():
return $default(_that.name,_that.adherencePercent,_that.daysTaken,_that.totalDays);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  double adherencePercent,  int daysTaken,  int totalDays)?  $default,) {final _that = this;
switch (_that) {
case _SupplementAdherence() when $default != null:
return $default(_that.name,_that.adherencePercent,_that.daysTaken,_that.totalDays);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SupplementAdherence extends SupplementAdherence {
  const _SupplementAdherence({required this.name, this.adherencePercent = 0, this.daysTaken = 0, this.totalDays = 0}): super._();
  factory _SupplementAdherence.fromJson(Map<String, dynamic> json) => _$SupplementAdherenceFromJson(json);

@override final  String name;
@override@JsonKey() final  double adherencePercent;
@override@JsonKey() final  int daysTaken;
@override@JsonKey() final  int totalDays;

/// Create a copy of SupplementAdherence
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SupplementAdherenceCopyWith<_SupplementAdherence> get copyWith => __$SupplementAdherenceCopyWithImpl<_SupplementAdherence>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SupplementAdherenceToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SupplementAdherence&&(identical(other.name, name) || other.name == name)&&(identical(other.adherencePercent, adherencePercent) || other.adherencePercent == adherencePercent)&&(identical(other.daysTaken, daysTaken) || other.daysTaken == daysTaken)&&(identical(other.totalDays, totalDays) || other.totalDays == totalDays));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,adherencePercent,daysTaken,totalDays);

@override
String toString() {
  return 'SupplementAdherence(name: $name, adherencePercent: $adherencePercent, daysTaken: $daysTaken, totalDays: $totalDays)';
}


}

/// @nodoc
abstract mixin class _$SupplementAdherenceCopyWith<$Res> implements $SupplementAdherenceCopyWith<$Res> {
  factory _$SupplementAdherenceCopyWith(_SupplementAdherence value, $Res Function(_SupplementAdherence) _then) = __$SupplementAdherenceCopyWithImpl;
@override @useResult
$Res call({
 String name, double adherencePercent, int daysTaken, int totalDays
});




}
/// @nodoc
class __$SupplementAdherenceCopyWithImpl<$Res>
    implements _$SupplementAdherenceCopyWith<$Res> {
  __$SupplementAdherenceCopyWithImpl(this._self, this._then);

  final _SupplementAdherence _self;
  final $Res Function(_SupplementAdherence) _then;

/// Create a copy of SupplementAdherence
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? adherencePercent = null,Object? daysTaken = null,Object? totalDays = null,}) {
  return _then(_SupplementAdherence(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,adherencePercent: null == adherencePercent ? _self.adherencePercent : adherencePercent // ignore: cast_nullable_to_non_nullable
as double,daysTaken: null == daysTaken ? _self.daysTaken : daysTaken // ignore: cast_nullable_to_non_nullable
as int,totalDays: null == totalDays ? _self.totalDays : totalDays // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$HealthHistory {

 List<HealthHistoryPoint> get steps; List<HealthHistoryPoint> get weight;
/// Create a copy of HealthHistory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HealthHistoryCopyWith<HealthHistory> get copyWith => _$HealthHistoryCopyWithImpl<HealthHistory>(this as HealthHistory, _$identity);

  /// Serializes this HealthHistory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HealthHistory&&const DeepCollectionEquality().equals(other.steps, steps)&&const DeepCollectionEquality().equals(other.weight, weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(steps),const DeepCollectionEquality().hash(weight));

@override
String toString() {
  return 'HealthHistory(steps: $steps, weight: $weight)';
}


}

/// @nodoc
abstract mixin class $HealthHistoryCopyWith<$Res>  {
  factory $HealthHistoryCopyWith(HealthHistory value, $Res Function(HealthHistory) _then) = _$HealthHistoryCopyWithImpl;
@useResult
$Res call({
 List<HealthHistoryPoint> steps, List<HealthHistoryPoint> weight
});




}
/// @nodoc
class _$HealthHistoryCopyWithImpl<$Res>
    implements $HealthHistoryCopyWith<$Res> {
  _$HealthHistoryCopyWithImpl(this._self, this._then);

  final HealthHistory _self;
  final $Res Function(HealthHistory) _then;

/// Create a copy of HealthHistory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? steps = null,Object? weight = null,}) {
  return _then(_self.copyWith(
steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as List<HealthHistoryPoint>,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as List<HealthHistoryPoint>,
  ));
}

}


/// Adds pattern-matching-related methods to [HealthHistory].
extension HealthHistoryPatterns on HealthHistory {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HealthHistory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HealthHistory() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HealthHistory value)  $default,){
final _that = this;
switch (_that) {
case _HealthHistory():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HealthHistory value)?  $default,){
final _that = this;
switch (_that) {
case _HealthHistory() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<HealthHistoryPoint> steps,  List<HealthHistoryPoint> weight)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HealthHistory() when $default != null:
return $default(_that.steps,_that.weight);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<HealthHistoryPoint> steps,  List<HealthHistoryPoint> weight)  $default,) {final _that = this;
switch (_that) {
case _HealthHistory():
return $default(_that.steps,_that.weight);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<HealthHistoryPoint> steps,  List<HealthHistoryPoint> weight)?  $default,) {final _that = this;
switch (_that) {
case _HealthHistory() when $default != null:
return $default(_that.steps,_that.weight);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HealthHistory extends HealthHistory {
  const _HealthHistory({final  List<HealthHistoryPoint> steps = const [], final  List<HealthHistoryPoint> weight = const []}): _steps = steps,_weight = weight,super._();
  factory _HealthHistory.fromJson(Map<String, dynamic> json) => _$HealthHistoryFromJson(json);

 final  List<HealthHistoryPoint> _steps;
@override@JsonKey() List<HealthHistoryPoint> get steps {
  if (_steps is EqualUnmodifiableListView) return _steps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_steps);
}

 final  List<HealthHistoryPoint> _weight;
@override@JsonKey() List<HealthHistoryPoint> get weight {
  if (_weight is EqualUnmodifiableListView) return _weight;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_weight);
}


/// Create a copy of HealthHistory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HealthHistoryCopyWith<_HealthHistory> get copyWith => __$HealthHistoryCopyWithImpl<_HealthHistory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HealthHistoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HealthHistory&&const DeepCollectionEquality().equals(other._steps, _steps)&&const DeepCollectionEquality().equals(other._weight, _weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_steps),const DeepCollectionEquality().hash(_weight));

@override
String toString() {
  return 'HealthHistory(steps: $steps, weight: $weight)';
}


}

/// @nodoc
abstract mixin class _$HealthHistoryCopyWith<$Res> implements $HealthHistoryCopyWith<$Res> {
  factory _$HealthHistoryCopyWith(_HealthHistory value, $Res Function(_HealthHistory) _then) = __$HealthHistoryCopyWithImpl;
@override @useResult
$Res call({
 List<HealthHistoryPoint> steps, List<HealthHistoryPoint> weight
});




}
/// @nodoc
class __$HealthHistoryCopyWithImpl<$Res>
    implements _$HealthHistoryCopyWith<$Res> {
  __$HealthHistoryCopyWithImpl(this._self, this._then);

  final _HealthHistory _self;
  final $Res Function(_HealthHistory) _then;

/// Create a copy of HealthHistory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? steps = null,Object? weight = null,}) {
  return _then(_HealthHistory(
steps: null == steps ? _self._steps : steps // ignore: cast_nullable_to_non_nullable
as List<HealthHistoryPoint>,weight: null == weight ? _self._weight : weight // ignore: cast_nullable_to_non_nullable
as List<HealthHistoryPoint>,
  ));
}


}


/// @nodoc
mixin _$HealthHistoryPoint {

 DateTime get date; double get value;
/// Create a copy of HealthHistoryPoint
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HealthHistoryPointCopyWith<HealthHistoryPoint> get copyWith => _$HealthHistoryPointCopyWithImpl<HealthHistoryPoint>(this as HealthHistoryPoint, _$identity);

  /// Serializes this HealthHistoryPoint to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HealthHistoryPoint&&(identical(other.date, date) || other.date == date)&&(identical(other.value, value) || other.value == value));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,value);

@override
String toString() {
  return 'HealthHistoryPoint(date: $date, value: $value)';
}


}

/// @nodoc
abstract mixin class $HealthHistoryPointCopyWith<$Res>  {
  factory $HealthHistoryPointCopyWith(HealthHistoryPoint value, $Res Function(HealthHistoryPoint) _then) = _$HealthHistoryPointCopyWithImpl;
@useResult
$Res call({
 DateTime date, double value
});




}
/// @nodoc
class _$HealthHistoryPointCopyWithImpl<$Res>
    implements $HealthHistoryPointCopyWith<$Res> {
  _$HealthHistoryPointCopyWithImpl(this._self, this._then);

  final HealthHistoryPoint _self;
  final $Res Function(HealthHistoryPoint) _then;

/// Create a copy of HealthHistoryPoint
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? value = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [HealthHistoryPoint].
extension HealthHistoryPointPatterns on HealthHistoryPoint {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HealthHistoryPoint value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HealthHistoryPoint() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HealthHistoryPoint value)  $default,){
final _that = this;
switch (_that) {
case _HealthHistoryPoint():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HealthHistoryPoint value)?  $default,){
final _that = this;
switch (_that) {
case _HealthHistoryPoint() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DateTime date,  double value)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HealthHistoryPoint() when $default != null:
return $default(_that.date,_that.value);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DateTime date,  double value)  $default,) {final _that = this;
switch (_that) {
case _HealthHistoryPoint():
return $default(_that.date,_that.value);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DateTime date,  double value)?  $default,) {final _that = this;
switch (_that) {
case _HealthHistoryPoint() when $default != null:
return $default(_that.date,_that.value);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HealthHistoryPoint extends HealthHistoryPoint {
  const _HealthHistoryPoint({required this.date, required this.value}): super._();
  factory _HealthHistoryPoint.fromJson(Map<String, dynamic> json) => _$HealthHistoryPointFromJson(json);

@override final  DateTime date;
@override final  double value;

/// Create a copy of HealthHistoryPoint
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HealthHistoryPointCopyWith<_HealthHistoryPoint> get copyWith => __$HealthHistoryPointCopyWithImpl<_HealthHistoryPoint>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HealthHistoryPointToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HealthHistoryPoint&&(identical(other.date, date) || other.date == date)&&(identical(other.value, value) || other.value == value));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,value);

@override
String toString() {
  return 'HealthHistoryPoint(date: $date, value: $value)';
}


}

/// @nodoc
abstract mixin class _$HealthHistoryPointCopyWith<$Res> implements $HealthHistoryPointCopyWith<$Res> {
  factory _$HealthHistoryPointCopyWith(_HealthHistoryPoint value, $Res Function(_HealthHistoryPoint) _then) = __$HealthHistoryPointCopyWithImpl;
@override @useResult
$Res call({
 DateTime date, double value
});




}
/// @nodoc
class __$HealthHistoryPointCopyWithImpl<$Res>
    implements _$HealthHistoryPointCopyWith<$Res> {
  __$HealthHistoryPointCopyWithImpl(this._self, this._then);

  final _HealthHistoryPoint _self;
  final $Res Function(_HealthHistoryPoint) _then;

/// Create a copy of HealthHistoryPoint
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? value = null,}) {
  return _then(_HealthHistoryPoint(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}

// dart format on
