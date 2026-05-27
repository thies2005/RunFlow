import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFFFF6B35);
  static const Color primaryDark = Color(0xFFE55A25);
  static const Color primaryLight = Color(0xFFFF8B5E);

  static const Color oledBlack = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF121212);
  static const Color surfaceDarkVariant = Color(0xFF1E1E1E);
  static const Color cardDark = Color(0xFF1A1A1A);

  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFFE0E0E0);
  static const Color onSurfaceVariant = Color(0xFF9E9E9E);

  static const Color error = Color(0xFFCF6679);
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFFC107);

  static const Color fresh = Color(0xFF4CAF50);
  static const Color neutral = Color(0xFFFFC107);
  static const Color fatigued = Color(0xFFFF9800);
  static const Color veryFatigued = Color(0xFFF44336);
  static const Color peaked = Color(0xFF00BCD4);
}

ThemeData buildLightTheme() {
  const colorScheme = ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.primaryLight,
    surface: Colors.white,
    onSurface: Colors.black87,
    surfaceContainerHighest: Color(0xFFF5F5F5),
    error: AppColors.error,
    onSurfaceVariant: Colors.black54,
  );

  return _buildTheme(colorScheme, Brightness.light);
}

ThemeData buildDarkTheme() {
  const colorScheme = ColorScheme.dark(
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.primaryDark,
    surface: AppColors.oledBlack,
    onSurface: AppColors.onSurface,
    surfaceContainerHighest: AppColors.surfaceDarkVariant,
    error: AppColors.error,
    onSurfaceVariant: AppColors.onSurfaceVariant,
    surfaceContainer: AppColors.cardDark,
  );

  return _buildTheme(colorScheme, Brightness.dark);
}

ThemeData _buildTheme(ColorScheme colorScheme, Brightness brightness) {
  final textTheme = GoogleFonts.interTextTheme(
    brightness == Brightness.dark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme,
  );

  final headlineTheme = GoogleFonts.outfitTextTheme(textTheme);

  return ThemeData(
    useMaterial3: true,
    splashFactory: InkRipple.splashFactory,
    colorScheme: colorScheme,
    brightness: brightness,
    scaffoldBackgroundColor: colorScheme.surface,
    textTheme: headlineTheme.apply(
      bodyColor: colorScheme.onSurface,
      displayColor: colorScheme.onSurface,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.outfit(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
      ),
    ),
    cardTheme: CardThemeData(
      color: colorScheme.surfaceContainerHighest,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: colorScheme.surface,
      selectedItemColor: colorScheme.primary,
      unselectedItemColor: colorScheme.onSurfaceVariant,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: colorScheme.primary,
      foregroundColor: colorScheme.onPrimary,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: colorScheme.surfaceContainerHighest,
      selectedColor: colorScheme.primary,
      labelStyle: TextStyle(color: colorScheme.onSurface),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colorScheme.surfaceContainerHighest,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.primary),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    dividerTheme: DividerThemeData(
      color: colorScheme.onSurfaceVariant.withValues(alpha: 0.12),
      thickness: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: colorScheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: colorScheme.primary,
      linearTrackColor: colorScheme.onSurfaceVariant.withValues(alpha: 0.12),
    ),
  );
}
