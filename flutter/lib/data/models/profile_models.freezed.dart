// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'profile_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$UserProfile {

 String get id; String? get email; String? get name; String? get image;@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? get sex;@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? get birthDate; int? get hrMax; int? get hrRest; double? get weight; double? get height; int? get hrZone1Max; int? get hrZone2Max; int? get hrZone3Max; int? get hrZone4Max; int? get hrZone5Max; int? get hrZone6Max; int? get thresholdHeartRate; int? get thresholdPace; double? get vdotCorrectionFactor;@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? get lastSyncAt;@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? get createdAt;
/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UserProfileCopyWith<UserProfile> get copyWith => _$UserProfileCopyWithImpl<UserProfile>(this as UserProfile, _$identity);

  /// Serializes this UserProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UserProfile&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.image, image) || other.image == image)&&(identical(other.sex, sex) || other.sex == sex)&&(identical(other.birthDate, birthDate) || other.birthDate == birthDate)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax)&&(identical(other.hrRest, hrRest) || other.hrRest == hrRest)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.height, height) || other.height == height)&&(identical(other.hrZone1Max, hrZone1Max) || other.hrZone1Max == hrZone1Max)&&(identical(other.hrZone2Max, hrZone2Max) || other.hrZone2Max == hrZone2Max)&&(identical(other.hrZone3Max, hrZone3Max) || other.hrZone3Max == hrZone3Max)&&(identical(other.hrZone4Max, hrZone4Max) || other.hrZone4Max == hrZone4Max)&&(identical(other.hrZone5Max, hrZone5Max) || other.hrZone5Max == hrZone5Max)&&(identical(other.hrZone6Max, hrZone6Max) || other.hrZone6Max == hrZone6Max)&&(identical(other.thresholdHeartRate, thresholdHeartRate) || other.thresholdHeartRate == thresholdHeartRate)&&(identical(other.thresholdPace, thresholdPace) || other.thresholdPace == thresholdPace)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,email,name,image,sex,birthDate,hrMax,hrRest,weight,height,hrZone1Max,hrZone2Max,hrZone3Max,hrZone4Max,hrZone5Max,hrZone6Max,thresholdHeartRate,thresholdPace,vdotCorrectionFactor,lastSyncAt,createdAt]);

