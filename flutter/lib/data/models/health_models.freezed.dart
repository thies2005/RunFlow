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

 int get id; String get name; String get dosage; String get frequency; bool get isActive;
/// Create a copy of Supplement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SupplementCopyWith<Supplement> get copyWith => _$SupplementCopyWithImpl<Supplement>(this as Supplement, _$identity);

  /// Serializes this Supplement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Supplement&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.dosage, dosage) || other.dosage == dosage)&&(identical(other.frequency, frequency) || other.frequency == frequency)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,dosage,frequency,isActive);

@override
String toString() {
  return 'Supplement(id: $id, name: $name, dosage: $dosage, frequency: $frequency, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $SupplementCopyWith<$Res>  {
  factory $SupplementCopyWith(Supplement value, $Res Function(Supplement) _then) = _$SupplementCopyWithImpl;
@useResult
$Res call({
 int id, String name, String dosage, String frequency, bool isActive
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? dosage = null,Object? frequency = null,Object? isActive = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,dosage: null == dosage ? _self.dosage : dosage // ignore: cast_nullable_to_non_nullable
as String,frequency: null == frequency ? _self.frequency : frequency // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String name,  String dosage,  String frequency,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that.id,_that.name,_that.dosage,_that.frequency,_that.isActive);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String name,  String dosage,  String frequency,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Supplement():
return $default(_that.id,_that.name,_that.dosage,_that.frequency,_that.isActive);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String name,  String dosage,  String frequency,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Supplement() when $default != null:
return $default(_that.id,_that.name,_that.dosage,_that.frequency,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Supplement extends Supplement {
  const _Supplement({required this.id, required this.name, required this.dosage, required this.frequency, required this.isActive}): super._();
  factory _Supplement.fromJson(Map<String, dynamic> json) => _$SupplementFromJson(json);

@override final  int id;
@override final  String name;
@override final  String dosage;
@override final  String frequency;
@override final  bool isActive;

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Supplement&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.dosage, dosage) || other.dosage == dosage)&&(identical(other.frequency, frequency) || other.frequency == frequency)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,dosage,frequency,isActive);

@override
String toString() {
  return 'Supplement(id: $id, name: $name, dosage: $dosage, frequency: $frequency, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$SupplementCopyWith<$Res> implements $SupplementCopyWith<$Res> {
  factory _$SupplementCopyWith(_Supplement value, $Res Function(_Supplement) _then) = __$SupplementCopyWithImpl;
@override @useResult
$Res call({
 int id, String name, String dosage, String frequency, bool isActive
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? dosage = null,Object? frequency = null,Object? isActive = null,}) {
  return _then(_Supplement(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,dosage: null == dosage ? _self.dosage : dosage // ignore: cast_nullable_to_non_nullable
as String,frequency: null == frequency ? _self.frequency : frequency // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
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

 int get id; DateTime get date; NutritionLog get nutritionLog; double get weight; double get bodyFat; String? get notes;
/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyHealthLogCopyWith<DailyHealthLog> get copyWith => _$DailyHealthLogCopyWithImpl<DailyHealthLog>(this as DailyHealthLog, _$identity);

  /// Serializes this DailyHealthLog to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyHealthLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.nutritionLog, nutritionLog) || other.nutritionLog == nutritionLog)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.bodyFat, bodyFat) || other.bodyFat == bodyFat)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,nutritionLog,weight,bodyFat,notes);

@override
String toString() {
  return 'DailyHealthLog(id: $id, date: $date, nutritionLog: $nutritionLog, weight: $weight, bodyFat: $bodyFat, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $DailyHealthLogCopyWith<$Res>  {
  factory $DailyHealthLogCopyWith(DailyHealthLog value, $Res Function(DailyHealthLog) _then) = _$DailyHealthLogCopyWithImpl;
@useResult
$Res call({
 int id, DateTime date, NutritionLog nutritionLog, double weight, double bodyFat, String? notes
});


$NutritionLogCopyWith<$Res> get nutritionLog;

}
/// @nodoc
class _$DailyHealthLogCopyWithImpl<$Res>
    implements $DailyHealthLogCopyWith<$Res> {
  _$DailyHealthLogCopyWithImpl(this._self, this._then);

  final DailyHealthLog _self;
  final $Res Function(DailyHealthLog) _then;

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? date = null,Object? nutritionLog = null,Object? weight = null,Object? bodyFat = null,Object? notes = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,nutritionLog: null == nutritionLog ? _self.nutritionLog : nutritionLog // ignore: cast_nullable_to_non_nullable
as NutritionLog,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,bodyFat: null == bodyFat ? _self.bodyFat : bodyFat // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NutritionLogCopyWith<$Res> get nutritionLog {
  
  return $NutritionLogCopyWith<$Res>(_self.nutritionLog, (value) {
    return _then(_self.copyWith(nutritionLog: value));
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  DateTime date,  NutritionLog nutritionLog,  double weight,  double bodyFat,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that.id,_that.date,_that.nutritionLog,_that.weight,_that.bodyFat,_that.notes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  DateTime date,  NutritionLog nutritionLog,  double weight,  double bodyFat,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _DailyHealthLog():
return $default(_that.id,_that.date,_that.nutritionLog,_that.weight,_that.bodyFat,_that.notes);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  DateTime date,  NutritionLog nutritionLog,  double weight,  double bodyFat,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _DailyHealthLog() when $default != null:
return $default(_that.id,_that.date,_that.nutritionLog,_that.weight,_that.bodyFat,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DailyHealthLog extends DailyHealthLog {
  const _DailyHealthLog({required this.id, required this.date, required this.nutritionLog, required this.weight, required this.bodyFat, this.notes}): super._();
  factory _DailyHealthLog.fromJson(Map<String, dynamic> json) => _$DailyHealthLogFromJson(json);

@override final  int id;
@override final  DateTime date;
@override final  NutritionLog nutritionLog;
@override final  double weight;
@override final  double bodyFat;
@override final  String? notes;

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyHealthLog&&(identical(other.id, id) || other.id == id)&&(identical(other.date, date) || other.date == date)&&(identical(other.nutritionLog, nutritionLog) || other.nutritionLog == nutritionLog)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.bodyFat, bodyFat) || other.bodyFat == bodyFat)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,date,nutritionLog,weight,bodyFat,notes);

@override
String toString() {
  return 'DailyHealthLog(id: $id, date: $date, nutritionLog: $nutritionLog, weight: $weight, bodyFat: $bodyFat, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$DailyHealthLogCopyWith<$Res> implements $DailyHealthLogCopyWith<$Res> {
  factory _$DailyHealthLogCopyWith(_DailyHealthLog value, $Res Function(_DailyHealthLog) _then) = __$DailyHealthLogCopyWithImpl;
@override @useResult
$Res call({
 int id, DateTime date, NutritionLog nutritionLog, double weight, double bodyFat, String? notes
});


@override $NutritionLogCopyWith<$Res> get nutritionLog;

}
/// @nodoc
class __$DailyHealthLogCopyWithImpl<$Res>
    implements _$DailyHealthLogCopyWith<$Res> {
  __$DailyHealthLogCopyWithImpl(this._self, this._then);

  final _DailyHealthLog _self;
  final $Res Function(_DailyHealthLog) _then;

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? date = null,Object? nutritionLog = null,Object? weight = null,Object? bodyFat = null,Object? notes = freezed,}) {
  return _then(_DailyHealthLog(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,nutritionLog: null == nutritionLog ? _self.nutritionLog : nutritionLog // ignore: cast_nullable_to_non_nullable
as NutritionLog,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,bodyFat: null == bodyFat ? _self.bodyFat : bodyFat // ignore: cast_nullable_to_non_nullable
as double,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of DailyHealthLog
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NutritionLogCopyWith<$Res> get nutritionLog {
  
  return $NutritionLogCopyWith<$Res>(_self.nutritionLog, (value) {
    return _then(_self.copyWith(nutritionLog: value));
  });
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

// dart format on
