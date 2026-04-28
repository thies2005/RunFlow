-keep class * extends com.google.gson.TypeAdapterFactory
-keep class * extends com.google.gson.JsonSerializer
-keep class * extends com.google.gson.JsonDeserializer

-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

-keep class **.freezed.** { *; }
-keep class **.g.dart.** { *; }

-keep class retrofit2.** { *; }
-keepclassmembers,allowobfuscation interface * {
  @retrofit2.http.* <methods>;
}

-keep class io.fabric.** { *; }
-dontwarn io.fabric.**

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Health Connect plugin
-keep class androidx.health.** { *; }
-dontwarn androidx.health.**
-keep class plugin.health.** { *; }
-dontwarn plugin.health.**

# Health Flutter plugin platform channel
-keep class cachet.plugins.health.** { *; }
-dontwarn cachet.plugins.health.**
-keep class io.flutter.plugins.** { *; }
