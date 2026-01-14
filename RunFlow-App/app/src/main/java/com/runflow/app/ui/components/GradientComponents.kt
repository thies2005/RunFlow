package com.runflow.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.runflow.app.ui.theme.AccentOrange
import com.runflow.app.ui.theme.AccentPink
import com.runflow.app.ui.theme.AccentPurple
import com.runflow.app.ui.theme.AccentCyan
import com.runflow.app.ui.theme.Zone1Easy

/**
 * Primary gradient button matching website's .btn-primary style
 * Uses Orange → Pink gradient (135deg)
 */
@Composable
fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 56.dp,
    cornerRadius: Dp = 12.dp
) {
    val gradient = Brush.linearGradient(
        colors = listOf(AccentOrange, AccentPink)
    )
    
    val disabledGradient = Brush.linearGradient(
        colors = listOf(
            AccentOrange.copy(alpha = 0.5f), 
            AccentPink.copy(alpha = 0.5f)
        )
    )
    
    Box(
        modifier = modifier
            .height(height)
            .shadow(
                elevation = if (enabled) 8.dp else 0.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = AccentPink.copy(alpha = 0.4f),
                spotColor = AccentPink.copy(alpha = 0.4f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(if (enabled) gradient else disabledGradient)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
    }
}

/**
 * Intensity gradient button matching website's gradient-intensity
 * Uses Orange → Pink → Purple gradient (135deg)
 */
@Composable
fun IntensityGradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 56.dp,
    cornerRadius: Dp = 12.dp
) {
    val gradient = Brush.linearGradient(
        colors = listOf(AccentOrange, AccentPink, AccentPurple)
    )
    
    Box(
        modifier = modifier
            .height(height)
            .shadow(
                elevation = if (enabled) 8.dp else 0.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = AccentPink.copy(alpha = 0.3f),
                spotColor = AccentPink.copy(alpha = 0.3f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(gradient)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
    }
}

/**
 * Recovery gradient button matching website's gradient-recovery
 * Uses Cyan → Green gradient (135deg)
 */
@Composable
fun RecoveryGradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 56.dp,
    cornerRadius: Dp = 12.dp
) {
    val gradient = Brush.linearGradient(
        colors = listOf(AccentCyan, Zone1Easy)
    )
    
    Box(
        modifier = modifier
            .height(height)
            .shadow(
                elevation = if (enabled) 8.dp else 0.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = AccentCyan.copy(alpha = 0.3f),
                spotColor = AccentCyan.copy(alpha = 0.3f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(gradient)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
    }
}

/**
 * Glass-morphism card modifier for surfaces
 * Simulates the website's glass-card effect
 */
@Composable
fun Modifier.glassCard(
    isDark: Boolean = true,
    cornerRadius: Dp = 16.dp
): Modifier {
    val glassBg = if (isDark) {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.08f),
                Color.White.copy(alpha = 0.03f)
            )
        )
    } else {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.7f),
                Color.White.copy(alpha = 0.85f)
            )
        )
    }
    
    return this
        .clip(RoundedCornerShape(cornerRadius))
        .background(glassBg)
}
