# Keep Compose runtime
-keep class androidx.compose.runtime.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# kotlinx-serialization (R8 full mode)
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keep,includedescriptorclasses class com.runflow2.app.**$$serializer { *; }
-keepclassmembers class com.runflow2.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.runflow2.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit / OkHttp
-keepattributes Signature, Exceptions
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-dontwarn javax.annotation.**

# WorkManager instantiates workers reflectively
-keep class * extends androidx.work.ListenableWorker {
    <init>(...);
}
