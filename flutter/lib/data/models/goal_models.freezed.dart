// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'goal_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$GoalsResponse {

 List<Goal> get goals;
/// Create a copy of GoalsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GoalsResponseCopyWith<GoalsResponse> get copyWith => _$GoalsResponseCopyWithImpl<GoalsResponse>(this as GoalsResponse, _$identity);

  /// Serializes this GoalsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is GoalsResponse&&const DeepCollectionEquality().equals(other.goals, goals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(goals));

@override
String toString() {
  return 'GoalsResponse(goals: $goals)';
}


}

/// @nodoc
abstract mixin class $GoalsResponseCopyWith<$Res>  {
  factory $GoalsResponseCopyWith(GoalsResponse value, $Res Function(GoalsResponse) _then) = _$GoalsResponseCopyWithImpl;
@useResult
$Res call({
 List<Goal> goals
});




}
/// @nodoc
class _$GoalsResponseCopyWithImpl<$Res>
    implements $GoalsResponseCopyWith<$Res> {
  _$GoalsResponseCopyWithImpl(this._self, this._then);

  final GoalsResponse _self;
  final $Res Function(GoalsResponse) _then;

/// Create a copy of GoalsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? goals = null,}) {
  return _then(_self.copyWith(
goals: null == goals ? _self.goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,
  ));
}

}


/// Adds pattern-matching-related methods to [GoalsResponse].
extension GoalsResponsePatterns on GoalsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _GoalsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _GoalsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _GoalsResponse value)  $default,){
final _that = this;
switch (_that) {
case _GoalsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _GoalsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _GoalsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Goal> goals)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _GoalsResponse() when $default != null:
return $default(_that.goals);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Goal> goals)  $default,) {final _that = this;
switch (_that) {
case _GoalsResponse():
return $default(_that.goals);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Goal> goals)?  $default,) {final _that = this;
switch (_that) {
case _GoalsResponse() when $default != null:
return $default(_that.goals);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _GoalsResponse extends GoalsResponse {
  const _GoalsResponse({required final  List<Goal> goals}): _goals = goals,super._();
  factory _GoalsResponse.fromJson(Map<String, dynamic> json) => _$GoalsResponseFromJson(json);

 final  List<Goal> _goals;
@override List<Goal> get goals {
  if (_goals is EqualUnmodifiableListView) return _goals;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_goals);
}


/// Create a copy of GoalsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GoalsResponseCopyWith<_GoalsResponse> get copyWith => __$GoalsResponseCopyWithImpl<_GoalsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GoalsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _GoalsResponse&&const DeepCollectionEquality().equals(other._goals, _goals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_goals));

@override
String toString() {
  return 'GoalsResponse(goals: $goals)';
}


}

/// @nodoc
abstract mixin class _$GoalsResponseCopyWith<$Res> implements $GoalsResponseCopyWith<$Res> {
  factory _$GoalsResponseCopyWith(_GoalsResponse value, $Res Function(_GoalsResponse) _then) = __$GoalsResponseCopyWithImpl;
@override @useResult
$Res call({
 List<Goal> goals
});




}
/// @nodoc
class __$GoalsResponseCopyWithImpl<$Res>
    implements _$GoalsResponseCopyWith<$Res> {
  __$GoalsResponseCopyWithImpl(this._self, this._then);

  final _GoalsResponse _self;
  final $Res Function(_GoalsResponse) _then;

/// Create a copy of GoalsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? goals = null,}) {
  return _then(_GoalsResponse(
goals: null == goals ? _self._goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,
  ));
}


}


/// @nodoc
mixin _$WorkoutsResponse {

 List<Workout> get workouts;
/// Create a copy of WorkoutsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WorkoutsResponseCopyWith<WorkoutsResponse> get copyWith => _$WorkoutsResponseCopyWithImpl<WorkoutsResponse>(this as WorkoutsResponse, _$identity);

  /// Serializes this WorkoutsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WorkoutsResponse&&const DeepCollectionEquality().equals(other.workouts, workouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(workouts));

@override
String toString() {
  return 'WorkoutsResponse(workouts: $workouts)';
}


}

/// @nodoc
abstract mixin class $WorkoutsResponseCopyWith<$Res>  {
  factory $WorkoutsResponseCopyWith(WorkoutsResponse value, $Res Function(WorkoutsResponse) _then) = _$WorkoutsResponseCopyWithImpl;
@useResult
$Res call({
 List<Workout> workouts
});




}
/// @nodoc
class _$WorkoutsResponseCopyWithImpl<$Res>
    implements $WorkoutsResponseCopyWith<$Res> {
  _$WorkoutsResponseCopyWithImpl(this._self, this._then);

  final WorkoutsResponse _self;
  final $Res Function(WorkoutsResponse) _then;

/// Create a copy of WorkoutsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? workouts = null,}) {
  return _then(_self.copyWith(
workouts: null == workouts ? _self.workouts : workouts // ignore: cast_nullable_to_non_nullable
as List<Workout>,
  ));
}

}