@override
String toString() {
  return 'UserProfile(id: $id, email: $email, name: $name, image: $image, sex: $sex, birthDate: $birthDate, hrMax: $hrMax, hrRest: $hrRest, weight: $weight, height: $height, hrZone1Max: $hrZone1Max, hrZone2Max: $hrZone2Max, hrZone3Max: $hrZone3Max, hrZone4Max: $hrZone4Max, hrZone5Max: $hrZone5Max, hrZone6Max: $hrZone6Max, thresholdHeartRate: $thresholdHeartRate, thresholdPace: $thresholdPace, vdotCorrectionFactor: $vdotCorrectionFactor, lastSyncAt: $lastSyncAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class $UserProfileCopyWith<$Res>  {
  factory $UserProfileCopyWith(UserProfile value, $Res Function(UserProfile) _then) = _$UserProfileCopyWithImpl;
@useResult
$Res call({
 String id, String? email, String? name, String? image,@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? birthDate, int? hrMax, int? hrRest, double? weight, double? height, int? hrZone1Max, int? hrZone2Max, int? hrZone3Max, int? hrZone4Max, int? hrZone5Max, int? hrZone6Max, int? thresholdHeartRate, int? thresholdPace, double? vdotCorrectionFactor,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? lastSyncAt,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? createdAt
});




}
/// @nodoc
class _$UserProfileCopyWithImpl<$Res>
    implements $UserProfileCopyWith<$Res> {
  _$UserProfileCopyWithImpl(this._self, this._then);

  final UserProfile _self;
  final $Res Function(UserProfile) _then;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? email = freezed,Object? name = freezed,Object? image = freezed,Object? sex = freezed,Object? birthDate = freezed,Object? hrMax = freezed,Object? hrRest = freezed,Object? weight = freezed,Object? height = freezed,Object? hrZone1Max = freezed,Object? hrZone2Max = freezed,Object? hrZone3Max = freezed,Object? hrZone4Max = freezed,Object? hrZone5Max = freezed,Object? hrZone6Max = freezed,Object? thresholdHeartRate = freezed,Object? thresholdPace = freezed,Object? vdotCorrectionFactor = freezed,Object? lastSyncAt = freezed,Object? createdAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,image: freezed == image ? _self.image : image // ignore: cast_nullable_to_non_nullable
as String?,sex: freezed == sex ? _self.sex : sex // ignore: cast_nullable_to_non_nullable
as Sex?,birthDate: freezed == birthDate ? _self.birthDate : birthDate // ignore: cast_nullable_to_non_nullable
as DateTime?,hrMax: freezed == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int?,hrRest: freezed == hrRest ? _self.hrRest : hrRest // ignore: cast_nullable_to_non_nullable
as int?,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as double?,hrZone1Max: freezed == hrZone1Max ? _self.hrZone1Max : hrZone1Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone2Max: freezed == hrZone2Max ? _self.hrZone2Max : hrZone2Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone3Max: freezed == hrZone3Max ? _self.hrZone3Max : hrZone3Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone4Max: freezed == hrZone4Max ? _self.hrZone4Max : hrZone4Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone5Max: freezed == hrZone5Max ? _self.hrZone5Max : hrZone5Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone6Max: freezed == hrZone6Max ? _self.hrZone6Max : hrZone6Max // ignore: cast_nullable_to_non_nullable
as int?,thresholdHeartRate: freezed == thresholdHeartRate ? _self.thresholdHeartRate : thresholdHeartRate // ignore: cast_nullable_to_non_nullable
as int?,thresholdPace: freezed == thresholdPace ? _self.thresholdPace : thresholdPace // ignore: cast_nullable_to_non_nullable
as int?,vdotCorrectionFactor: freezed == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double?,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [UserProfile].
extension UserProfilePatterns on UserProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UserProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UserProfile value)  $default,){
final _that = this;
switch (_that) {
case _UserProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UserProfile value)?  $default,){
final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String? email,  String? name,  String? image, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? lastSyncAt, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.image,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor,_that.lastSyncAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String? email,  String? name,  String? image, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? lastSyncAt, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? createdAt)  $default,) {final _that = this;
switch (_that) {
case _UserProfile():
return $default(_that.id,_that.email,_that.name,_that.image,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor,_that.lastSyncAt,_that.createdAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String? email,  String? name,  String? image, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? lastSyncAt, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson)  DateTime? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _UserProfile() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.image,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor,_that.lastSyncAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UserProfile extends UserProfile {
  const _UserProfile({required this.id, this.email, this.name, this.image, @JsonKey(fromJson: sexFromJson, toJson: sexToJson) this.sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) this.birthDate, this.hrMax, this.hrRest, this.weight, this.height, this.hrZone1Max, this.hrZone2Max, this.hrZone3Max, this.hrZone4Max, this.hrZone5Max, this.hrZone6Max, this.thresholdHeartRate, this.thresholdPace, this.vdotCorrectionFactor, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) this.lastSyncAt, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) this.createdAt}): super._();
  factory _UserProfile.fromJson(Map<String, dynamic> json) => _$UserProfileFromJson(json);

