package com.runflow.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.runflow.app.ui.components.GradientButton
import com.runflow.app.ui.theme.AccentOrange
import com.runflow.app.ui.theme.AccentPink
import com.runflow.app.ui.theme.AccentPurple
import com.runflow.app.ui.theme.DarkBackground

@Composable
fun WelcomeScreen(
    onGetStartedClick: () -> Unit
) {
    // Website-matching intensity gradient background
    val backgroundGradient = Brush.verticalGradient(
        colors = listOf(
            AccentOrange.copy(alpha = 0.2f),
            AccentPink.copy(alpha = 0.15f),
            AccentPurple.copy(alpha = 0.1f),
            DarkBackground
        )
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .background(backgroundGradient)
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App logo/title with gradient text effect
            Text(
                text = "RunFlow",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Performance dashboard & training plans for serious runners.",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = Color.White.copy(alpha = 0.85f)
                ),
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(64.dp))
            
            // Website-style gradient button
            GradientButton(
                text = "Get Started",
                onClick = onGetStartedClick,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
