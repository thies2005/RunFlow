package com.runflow2.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.runflow2.app.domain.model.TsbStatus
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.ui.theme.StatusFatigued
import com.runflow2.app.ui.theme.StatusFresh
import com.runflow2.app.ui.theme.StatusNeutral
import com.runflow2.app.ui.theme.StatusPeaked
import com.runflow2.app.ui.theme.StatusVeryFatigued
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bedtime
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material.icons.outlined.Shuffle
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer

/** Icon + color mapping for workout types (mirrors Flutter WorkoutTheme). */
object WorkoutVisuals {
    data class Visual(val icon: ImageVector, val color: Color, val container: Color)

    fun forType(type: WorkoutType): Visual = when (type) {
        WorkoutType.EASY -> Visual(Icons.Outlined.DirectionsRun, Color(0xFF43A047), Color(0xFF1B3A1E))
        WorkoutType.LONG_RUN -> Visual(Icons.Outlined.Timer, Color(0xFF42A5F5), Color(0xFF14284A))
        WorkoutType.TEMPO -> Visual(Icons.Outlined.Speed, Color(0xFFFB8C00), Color(0xFF422900))
        WorkoutType.INTERVALS -> Visual(Icons.Outlined.Bolt, Color(0xFFEF5350), Color(0xFF4A1512))
        WorkoutType.FARTLEK -> Visual(Icons.Outlined.Shuffle, Color(0xFFAB47BC), Color(0xFF361A40))
        WorkoutType.REPETITIONS -> Visual(Icons.Outlined.Bolt, Color(0xFFEC407A), Color(0xFF46142B))
        WorkoutType.RECOVERY -> Visual(Icons.Outlined.SelfImprovement, Color(0xFF26A69A), Color(0xFF123B36))
        WorkoutType.RACE -> Visual(Icons.Outlined.EmojiEvents, Color(0xFFFFC107), Color(0xFF423200))
        WorkoutType.REST -> Visual(Icons.Outlined.Bedtime, Color(0xFF90A4AE), Color(0xFF253038))
        WorkoutType.CROSS_TRAIN -> Visual(Icons.Outlined.DirectionsBike, Color(0xFF00897B), Color(0xFF0E3733))
        WorkoutType.RIDE -> Visual(Icons.Outlined.DirectionsBike, Color(0xFF00ACC1), Color(0xFF0E3740))
        WorkoutType.SWIM -> Visual(Icons.Outlined.Pool, Color(0xFF039BE5), Color(0xFF0F3348))
        WorkoutType.STRENGTH -> Visual(Icons.Outlined.FitnessCenter, Color(0xFF7E57C2), Color(0xFF2B2350))
        WorkoutType.OTHER -> Visual(Icons.Outlined.DirectionsRun, Color(0xFF9E9E9E), Color(0xFF262626))
    }

    /** Softer container for light theme. */
    fun containerFor(type: WorkoutType, dark: Boolean): Color =
        if (dark) forType(type).container else forType(type).color.copy(alpha = 0.14f)
}

fun TsbStatus.color(): Color = when (this) {
    TsbStatus.PEAKED -> StatusPeaked
    TsbStatus.FRESH -> StatusFresh
    TsbStatus.NEUTRAL -> StatusNeutral
    TsbStatus.FATIGUED -> StatusFatigued
    TsbStatus.VERY_FATIGUED -> StatusVeryFatigued
}

/** Icon chip + label + value tile used across dashboard & analytics. */
@Composable
fun StatTile(
    label: String,
    value: String,
    icon: ImageVector,
    accent: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .background(accent.copy(alpha = 0.16f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(20.dp))
        }
        Column {
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun InfoChip(
    text: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    container: Color = MaterialTheme.colorScheme.surfaceContainerHighest,
    contentColor: Color = MaterialTheme.colorScheme.onSurface,
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
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (icon != null) Icon(icon, null, modifier = Modifier.size(14.dp))
            Text(text, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, trailing: (@Composable () -> Unit)? = null) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        trailing?.invoke()
    }
}