/// Adds pattern-matching-related methods to [WorkoutsResponse].
extension WorkoutsResponsePatterns on WorkoutsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WorkoutsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WorkoutsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WorkoutsResponse value)  $default,){
final _that = this;
switch (_that) {
case _WorkoutsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WorkoutsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _WorkoutsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Workout> workouts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WorkoutsResponse() when $default != null:
return $default(_that.workouts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Workout> workouts)  $default,) {final _that = this;
switch (_that) {
case _WorkoutsResponse():
return $default(_that.workouts);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Workout> workouts)?  $default,) {final _that = this;
switch (_that) {
case _WorkoutsResponse() when $default != null:
return $default(_that.workouts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WorkoutsResponse extends WorkoutsResponse {
  const _WorkoutsResponse({required final  List<Workout> workouts}): _workouts = workouts,super._();
  factory _WorkoutsResponse.fromJson(Map<String, dynamic> json) => _$WorkoutsResponseFromJson(json);

 final  List<Workout> _workouts;
@override List<Workout> get workouts {
  if (_workouts is EqualUnmodifiableListView) return _workouts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_workouts);
}


/// Create a copy of WorkoutsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WorkoutsResponseCopyWith<_WorkoutsResponse> get copyWith => __$WorkoutsResponseCopyWithImpl<_WorkoutsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WorkoutsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _WorkoutsResponse&&const DeepCollectionEquality().equals(other._workouts, _workouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_workouts));

@override
String toString() {
  return 'WorkoutsResponse(workouts: $workouts)';
}


}

/// @nodoc
abstract mixin class _$WorkoutsResponseCopyWith<$Res> implements $WorkoutsResponseCopyWith<$Res> {
  factory _$WorkoutsResponseCopyWith(_WorkoutsResponse value, $Res Function(_WorkoutsResponse) _then) = __$WorkoutsResponseCopyWithImpl;
@override @useResult
$Res call({
 List<Workout> workouts
});




}
/// @nodoc
class __$WorkoutsResponseCopyWithImpl<$Res>
    implements _$WorkoutsResponseCopyWith<$Res> {
  __$WorkoutsResponseCopyWithImpl(this._self, this._then);

  final _WorkoutsResponse _self;
  final $Res Function(_WorkoutsResponse) _then;

/// Create a copy of WorkoutsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? workouts = null,}) {
  return _then(_WorkoutsResponse(
workouts: null == workouts ? _self._workouts : workouts // ignore: cast_nullable_to_non_nullable
as List<Workout>,
  ));
}


}


/// @nodoc
mixin _$CreateGoalRequest {

 String get name; RaceType get raceType; DateTime get raceDate; int? get targetTime; double? get weeklyMileageGoal; int get planWeeks; int get runsPerWeek;
/// Create a copy of CreateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CreateGoalRequestCopyWith<CreateGoalRequest> get copyWith => _$CreateGoalRequestCopyWithImpl<CreateGoalRequest>(this as CreateGoalRequest, _$identity);

  /// Serializes this CreateGoalRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CreateGoalRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek);

@override
String toString() {
  return 'CreateGoalRequest(name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek)';
}


}

/// @nodoc
abstract mixin class $CreateGoalRequestCopyWith<$Res>  {
  factory $CreateGoalRequestCopyWith(CreateGoalRequest value, $Res Function(CreateGoalRequest) _then) = _$CreateGoalRequestCopyWithImpl;
@useResult
$Res call({
 String name, RaceType raceType, DateTime raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek
});




}
/// @nodoc
class _$CreateGoalRequestCopyWithImpl<$Res>
    implements $CreateGoalRequestCopyWith<$Res> {
  _$CreateGoalRequestCopyWithImpl(this._self, this._then);

  final CreateGoalRequest _self;
  final $Res Function(CreateGoalRequest) _then;

/// Create a copy of CreateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? raceType = null,Object? raceDate = null,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,weeklyMileageGoal: freezed == weeklyMileageGoal ? _self.weeklyMileageGoal : weeklyMileageGoal // ignore: cast_nullable_to_non_nullable
as double?,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [CreateGoalRequest].
extension CreateGoalRequestPatterns on CreateGoalRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CreateGoalRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CreateGoalRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CreateGoalRequest value)  $default,){
final _that = this;
switch (_that) {
case _CreateGoalRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CreateGoalRequest value)?  $default,){
final _that = this;
switch (_that) {
case _CreateGoalRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CreateGoalRequest() when $default != null:
return $default(_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek)  $default,) {final _that = this;
switch (_that) {
case _CreateGoalRequest():
return $default(_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek)?  $default,) {final _that = this;
switch (_that) {
case _CreateGoalRequest() when $default != null:
return $default(_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CreateGoalRequest extends CreateGoalRequest {
  const _CreateGoalRequest({required this.name, required this.raceType, required this.raceDate, this.targetTime, this.weeklyMileageGoal, this.planWeeks = 12, this.runsPerWeek = 4}): super._();
  factory _CreateGoalRequest.fromJson(Map<String, dynamic> json) => _$CreateGoalRequestFromJson(json);

@override final  String name;
@override final  RaceType raceType;
@override final  DateTime raceDate;
@override final  int? targetTime;
@override final  double? weeklyMileageGoal;
@override@JsonKey() final  int planWeeks;
@override@JsonKey() final  int runsPerWeek;

/// Create a copy of CreateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CreateGoalRequestCopyWith<_CreateGoalRequest> get copyWith => __$CreateGoalRequestCopyWithImpl<_CreateGoalRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CreateGoalRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CreateGoalRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek);

@override
String toString() {
  return 'CreateGoalRequest(name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek)';
}


}

/// @nodoc
abstract mixin class _$CreateGoalRequestCopyWith<$Res> implements $CreateGoalRequestCopyWith<$Res> {
  factory _$CreateGoalRequestCopyWith(_CreateGoalRequest value, $Res Function(_CreateGoalRequest) _then) = __$CreateGoalRequestCopyWithImpl;
@override @useResult
$Res call({
 String name, RaceType raceType, DateTime raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek
});




}
/// @nodoc
class __$CreateGoalRequestCopyWithImpl<$Res>
    implements _$CreateGoalRequestCopyWith<$Res> {
  __$CreateGoalRequestCopyWithImpl(this._self, this._then);

  final _CreateGoalRequest _self;
  final $Res Function(_CreateGoalRequest) _then;

/// Create a copy of CreateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? raceType = null,Object? raceDate = null,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,}) {
  return _then(_CreateGoalRequest(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,weeklyMileageGoal: freezed == weeklyMileageGoal ? _self.weeklyMileageGoal : weeklyMileageGoal // ignore: cast_nullable_to_non_nullable
as double?,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$UpdateGoalRequest {

 String? get name; int? get targetTime; bool? get isActive; double? get currentVdot;
/// Create a copy of UpdateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UpdateGoalRequestCopyWith<UpdateGoalRequest> get copyWith => _$UpdateGoalRequestCopyWithImpl<UpdateGoalRequest>(this as UpdateGoalRequest, _$identity);

  /// Serializes this UpdateGoalRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UpdateGoalRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,targetTime,isActive,currentVdot);

@override
String toString() {
  return 'UpdateGoalRequest(name: $name, targetTime: $targetTime, isActive: $isActive, currentVdot: $currentVdot)';
}


}

/// @nodoc
abstract mixin class $UpdateGoalRequestCopyWith<$Res>  {
  factory $UpdateGoalRequestCopyWith(UpdateGoalRequest value, $Res Function(UpdateGoalRequest) _then) = _$UpdateGoalRequestCopyWithImpl;
@useResult
$Res call({
 String? name, int? targetTime, bool? isActive, double? currentVdot
});




}
/// @nodoc
class _$UpdateGoalRequestCopyWithImpl<$Res>
    implements $UpdateGoalRequestCopyWith<$Res> {
  _$UpdateGoalRequestCopyWithImpl(this._self, this._then);

  final UpdateGoalRequest _self;
  final $Res Function(UpdateGoalRequest) _then;

/// Create a copy of UpdateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = freezed,Object? targetTime = freezed,Object? isActive = freezed,Object? currentVdot = freezed,}) {
  return _then(_self.copyWith(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,isActive: freezed == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool?,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [UpdateGoalRequest].
extension UpdateGoalRequestPatterns on UpdateGoalRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UpdateGoalRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UpdateGoalRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UpdateGoalRequest value)  $default,){
final _that = this;
switch (_that) {
case _UpdateGoalRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UpdateGoalRequest value)?  $default,){
final _that = this;
switch (_that) {
case _UpdateGoalRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? name,  int? targetTime,  bool? isActive,  double? currentVdot)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UpdateGoalRequest() when $default != null:
return $default(_that.name,_that.targetTime,_that.isActive,_that.currentVdot);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? name,  int? targetTime,  bool? isActive,  double? currentVdot)  $default,) {final _that = this;
switch (_that) {
case _UpdateGoalRequest():
return $default(_that.name,_that.targetTime,_that.isActive,_that.currentVdot);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? name,  int? targetTime,  bool? isActive,  double? currentVdot)?  $default,) {final _that = this;
switch (_that) {
case _UpdateGoalRequest() when $default != null:
return $default(_that.name,_that.targetTime,_that.isActive,_that.currentVdot);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UpdateGoalRequest extends UpdateGoalRequest {
  const _UpdateGoalRequest({this.name, this.targetTime, this.isActive, this.currentVdot}): super._();
  factory _UpdateGoalRequest.fromJson(Map<String, dynamic> json) => _$UpdateGoalRequestFromJson(json);

@override final  String? name;
@override final  int? targetTime;
@override final  bool? isActive;
@override final  double? currentVdot;

/// Create a copy of UpdateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UpdateGoalRequestCopyWith<_UpdateGoalRequest> get copyWith => __$UpdateGoalRequestCopyWithImpl<_UpdateGoalRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UpdateGoalRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UpdateGoalRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,targetTime,isActive,currentVdot);

@override
String toString() {
  return 'UpdateGoalRequest(name: $name, targetTime: $targetTime, isActive: $isActive, currentVdot: $currentVdot)';
}


}

/// @nodoc
abstract mixin class _$UpdateGoalRequestCopyWith<$Res> implements $UpdateGoalRequestCopyWith<$Res> {
  factory _$UpdateGoalRequestCopyWith(_UpdateGoalRequest value, $Res Function(_UpdateGoalRequest) _then) = __$UpdateGoalRequestCopyWithImpl;
@override @useResult
$Res call({
 String? name, int? targetTime, bool? isActive, double? currentVdot
});




}
/// @nodoc
class __$UpdateGoalRequestCopyWithImpl<$Res>
    implements _$UpdateGoalRequestCopyWith<$Res> {
  __$UpdateGoalRequestCopyWithImpl(this._self, this._then);

  final _UpdateGoalRequest _self;
  final $Res Function(_UpdateGoalRequest) _then;

/// Create a copy of UpdateGoalRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = freezed,Object? targetTime = freezed,Object? isActive = freezed,Object? currentVdot = freezed,}) {
  return _then(_UpdateGoalRequest(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,isActive: freezed == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool?,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$UpdateWorkoutRequest {

 WorkoutType? get workoutType; String? get description; double? get targetDistance; double? get targetPace; int? get targetDuration; bool? get isCompleted;
/// Create a copy of UpdateWorkoutRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UpdateWorkoutRequestCopyWith<UpdateWorkoutRequest> get copyWith => _$UpdateWorkoutRequestCopyWithImpl<UpdateWorkoutRequest>(this as UpdateWorkoutRequest, _$identity);

  /// Serializes this UpdateWorkoutRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UpdateWorkoutRequest&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted);

@override
String toString() {
  return 'UpdateWorkoutRequest(workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted)';
}


}

/// @nodoc
abstract mixin class $UpdateWorkoutRequestCopyWith<$Res>  {
  factory $UpdateWorkoutRequestCopyWith(UpdateWorkoutRequest value, $Res Function(UpdateWorkoutRequest) _then) = _$UpdateWorkoutRequestCopyWithImpl;
@useResult
$Res call({
 WorkoutType? workoutType, String? description, double? targetDistance, double? targetPace, int? targetDuration, bool? isCompleted
});




}
/// @nodoc
class _$UpdateWorkoutRequestCopyWithImpl<$Res>
    implements $UpdateWorkoutRequestCopyWith<$Res> {
  _$UpdateWorkoutRequestCopyWithImpl(this._self, this._then);

  final UpdateWorkoutRequest _self;
  final $Res Function(UpdateWorkoutRequest) _then;

/// Create a copy of UpdateWorkoutRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? workoutType = freezed,Object? description = freezed,Object? targetDistance = freezed,Object? targetPace = freezed,Object? targetDuration = freezed,Object? isCompleted = freezed,}) {
  return _then(_self.copyWith(
workoutType: freezed == workoutType ? _self.workoutType : workoutType // ignore: cast_nullable_to_non_nullable
as WorkoutType?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,targetDistance: freezed == targetDistance ? _self.targetDistance : targetDistance // ignore: cast_nullable_to_non_nullable
as double?,targetPace: freezed == targetPace ? _self.targetPace : targetPace // ignore: cast_nullable_to_non_nullable
as double?,targetDuration: freezed == targetDuration ? _self.targetDuration : targetDuration // ignore: cast_nullable_to_non_nullable
as int?,isCompleted: freezed == isCompleted ? _self.isCompleted : isCompleted // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}

}


/// Adds pattern-matching-related methods to [UpdateWorkoutRequest].
extension UpdateWorkoutRequestPatterns on UpdateWorkoutRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UpdateWorkoutRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UpdateWorkoutRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UpdateWorkoutRequest value)  $default,){
final _that = this;
switch (_that) {
case _UpdateWorkoutRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UpdateWorkoutRequest value)?  $default,){
final _that = this;
switch (_that) {
case _UpdateWorkoutRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( WorkoutType? workoutType,  String? description,  double? targetDistance,  double? targetPace,  int? targetDuration,  bool? isCompleted)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UpdateWorkoutRequest() when $default != null:
return $default(_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( WorkoutType? workoutType,  String? description,  double? targetDistance,  double? targetPace,  int? targetDuration,  bool? isCompleted)  $default,) {final _that = this;
switch (_that) {
case _UpdateWorkoutRequest():
return $default(_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( WorkoutType? workoutType,  String? description,  double? targetDistance,  double? targetPace,  int? targetDuration,  bool? isCompleted)?  $default,) {final _that = this;
switch (_that) {
case _UpdateWorkoutRequest() when $default != null:
return $default(_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UpdateWorkoutRequest extends UpdateWorkoutRequest {
  const _UpdateWorkoutRequest({this.workoutType, this.description, this.targetDistance, this.targetPace, this.targetDuration, this.isCompleted}): super._();
  factory _UpdateWorkoutRequest.fromJson(Map<String, dynamic> json) => _$UpdateWorkoutRequestFromJson(json);

@override final  WorkoutType? workoutType;
@override final  String? description;
@override final  double? targetDistance;
@override final  double? targetPace;
@override final  int? targetDuration;
@override final  bool? isCompleted;

/// Create a copy of UpdateWorkoutRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UpdateWorkoutRequestCopyWith<_UpdateWorkoutRequest> get copyWith => __$UpdateWorkoutRequestCopyWithImpl<_UpdateWorkoutRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UpdateWorkoutRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UpdateWorkoutRequest&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted);

@override
String toString() {
  return 'UpdateWorkoutRequest(workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted)';
}


}

/// @nodoc
abstract mixin class _$UpdateWorkoutRequestCopyWith<$Res> implements $UpdateWorkoutRequestCopyWith<$Res> {
  factory _$UpdateWorkoutRequestCopyWith(_UpdateWorkoutRequest value, $Res Function(_UpdateWorkoutRequest) _then) = __$UpdateWorkoutRequestCopyWithImpl;
@override @useResult
$Res call({
 WorkoutType? workoutType, String? description, double? targetDistance, double? targetPace, int? targetDuration, bool? isCompleted
});




}
/// @nodoc
class __$UpdateWorkoutRequestCopyWithImpl<$Res>
    implements _$UpdateWorkoutRequestCopyWith<$Res> {
  __$UpdateWorkoutRequestCopyWithImpl(this._self, this._then);

  final _UpdateWorkoutRequest _self;
  final $Res Function(_UpdateWorkoutRequest) _then;

/// Create a copy of UpdateWorkoutRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? workoutType = freezed,Object? description = freezed,Object? targetDistance = freezed,Object? targetPace = freezed,Object? targetDuration = freezed,Object? isCompleted = freezed,}) {
  return _then(_UpdateWorkoutRequest(
workoutType: freezed == workoutType ? _self.workoutType : workoutType // ignore: cast_nullable_to_non_nullable
as WorkoutType?,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,targetDistance: freezed == targetDistance ? _self.targetDistance : targetDistance // ignore: cast_nullable_to_non_nullable
as double?,targetPace: freezed == targetPace ? _self.targetPace : targetPace // ignore: cast_nullable_to_non_nullable
as double?,targetDuration: freezed == targetDuration ? _self.targetDuration : targetDuration // ignore: cast_nullable_to_non_nullable
as int?,isCompleted: freezed == isCompleted ? _self.isCompleted : isCompleted // ignore: cast_nullable_to_non_nullable
as bool?,
  ));
}


}

// dart format on
