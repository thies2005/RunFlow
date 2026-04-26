// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'running_profile_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RunningProfile {

 double get weeklyMileage; ExperienceLevel get experienceLevel; List<PreferredDistance> get preferredDistances; int get runsPerWeek; bool get hasRaceExperience; bool get isInjured;
/// Create a copy of RunningProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunningProfileCopyWith<RunningProfile> get copyWith => _$RunningProfileCopyWithImpl<RunningProfile>(this as RunningProfile, _$identity);

  /// Serializes this RunningProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RunningProfile&&(identical(other.weeklyMileage, weeklyMileage) || other.weeklyMileage == weeklyMileage)&&(identical(other.experienceLevel, experienceLevel) || other.experienceLevel == experienceLevel)&&const DeepCollectionEquality().equals(other.preferredDistances, preferredDistances)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.hasRaceExperience, hasRaceExperience) || other.hasRaceExperience == hasRaceExperience)&&(identical(other.isInjured, isInjured) || other.isInjured == isInjured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,weeklyMileage,experienceLevel,const DeepCollectionEquality().hash(preferredDistances),runsPerWeek,hasRaceExperience,isInjured);

@override
String toString() {
  return 'RunningProfile(weeklyMileage: $weeklyMileage, experienceLevel: $experienceLevel, preferredDistances: $preferredDistances, runsPerWeek: $runsPerWeek, hasRaceExperience: $hasRaceExperience, isInjured: $isInjured)';
}


}

