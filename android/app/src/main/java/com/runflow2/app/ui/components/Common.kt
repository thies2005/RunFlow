@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package com.runflow2.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bedtime
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material.icons.outlined.Shuffle
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.runflow2.app.domain.model.TsbStatus
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.ui.theme.SegmentedCardShapes
import com.runflow2.app.ui.theme.StatusFatigued
import com.runflow2.app.ui.theme.StatusFresh
import com.runflow2.app.ui.theme.StatusNeutral
import com.runflow2.app.ui.theme.StatusPeaked
import com.runflow2.app.ui.theme.StatusVeryFatigued
import com.runflow2.app.ui.theme.semanticColors

/**
 * Icon + harmonized color mapping for workout types.
 * Groups workouts into cohesive intensity families while keeping distinct icons,
 * and harmonizes toward the active Pixel Monet palette when called from Compose.
 */
object WorkoutVisuals {
    data class Visual(val icon: ImageVector, val color: Color, val container: Color)

    private fun seedForType(type: WorkoutType): Visual = when (type) {
        WorkoutType.EASY -> Visual(Icons.Outlined.DirectionsRun, Color(0xFF34A853), Color(0xFF1B3A1E))
        WorkoutType.RECOVERY -> Visual(Icons.Outlined.SelfImprovement, Color(0xFF26A69A), Color(0xFF123B36))
        WorkoutType.LONG_RUN -> Visual(Icons.Outlined.Timer, Color(0xFF4285F4), Color(0xFF14284A))
        WorkoutType.TEMPO -> Visual(Icons.Outlined.Speed, Color(0xFFFB8C00), Color(0xFF422900))
        WorkoutType.INTERVALS -> Visual(Icons.Outlined.Bolt, Color(0xFFEA4335), Color(0xFF4A1512))
        WorkoutType.FARTLEK -> Visual(Icons.Outlined.Shuffle, Color(0xFFAB47BC), Color(0xFF361A40))
        WorkoutType.REPETITIONS -> Visual(Icons.Outlined.Bolt, Color(0xFFEC407A), Color(0xFF46142B))
        WorkoutType.RACE -> Visual(Icons.Outlined.EmojiEvents, Color(0xFFFBBC04), Color(0xFF423200))
        WorkoutType.REST -> Visual(Icons.Outlined.Bedtime, Color(0xFF78909C), Color(0xFF253038))
        WorkoutType.CROSS_TRAIN -> Visual(Icons.Outlined.DirectionsBike, Color(0xFF00897B), Color(0xFF0E3733))
        WorkoutType.RIDE -> Visual(Icons.Outlined.DirectionsBike, Color(0xFF00ACC1), Color(0xFF0E3740))
        WorkoutType.SWIM -> Visual(Icons.Outlined.Pool, Color(0xFF039BE5), Color(0xFF0F3348))
        WorkoutType.STRENGTH -> Visual(Icons.Outlined.FitnessCenter, Color(0xFF7E57C2), Color(0xFF2B2350))
        WorkoutType.OTHER -> Visual(Icons.Outlined.DirectionsRun, Color(0xFF90A4AE), Color(0xFF262626))
    }

    fun forType(type: WorkoutType): Visual = seedForType(type)

    @Composable
    @ReadOnlyComposable
    fun themedForType(type: WorkoutType): Visual {
        val base = seedForType(type)
        val pair = MaterialTheme.semanticColors.harmonizePair(base.color)
        return Visual(base.icon, pair.accent, pair.container)
    }

    fun containerFor(type: WorkoutType, dark: Boolean): Color =
        if (dark) seedForType(type).container else seedForType(type).color.copy(alpha = 0.14f)

    @Composable
    @ReadOnlyComposable
    fun themeContainerFor(type: WorkoutType): Color = themedForType(type).container

    @Composable
    @ReadOnlyComposable
    fun themeColorFor(type: WorkoutType): Color = themedForType(type).color
}

fun TsbStatus.color(): Color = when (this) {
    TsbStatus.PEAKED -> StatusPeaked
    TsbStatus.FRESH -> StatusFresh
    TsbStatus.NEUTRAL -> StatusNeutral
    TsbStatus.FATIGUED -> StatusFatigued
    TsbStatus.VERY_FATIGUED -> StatusVeryFatigued
}