@override final  String id;
@override final  String? email;
@override final  String? name;
@override final  String? image;
@override@JsonKey(fromJson: sexFromJson, toJson: sexToJson) final  Sex? sex;
@override@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) final  DateTime? birthDate;
@override final  int? hrMax;
@override final  int? hrRest;
@override final  double? weight;
@override final  double? height;
@override final  int? hrZone1Max;
@override final  int? hrZone2Max;
@override final  int? hrZone3Max;
@override final  int? hrZone4Max;
@override final  int? hrZone5Max;
@override final  int? hrZone6Max;
@override final  int? thresholdHeartRate;
@override final  int? thresholdPace;
@override final  double? vdotCorrectionFactor;
@override@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) final  DateTime? lastSyncAt;
@override@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) final  DateTime? createdAt;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UserProfileCopyWith<_UserProfile> get copyWith => __$UserProfileCopyWithImpl<_UserProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UserProfileToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UserProfile&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.image, image) || other.image == image)&&(identical(other.sex, sex) || other.sex == sex)&&(identical(other.birthDate, birthDate) || other.birthDate == birthDate)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax)&&(identical(other.hrRest, hrRest) || other.hrRest == hrRest)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.height, height) || other.height == height)&&(identical(other.hrZone1Max, hrZone1Max) || other.hrZone1Max == hrZone1Max)&&(identical(other.hrZone2Max, hrZone2Max) || other.hrZone2Max == hrZone2Max)&&(identical(other.hrZone3Max, hrZone3Max) || other.hrZone3Max == hrZone3Max)&&(identical(other.hrZone4Max, hrZone4Max) || other.hrZone4Max == hrZone4Max)&&(identical(other.hrZone5Max, hrZone5Max) || other.hrZone5Max == hrZone5Max)&&(identical(other.hrZone6Max, hrZone6Max) || other.hrZone6Max == hrZone6Max)&&(identical(other.thresholdHeartRate, thresholdHeartRate) || other.thresholdHeartRate == thresholdHeartRate)&&(identical(other.thresholdPace, thresholdPace) || other.thresholdPace == thresholdPace)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,email,name,image,sex,birthDate,hrMax,hrRest,weight,height,hrZone1Max,hrZone2Max,hrZone3Max,hrZone4Max,hrZone5Max,hrZone6Max,thresholdHeartRate,thresholdPace,vdotCorrectionFactor,lastSyncAt,createdAt]);