/// @nodoc
abstract mixin class $RunningProfileCopyWith<$Res>  {
  factory $RunningProfileCopyWith(RunningProfile value, $Res Function(RunningProfile) _then) = _$RunningProfileCopyWithImpl;
@useResult
$Res call({
 double weeklyMileage, ExperienceLevel experienceLevel, List<PreferredDistance> preferredDistances, int runsPerWeek, bool hasRaceExperience, bool isInjured
});




}
/// @nodoc
class _$RunningProfileCopyWithImpl<$Res>
    implements $RunningProfileCopyWith<$Res> {
  _$RunningProfileCopyWithImpl(this._self, this._then);

  final RunningProfile _self;
  final $Res Function(RunningProfile) _then;

/// Create a copy of RunningProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? weeklyMileage = null,Object? experienceLevel = null,Object? preferredDistances = null,Object? runsPerWeek = null,Object? hasRaceExperience = null,Object? isInjured = null,}) {
  return _then(_self.copyWith(
weeklyMileage: null == weeklyMileage ? _self.weeklyMileage : weeklyMileage // ignore: cast_nullable_to_non_nullable
as double,experienceLevel: null == experienceLevel ? _self.experienceLevel : experienceLevel // ignore: cast_nullable_to_non_nullable
as ExperienceLevel,preferredDistances: null == preferredDistances ? _self.preferredDistances : preferredDistances // ignore: cast_nullable_to_non_nullable
as List<PreferredDistance>,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,hasRaceExperience: null == hasRaceExperience ? _self.hasRaceExperience : hasRaceExperience // ignore: cast_nullable_to_non_nullable
as bool,isInjured: null == isInjured ? _self.isInjured : isInjured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [RunningProfile].
extension RunningProfilePatterns on RunningProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RunningProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RunningProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RunningProfile value)  $default,){
final _that = this;
switch (_that) {
case _RunningProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RunningProfile value)?  $default,){
final _that = this;
switch (_that) {
case _RunningProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double weeklyMileage,  ExperienceLevel experienceLevel,  List<PreferredDistance> preferredDistances,  int runsPerWeek,  bool hasRaceExperience,  bool isInjured)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RunningProfile() when $default != null:
return $default(_that.weeklyMileage,_that.experienceLevel,_that.preferredDistances,_that.runsPerWeek,_that.hasRaceExperience,_that.isInjured);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double weeklyMileage,  ExperienceLevel experienceLevel,  List<PreferredDistance> preferredDistances,  int runsPerWeek,  bool hasRaceExperience,  bool isInjured)  $default,) {final _that = this;
switch (_that) {
case _RunningProfile():
return $default(_that.weeklyMileage,_that.experienceLevel,_that.preferredDistances,_that.runsPerWeek,_that.hasRaceExperience,_that.isInjured);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double weeklyMileage,  ExperienceLevel experienceLevel,  List<PreferredDistance> preferredDistances,  int runsPerWeek,  bool hasRaceExperience,  bool isInjured)?  $default,) {final _that = this;
switch (_that) {
case _RunningProfile() when $default != null:
return $default(_that.weeklyMileage,_that.experienceLevel,_that.preferredDistances,_that.runsPerWeek,_that.hasRaceExperience,_that.isInjured);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RunningProfile extends RunningProfile {
  const _RunningProfile({this.weeklyMileage = 0.0, this.experienceLevel = ExperienceLevel.intermediate, final  List<PreferredDistance> preferredDistances = const [], this.runsPerWeek = 4, this.hasRaceExperience = true, this.isInjured = false}): _preferredDistances = preferredDistances,super._();
  factory _RunningProfile.fromJson(Map<String, dynamic> json) => _$RunningProfileFromJson(json);

@override@JsonKey() final  double weeklyMileage;
@override@JsonKey() final  ExperienceLevel experienceLevel;
 final  List<PreferredDistance> _preferredDistances;
@override@JsonKey() List<PreferredDistance> get preferredDistances {
  if (_preferredDistances is EqualUnmodifiableListView) return _preferredDistances;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_preferredDistances);
}

@override@JsonKey() final  int runsPerWeek;
@override@JsonKey() final  bool hasRaceExperience;
@override@JsonKey() final  bool isInjured;

/// Create a copy of RunningProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RunningProfileCopyWith<_RunningProfile> get copyWith => __$RunningProfileCopyWithImpl<_RunningProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RunningProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RunningProfile&&(identical(other.weeklyMileage, weeklyMileage) || other.weeklyMileage == weeklyMileage)&&(identical(other.experienceLevel, experienceLevel) || other.experienceLevel == experienceLevel)&&const DeepCollectionEquality().equals(other._preferredDistances, _preferredDistances)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.hasRaceExperience, hasRaceExperience) || other.hasRaceExperience == hasRaceExperience)&&(identical(other.isInjured, isInjured) || other.isInjured == isInjured));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,weeklyMileage,experienceLevel,const DeepCollectionEquality().hash(_preferredDistances),runsPerWeek,hasRaceExperience,isInjured);

@override
String toString() {
  return 'RunningProfile(weeklyMileage: $weeklyMileage, experienceLevel: $experienceLevel, preferredDistances: $preferredDistances, runsPerWeek: $runsPerWeek, hasRaceExperience: $hasRaceExperience, isInjured: $isInjured)';
}


}

/// @nodoc
abstract mixin class _$RunningProfileCopyWith<$Res> implements $RunningProfileCopyWith<$Res> {
  factory _$RunningProfileCopyWith(_RunningProfile value, $Res Function(_RunningProfile) _then) = __$RunningProfileCopyWithImpl;
@override @useResult
$Res call({
 double weeklyMileage, ExperienceLevel experienceLevel, List<PreferredDistance> preferredDistances, int runsPerWeek, bool hasRaceExperience, bool isInjured
});




}
/// @nodoc
class __$RunningProfileCopyWithImpl<$Res>
    implements _$RunningProfileCopyWith<$Res> {
  __$RunningProfileCopyWithImpl(this._self, this._then);

  final _RunningProfile _self;
  final $Res Function(_RunningProfile) _then;

/// Create a copy of RunningProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? weeklyMileage = null,Object? experienceLevel = null,Object? preferredDistances = null,Object? runsPerWeek = null,Object? hasRaceExperience = null,Object? isInjured = null,}) {
  return _then(_RunningProfile(
weeklyMileage: null == weeklyMileage ? _self.weeklyMileage : weeklyMileage // ignore: cast_nullable_to_non_nullable
as double,experienceLevel: null == experienceLevel ? _self.experienceLevel : experienceLevel // ignore: cast_nullable_to_non_nullable
as ExperienceLevel,preferredDistances: null == preferredDistances ? _self._preferredDistances : preferredDistances // ignore: cast_nullable_to_non_nullable
as List<PreferredDistance>,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,hasRaceExperience: null == hasRaceExperience ? _self.hasRaceExperience : hasRaceExperience // ignore: cast_nullable_to_non_nullable
as bool,isInjured: null == isInjured ? _self.isInjured : isInjured // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