@Composable
@ReadOnlyComposable
fun TsbStatus.themedColor(): Color {
    val s = MaterialTheme.semanticColors
    return when (this) {
        TsbStatus.PEAKED -> s.statusPeaked
        TsbStatus.FRESH -> s.statusFresh
        TsbStatus.NEUTRAL -> s.statusNeutral
        TsbStatus.FATIGUED -> s.statusFatigued
        TsbStatus.VERY_FATIGUED -> s.statusVeryFatigued
    }
}

/** Green used for "good direction" delta captions. */
val DeltaGood = Color(0xFF34A853)

/** Icon badge + label + tabular value tile used across dashboard & analytics. */
@Composable
fun StatTile(
    label: String,
    value: String,
    icon: ImageVector,
    accent: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier,
    caption: String? = null,
    captionGood: Boolean? = null,
) {
    val pair = MaterialTheme.semanticColors.harmonizePair(accent)
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(pair.container, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = pair.accent, modifier = Modifier.size(20.dp))
        }
        Column {
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (caption != null) {
                Text(
                    caption,
                    style = MaterialTheme.typography.labelSmall,
                    color = when (captionGood) {
                        true -> MaterialTheme.semanticColors.good
                        false -> MaterialTheme.colorScheme.error
                        null -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
fun InfoChip(
    text: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    container: Color = MaterialTheme.colorScheme.surfaceContainerHighest,
    contentColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
) {
    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = container,
        contentColor = contentColor,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            if (icon != null) Icon(icon, null, modifier = Modifier.size(14.dp))
            Text(text, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
fun SectionTitle(
    text: String,
    modifier: Modifier = Modifier,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        trailing?.invoke()
    }
}

/**
 * Pixel Settings style Switch with a check icon inside the thumb when checked.
 */
@Composable
fun PixelSwitch(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Switch(
        checked = checked,
        onCheckedChange = onCheckedChange,
        modifier = modifier,
        enabled = enabled,
        thumbContent = if (checked) {
            {
                Icon(
                    imageVector = Icons.Outlined.Check,
                    contentDescription = null,
                    modifier = Modifier.size(SwitchDefaults.IconSize),
                )
            }
        } else {
            null
        },
    )
}

/**
 * Android 15/16 Pixel Settings segmented item surface (`24.dp` outer corners,
 * `4.dp` inner corners, `surfaceContainerLow` / `surfaceContainer` background).
 */
@Composable
fun SegmentedSurface(
    index: Int,
    count: Int,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.surfaceContainerLow,
    outerRadius: Dp = 24.dp,
    innerRadius: Dp = 4.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val shape = SegmentedCardShapes.shapeForIndex(index, count, outerRadius, innerRadius)
    if (onClick != null) {
        Surface(
            onClick = onClick,
            modifier = modifier.fillMaxWidth(),
            shape = shape,
            color = color,
            content = content,
        )
    } else {
        Surface(
            modifier = modifier.fillMaxWidth(),
            shape = shape,
            color = color,
            content = content,
        )
    }
}

/**
 * Pixel Settings grouped preference row inside a segmented list.
 */
@Composable
fun PixelSettingRow(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    icon: ImageVector? = null,
    index: Int = 0,
    count: Int = 1,
    containerColor: Color = MaterialTheme.colorScheme.surfaceContainerLow,
    onClick: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val shape = SegmentedCardShapes.shapeForIndex(index, count)
    ListItem(
        headlineContent = { Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium) },
        supportingContent = if (!subtitle.isNullOrBlank()) {
            { Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else null,
        leadingContent = if (icon != null) {
            {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(MaterialTheme.colorScheme.secondaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        } else null,
        trailingContent = trailing,
        colors = ListItemDefaults.colors(containerColor = containerColor),
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .let { if (onClick != null) it.clickable(onClick = onClick) else it },
    )
}

/**
 * Material 3 Expressive morphing loading indicator used across Pixel system apps.
 */
@Composable
fun PixelLoadingBox(
    modifier: Modifier = Modifier,
    message: String? = null,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        LoadingIndicator(modifier = Modifier.size(48.dp))
        if (message != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/**
 * Clean Pixel system-app empty state card / placeholder.
 */
@Composable
fun PixelEmptyState(
    icon: ImageVector,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .background(MaterialTheme.colorScheme.secondaryContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSecondaryContainer,
                modifier = Modifier.size(34.dp),
            )
        }
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        if (action != null) {
            Spacer(Modifier.height(4.dp))
            action()
        }
    }
}
