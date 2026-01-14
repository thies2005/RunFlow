package com.runflow.app.ui.theme

import androidx.compose.ui.graphics.Color

// Brand Colors (matching Website exactly)
val AccentOrange = Color(0xFFff6b35)
val AccentPink = Color(0xFFf72585)
val AccentPurple = Color(0xFF7209b7)
val AccentCyan = Color(0xFF4cc9f0)
val StravaOrange = Color(0xFFfc4c02)

// Dark Theme Colors (matching website globals.css)
val DarkPrimary = Color(0xFFff6b35) // Orange - website primary
val DarkSecondary = Color(0xFFf72585) // Pink
val DarkTertiary = Color(0xFF4cc9f0) // Cyan

val DarkBackground = Color(0xFF0a0a0f) // Website: --background dark
val DarkBackgroundSecondary = Color(0xFF12121a) // Website: --background-secondary dark
val DarkSurface = Color(0xFF12121a) // Website: --background-secondary
val DarkSurfaceVariant = Color(0xFF1a1a25) // Website: --background-tertiary
val DarkOnPrimary = Color.White
val DarkOnBackground = Color(0xFFffffff) // Website: --foreground dark
val DarkOnSurfaceVariant = Color(0xFFa1a1aa) // Website: --foreground-muted

// Light Theme Colors (matching website globals.css)
val LightPrimary = Color(0xFFff6b35) // Orange - website primary
val LightSecondary = Color(0xFFf72585) // Pink
val LightTertiary = Color(0xFF00b4d8) // Cyan (light variant)

val LightBackground = Color(0xFFf8fafc) // Website: --background light
val LightBackgroundSecondary = Color(0xFFffffff) // Website: --background-secondary light
val LightSurface = Color(0xFFffffff) // White
val LightSurfaceVariant = Color(0xFFf1f5f9) // Website: --background-tertiary light
val LightOnPrimary = Color.White
val LightOnBackground = Color(0xFF0f172a) // Website: --foreground light
val LightOnSurfaceVariant = Color(0xFF64748b) // Website: --foreground-muted light

// Zone Colors (matching website tailwind.config.js)
val Zone1Easy = Color(0xFF4ade80) // Green
val Zone2Moderate = Color(0xFFa3e635) // Lime
val Zone3Threshold = Color(0xFFfacc15) // Yellow
val Zone4Hard = Color(0xFFfb923c) // Orange
val Zone5Max = Color(0xFFef4444) // Red

// Zone Colors for Light Mode (better contrast)
val Zone1EasyLight = Color(0xFF16a34a)
val Zone2ModerateLight = Color(0xFF65a30d)
val Zone3ThresholdLight = Color(0xFFd97706)
val Zone4HardLight = Color(0xFFea580c)

// Fitness Metric Colors (matching website)
val FitnessGreen = Color(0xFF4ade80) // CTL - Fitness
val FatigueOrange = Color(0xFFfb923c) // ATL - Fatigue
val FormCyan = Color(0xFF4cc9f0) // TSB positive
val FormRed = Color(0xFFef4444) // TSB negative

// Glass effects (for glassmorphism)
val GlassBorderDark = Color(0x1AFFFFFF) // 10% white
val GlassBorderLight = Color(0x14000000) // 8% black
val GlassBackgroundDark = Color(0x14FFFFFF) // 8% white
val GlassBackgroundLight = Color(0xB3FFFFFF) // 70% white