@override
String toString() {
  return 'UserProfile(id: $id, email: $email, name: $name, image: $image, sex: $sex, birthDate: $birthDate, hrMax: $hrMax, hrRest: $hrRest, weight: $weight, height: $height, hrZone1Max: $hrZone1Max, hrZone2Max: $hrZone2Max, hrZone3Max: $hrZone3Max, hrZone4Max: $hrZone4Max, hrZone5Max: $hrZone5Max, hrZone6Max: $hrZone6Max, thresholdHeartRate: $thresholdHeartRate, thresholdPace: $thresholdPace, vdotCorrectionFactor: $vdotCorrectionFactor, lastSyncAt: $lastSyncAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$UserProfileCopyWith<$Res> implements $UserProfileCopyWith<$Res> {
  factory _$UserProfileCopyWith(_UserProfile value, $Res Function(_UserProfile) _then) = __$UserProfileCopyWithImpl;
@override @useResult
$Res call({
 String id, String? email, String? name, String? image,@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? birthDate, int? hrMax, int? hrRest, double? weight, double? height, int? hrZone1Max, int? hrZone2Max, int? hrZone3Max, int? hrZone4Max, int? hrZone5Max, int? hrZone6Max, int? thresholdHeartRate, int? thresholdPace, double? vdotCorrectionFactor,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? lastSyncAt,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateTimeToJson) DateTime? createdAt
});




}
/// @nodoc
class __$UserProfileCopyWithImpl<$Res>
    implements _$UserProfileCopyWith<$Res> {
  __$UserProfileCopyWithImpl(this._self, this._then);

  final _UserProfile _self;
  final $Res Function(_UserProfile) _then;

/// Create a copy of UserProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? email = freezed,Object? name = freezed,Object? image = freezed,Object? sex = freezed,Object? birthDate = freezed,Object? hrMax = freezed,Object? hrRest = freezed,Object? weight = freezed,Object? height = freezed,Object? hrZone1Max = freezed,Object? hrZone2Max = freezed,Object? hrZone3Max = freezed,Object? hrZone4Max = freezed,Object? hrZone5Max = freezed,Object? hrZone6Max = freezed,Object? thresholdHeartRate = freezed,Object? thresholdPace = freezed,Object? vdotCorrectionFactor = freezed,Object? lastSyncAt = freezed,Object? createdAt = freezed,}) {
  return _then(_UserProfile(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,image: freezed == image ? _self.image : image // ignore: cast_nullable_to_non_nullable
as String?,sex: freezed == sex ? _self.sex : sex // ignore: cast_nullable_to_non_nullable
as Sex?,birthDate: freezed == birthDate ? _self.birthDate : birthDate // ignore: cast_nullable_to_non_nullable
as DateTime?,hrMax: freezed == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int?,hrRest: freezed == hrRest ? _self.hrRest : hrRest // ignore: cast_nullable_to_non_nullable
as int?,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as double?,hrZone1Max: freezed == hrZone1Max ? _self.hrZone1Max : hrZone1Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone2Max: freezed == hrZone2Max ? _self.hrZone2Max : hrZone2Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone3Max: freezed == hrZone3Max ? _self.hrZone3Max : hrZone3Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone4Max: freezed == hrZone4Max ? _self.hrZone4Max : hrZone4Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone5Max: freezed == hrZone5Max ? _self.hrZone5Max : hrZone5Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone6Max: freezed == hrZone6Max ? _self.hrZone6Max : hrZone6Max // ignore: cast_nullable_to_non_nullable
as int?,thresholdHeartRate: freezed == thresholdHeartRate ? _self.thresholdHeartRate : thresholdHeartRate // ignore: cast_nullable_to_non_nullable
as int?,thresholdPace: freezed == thresholdPace ? _self.thresholdPace : thresholdPace // ignore: cast_nullable_to_non_nullable
as int?,vdotCorrectionFactor: freezed == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double?,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}


/// @nodoc
mixin _$UpdateProfileRequest {

 String? get name;@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? get sex;@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson) DateTime? get birthDate; int? get hrMax; int? get hrRest; double? get weight; double? get height; int? get hrZone1Max; int? get hrZone2Max; int? get hrZone3Max; int? get hrZone4Max; int? get hrZone5Max; int? get hrZone6Max; int? get thresholdHeartRate; int? get thresholdPace; double? get vdotCorrectionFactor;
/// Create a copy of UpdateProfileRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UpdateProfileRequestCopyWith<UpdateProfileRequest> get copyWith => _$UpdateProfileRequestCopyWithImpl<UpdateProfileRequest>(this as UpdateProfileRequest, _$identity);

  /// Serializes this UpdateProfileRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UpdateProfileRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.sex, sex) || other.sex == sex)&&(identical(other.birthDate, birthDate) || other.birthDate == birthDate)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax)&&(identical(other.hrRest, hrRest) || other.hrRest == hrRest)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.height, height) || other.height == height)&&(identical(other.hrZone1Max, hrZone1Max) || other.hrZone1Max == hrZone1Max)&&(identical(other.hrZone2Max, hrZone2Max) || other.hrZone2Max == hrZone2Max)&&(identical(other.hrZone3Max, hrZone3Max) || other.hrZone3Max == hrZone3Max)&&(identical(other.hrZone4Max, hrZone4Max) || other.hrZone4Max == hrZone4Max)&&(identical(other.hrZone5Max, hrZone5Max) || other.hrZone5Max == hrZone5Max)&&(identical(other.hrZone6Max, hrZone6Max) || other.hrZone6Max == hrZone6Max)&&(identical(other.thresholdHeartRate, thresholdHeartRate) || other.thresholdHeartRate == thresholdHeartRate)&&(identical(other.thresholdPace, thresholdPace) || other.thresholdPace == thresholdPace)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,sex,birthDate,hrMax,hrRest,weight,height,hrZone1Max,hrZone2Max,hrZone3Max,hrZone4Max,hrZone5Max,hrZone6Max,thresholdHeartRate,thresholdPace,vdotCorrectionFactor);

@override
String toString() {
  return 'UpdateProfileRequest(name: $name, sex: $sex, birthDate: $birthDate, hrMax: $hrMax, hrRest: $hrRest, weight: $weight, height: $height, hrZone1Max: $hrZone1Max, hrZone2Max: $hrZone2Max, hrZone3Max: $hrZone3Max, hrZone4Max: $hrZone4Max, hrZone5Max: $hrZone5Max, hrZone6Max: $hrZone6Max, thresholdHeartRate: $thresholdHeartRate, thresholdPace: $thresholdPace, vdotCorrectionFactor: $vdotCorrectionFactor)';
}


}

/// @nodoc
abstract mixin class $UpdateProfileRequestCopyWith<$Res>  {
  factory $UpdateProfileRequestCopyWith(UpdateProfileRequest value, $Res Function(UpdateProfileRequest) _then) = _$UpdateProfileRequestCopyWithImpl;
@useResult
$Res call({
 String? name,@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson) DateTime? birthDate, int? hrMax, int? hrRest, double? weight, double? height, int? hrZone1Max, int? hrZone2Max, int? hrZone3Max, int? hrZone4Max, int? hrZone5Max, int? hrZone6Max, int? thresholdHeartRate, int? thresholdPace, double? vdotCorrectionFactor
});




}
/// @nodoc
class _$UpdateProfileRequestCopyWithImpl<$Res>
    implements $UpdateProfileRequestCopyWith<$Res> {
  _$UpdateProfileRequestCopyWithImpl(this._self, this._then);

  final UpdateProfileRequest _self;
  final $Res Function(UpdateProfileRequest) _then;

/// Create a copy of UpdateProfileRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = freezed,Object? sex = freezed,Object? birthDate = freezed,Object? hrMax = freezed,Object? hrRest = freezed,Object? weight = freezed,Object? height = freezed,Object? hrZone1Max = freezed,Object? hrZone2Max = freezed,Object? hrZone3Max = freezed,Object? hrZone4Max = freezed,Object? hrZone5Max = freezed,Object? hrZone6Max = freezed,Object? thresholdHeartRate = freezed,Object? thresholdPace = freezed,Object? vdotCorrectionFactor = freezed,}) {
  return _then(_self.copyWith(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,sex: freezed == sex ? _self.sex : sex // ignore: cast_nullable_to_non_nullable
as Sex?,birthDate: freezed == birthDate ? _self.birthDate : birthDate // ignore: cast_nullable_to_non_nullable
as DateTime?,hrMax: freezed == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int?,hrRest: freezed == hrRest ? _self.hrRest : hrRest // ignore: cast_nullable_to_non_nullable
as int?,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as double?,hrZone1Max: freezed == hrZone1Max ? _self.hrZone1Max : hrZone1Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone2Max: freezed == hrZone2Max ? _self.hrZone2Max : hrZone2Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone3Max: freezed == hrZone3Max ? _self.hrZone3Max : hrZone3Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone4Max: freezed == hrZone4Max ? _self.hrZone4Max : hrZone4Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone5Max: freezed == hrZone5Max ? _self.hrZone5Max : hrZone5Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone6Max: freezed == hrZone6Max ? _self.hrZone6Max : hrZone6Max // ignore: cast_nullable_to_non_nullable
as int?,thresholdHeartRate: freezed == thresholdHeartRate ? _self.thresholdHeartRate : thresholdHeartRate // ignore: cast_nullable_to_non_nullable
as int?,thresholdPace: freezed == thresholdPace ? _self.thresholdPace : thresholdPace // ignore: cast_nullable_to_non_nullable
as int?,vdotCorrectionFactor: freezed == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [UpdateProfileRequest].
extension UpdateProfileRequestPatterns on UpdateProfileRequest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UpdateProfileRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UpdateProfileRequest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UpdateProfileRequest value)  $default,){
final _that = this;
switch (_that) {
case _UpdateProfileRequest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UpdateProfileRequest value)?  $default,){
final _that = this;
switch (_that) {
case _UpdateProfileRequest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? name, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UpdateProfileRequest() when $default != null:
return $default(_that.name,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? name, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor)  $default,) {final _that = this;
switch (_that) {
case _UpdateProfileRequest():
return $default(_that.name,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? name, @JsonKey(fromJson: sexFromJson, toJson: sexToJson)  Sex? sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson)  DateTime? birthDate,  int? hrMax,  int? hrRest,  double? weight,  double? height,  int? hrZone1Max,  int? hrZone2Max,  int? hrZone3Max,  int? hrZone4Max,  int? hrZone5Max,  int? hrZone6Max,  int? thresholdHeartRate,  int? thresholdPace,  double? vdotCorrectionFactor)?  $default,) {final _that = this;
switch (_that) {
case _UpdateProfileRequest() when $default != null:
return $default(_that.name,_that.sex,_that.birthDate,_that.hrMax,_that.hrRest,_that.weight,_that.height,_that.hrZone1Max,_that.hrZone2Max,_that.hrZone3Max,_that.hrZone4Max,_that.hrZone5Max,_that.hrZone6Max,_that.thresholdHeartRate,_that.thresholdPace,_that.vdotCorrectionFactor);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UpdateProfileRequest extends UpdateProfileRequest {
  const _UpdateProfileRequest({this.name, @JsonKey(fromJson: sexFromJson, toJson: sexToJson) this.sex, @JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson) this.birthDate, this.hrMax, this.hrRest, this.weight, this.height, this.hrZone1Max, this.hrZone2Max, this.hrZone3Max, this.hrZone4Max, this.hrZone5Max, this.hrZone6Max, this.thresholdHeartRate, this.thresholdPace, this.vdotCorrectionFactor}): super._();
  factory _UpdateProfileRequest.fromJson(Map<String, dynamic> json) => _$UpdateProfileRequestFromJson(json);

@override final  String? name;
@override@JsonKey(fromJson: sexFromJson, toJson: sexToJson) final  Sex? sex;
@override@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson) final  DateTime? birthDate;
@override final  int? hrMax;
@override final  int? hrRest;
@override final  double? weight;
@override final  double? height;
@override final  int? hrZone1Max;
@override final  int? hrZone2Max;
@override final  int? hrZone3Max;
@override final  int? hrZone4Max;
@override final  int? hrZone5Max;
@override final  int? hrZone6Max;
@override final  int? thresholdHeartRate;
@override final  int? thresholdPace;
@override final  double? vdotCorrectionFactor;

/// Create a copy of UpdateProfileRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UpdateProfileRequestCopyWith<_UpdateProfileRequest> get copyWith => __$UpdateProfileRequestCopyWithImpl<_UpdateProfileRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UpdateProfileRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _UpdateProfileRequest&&(identical(other.name, name) || other.name == name)&&(identical(other.sex, sex) || other.sex == sex)&&(identical(other.birthDate, birthDate) || other.birthDate == birthDate)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax)&&(identical(other.hrRest, hrRest) || other.hrRest == hrRest)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.height, height) || other.height == height)&&(identical(other.hrZone1Max, hrZone1Max) || other.hrZone1Max == hrZone1Max)&&(identical(other.hrZone2Max, hrZone2Max) || other.hrZone2Max == hrZone2Max)&&(identical(other.hrZone3Max, hrZone3Max) || other.hrZone3Max == hrZone3Max)&&(identical(other.hrZone4Max, hrZone4Max) || other.hrZone4Max == hrZone4Max)&&(identical(other.hrZone5Max, hrZone5Max) || other.hrZone5Max == hrZone5Max)&&(identical(other.hrZone6Max, hrZone6Max) || other.hrZone6Max == hrZone6Max)&&(identical(other.thresholdHeartRate, thresholdHeartRate) || other.thresholdHeartRate == thresholdHeartRate)&&(identical(other.thresholdPace, thresholdPace) || other.thresholdPace == thresholdPace)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,sex,birthDate,hrMax,hrRest,weight,height,hrZone1Max,hrZone2Max,hrZone3Max,hrZone4Max,hrZone5Max,hrZone6Max,thresholdHeartRate,thresholdPace,vdotCorrectionFactor);

@override
String toString() {
  return 'UpdateProfileRequest(name: $name, sex: $sex, birthDate: $birthDate, hrMax: $hrMax, hrRest: $hrRest, weight: $weight, height: $height, hrZone1Max: $hrZone1Max, hrZone2Max: $hrZone2Max, hrZone3Max: $hrZone3Max, hrZone4Max: $hrZone4Max, hrZone5Max: $hrZone5Max, hrZone6Max: $hrZone6Max, thresholdHeartRate: $thresholdHeartRate, thresholdPace: $thresholdPace, vdotCorrectionFactor: $vdotCorrectionFactor)';
}


}

/// @nodoc
abstract mixin class _$UpdateProfileRequestCopyWith<$Res> implements $UpdateProfileRequestCopyWith<$Res> {
  factory _$UpdateProfileRequestCopyWith(_UpdateProfileRequest value, $Res Function(_UpdateProfileRequest) _then) = __$UpdateProfileRequestCopyWithImpl;
@override @useResult
$Res call({
 String? name,@JsonKey(fromJson: sexFromJson, toJson: sexToJson) Sex? sex,@JsonKey(fromJson: flexibleDateTimeFromJson, toJson: dateOnlyToJson) DateTime? birthDate, int? hrMax, int? hrRest, double? weight, double? height, int? hrZone1Max, int? hrZone2Max, int? hrZone3Max, int? hrZone4Max, int? hrZone5Max, int? hrZone6Max, int? thresholdHeartRate, int? thresholdPace, double? vdotCorrectionFactor
});




}
/// @nodoc
class __$UpdateProfileRequestCopyWithImpl<$Res>
    implements _$UpdateProfileRequestCopyWith<$Res> {
  __$UpdateProfileRequestCopyWithImpl(this._self, this._then);

  final _UpdateProfileRequest _self;
  final $Res Function(_UpdateProfileRequest) _then;

/// Create a copy of UpdateProfileRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = freezed,Object? sex = freezed,Object? birthDate = freezed,Object? hrMax = freezed,Object? hrRest = freezed,Object? weight = freezed,Object? height = freezed,Object? hrZone1Max = freezed,Object? hrZone2Max = freezed,Object? hrZone3Max = freezed,Object? hrZone4Max = freezed,Object? hrZone5Max = freezed,Object? hrZone6Max = freezed,Object? thresholdHeartRate = freezed,Object? thresholdPace = freezed,Object? vdotCorrectionFactor = freezed,}) {
  return _then(_UpdateProfileRequest(
name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,sex: freezed == sex ? _self.sex : sex // ignore: cast_nullable_to_non_nullable
as Sex?,birthDate: freezed == birthDate ? _self.birthDate : birthDate // ignore: cast_nullable_to_non_nullable
as DateTime?,hrMax: freezed == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int?,hrRest: freezed == hrRest ? _self.hrRest : hrRest // ignore: cast_nullable_to_non_nullable
as int?,weight: freezed == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double?,height: freezed == height ? _self.height : height // ignore: cast_nullable_to_non_nullable
as double?,hrZone1Max: freezed == hrZone1Max ? _self.hrZone1Max : hrZone1Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone2Max: freezed == hrZone2Max ? _self.hrZone2Max : hrZone2Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone3Max: freezed == hrZone3Max ? _self.hrZone3Max : hrZone3Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone4Max: freezed == hrZone4Max ? _self.hrZone4Max : hrZone4Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone5Max: freezed == hrZone5Max ? _self.hrZone5Max : hrZone5Max // ignore: cast_nullable_to_non_nullable
as int?,hrZone6Max: freezed == hrZone6Max ? _self.hrZone6Max : hrZone6Max // ignore: cast_nullable_to_non_nullable
as int?,thresholdHeartRate: freezed == thresholdHeartRate ? _self.thresholdHeartRate : thresholdHeartRate // ignore: cast_nullable_to_non_nullable
as int?,thresholdPace: freezed == thresholdPace ? _self.thresholdPace : thresholdPace // ignore: cast_nullable_to_non_nullable
as int?,vdotCorrectionFactor: freezed == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}

// dart format on
