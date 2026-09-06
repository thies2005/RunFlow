package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

private data class Page(
    val icon: ImageVector,
    val title: String,
    val body: String,
)

@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val pages = listOf(
        Page(
            Icons.Outlined.RadioButtonChecked,
            "Record every run",
            "GPS tracking with live pace coaching, auto-lap splits, auto-pause and a voice coach that keeps you in your target zone.",
        ),
        Page(
            Icons.Outlined.CalendarMonth,
            "Plan with purpose",
            "Phased training plans for 17 race types — from 5K to Backyard Ultra — with long-run progression and pace targets from your VDOT.",
        ),
        Page(
            Icons.Outlined.Insights,
            "Train smarter",
            "Fitness, fatigue and form (CTL · ATL · TSB), race predictions, Daniels training paces and heart-rate zone analysis.",
        ),
    )
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()

    Column(
        Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(0.5f))

        HorizontalPager(state = pagerState, modifier = Modifier.weight(4f)) { i ->
            val page = pages[i]
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier
                        .size(140.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        page.icon, null,
                        modifier = Modifier.size(72.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                Spacer(Modifier.height(32.dp))
                Text(
                    page.title,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    page.body,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // page indicator
        Row(
            Modifier.padding(vertical = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            repeat(pages.size) { i ->
                Box(
                    Modifier
                        .size(if (pagerState.currentPage == i) 10.dp else 8.dp)
                        .background(
                            if (pagerState.currentPage == i) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outlineVariant,
                            CircleShape,
                        ),
                )
            }
        }

        Spacer(Modifier.weight(0.4f))

        if (pagerState.currentPage < pages.size - 1) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = onDone,
                    modifier = Modifier.weight(1f),
                ) { Text("Skip") }
                Button(
                    onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } },
                    modifier = Modifier.weight(1f),
                ) { Text("Next") }
            }
        } else {
            Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.DirectionsRun, null)
                Spacer(Modifier.width(8.dp))
                Text("Let's run")
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}
