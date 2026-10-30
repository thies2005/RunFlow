package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Undo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.core.util.LoginPrompt
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.raceType
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.components.DailyFormSheet
import com.runflow2.app.ui.components.InfoChip
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.components.WorkoutVisuals
import com.runflow2.app.ui.components.themedColor
import com.runflow2.app.ui.theme.semanticColors
import com.runflow2.app.domain.model.TsbStatus
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.AdaptationMode
import com.runflow2.app.domain.plan.SmartScheduler
import com.runflow2.app.domain.plan.TriathlonTimeEstimator
import com.runflow2.app.domain.readiness.DataConfidence
import com.runflow2.app.domain.readiness.ReadinessResult
import com.runflow2.app.domain.readiness.ReadinessScoring
import com.runflow2.app.domain.readiness.ReadinessState
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DashboardScreen(
    container: AppContainer,
    onOpenActivity: (String) -> Unit,
    onOpenAnalyticsSection: (String?) -> Unit,
    onStartWorkout: (String?) -> Unit,
    onCreatePlan: () -> Unit,
    onOpenActivities: () -> Unit,
    onLogin: () -> Unit = {},
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    // Evaluated on every recomposition so "this week" rolls over at midnight
    // instead of freezing to the date of the first composition.
    val today = LocalDate.now()

    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val activeGoal by container.repository.activeGoal.collectAsState(initial = null)
    val workouts = activeGoal?.let { goal ->
        container.repository.workoutsForGoal(goal.id).collectAsState(initial = emptyList()).value
    } ?: emptyList()
    // Athlete profile powers the greeting + initials avatar (same pattern as AthleteScreen).
    val profile by container.repository.profile.collectAsState(initial = null)

    // ---- sign-in nudge: shows until signed in, permanently dismissed, or snoozed ----
    // Gated on auth.initialized so the dialog can't flash for an already
    // signed-in user while the persisted session is still being restored.
    val auth by container.authStore.state.collectAsState()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    var dismissedAdaptations by rememberSaveable { mutableStateOf(setOf<String>()) }
    var loginPromptHidden by remember { mutableStateOf(false) }
    var showDailyForm by remember { mutableStateOf(false) }
    val now = remember { System.currentTimeMillis() }
    val showLoginPrompt = auth.initialized && !loginPromptHidden && LoginPrompt.shouldShow(
        loggedIn = auth.loggedIn,
        dismissed = settings.loginPromptDismissed,
        remindAt = settings.loginPromptRemindAt,
        now = now,
        offlineModeChosen = settings.offlineModeChosen,
    )

    val analytics by produceState<AnalyticsBundle?>(null, activities) {
        value = container.repository.analytics(365)
    }

    // ---- recovery square input: today's entry ----
    val todayEntry by container.repository.dailyEntryFlow(today).collectAsState(initial = null)

    var hidePlanReminder by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(false) }
    val weekStart = today.with(DayOfWeek.MONDAY)
    val weekActivities = activities.filter {
        val d = Format.localDate(it.startDate)
        !d.isBefore(weekStart) && !d.isAfter(today)
    }
    val runsThisWeek = weekActivities.count { it.type == "RUN" }
    val ridesThisWeek = weekActivities.count { Format.isRideType(it.type) }
    val otherThisWeek = weekActivities.size - runsThisWeek - ridesThisWeek

    // Pull-to-refresh runs a full sync including the server-side Strava
    // import; the analytics produceState re-runs on its own once Room updates.
    val syncStatus by container.syncManager.status.collectAsState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    PullToRefreshBox(
        isRefreshing = syncStatus.running,
        onRefresh = {
            container.appScope.launch {
                container.syncManager.syncNow("pull-refresh", forceStrava = true)
            }
        },
        modifier = Modifier.fillMaxSize(),
    ) {
        Scaffold(
            modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("RunFlow", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                            Text(
                                Format.dateWithYear(today),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                    scrollBehavior = scrollBehavior,
                )
            },
        ) { padding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                // ---- Greeting header ----
                item {
                    val nameWords = (profile?.name?.trim() ?: "")
                        .split(Regex("\\s+"))
                        .filter { it.isNotBlank() }
                    val firstName = nameWords.firstOrNull() ?: "athlete"
                    val initials = nameWords.take(2)
                        .mapNotNull { word -> word.firstOrNull()?.uppercaseChar() }
                        .joinToString("")
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                "${greetingFor(LocalTime.now())}, $firstName",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Box(
                            Modifier
                                .size(44.dp)
                                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                initials,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        }
                    }
                }

                // ---- This week ----
                item {
                    val a = analytics
                    // Fitness gets a change caption so it doesn't look frozen:
                    // reference is the newest daily point at least 7 days old
                    // (the first entry when the series is younger); suppressed
                    // when the change rounds to zero.
                    val ctlDelta = a?.let { bundle ->
                        val ref = bundle.daily.lastOrNull { it.date <= today.minusDays(7) }
                            ?: bundle.daily.firstOrNull()
                        ref?.let { bundle.ctl - it.ctl }
                    }?.takeIf { abs(it) >= 0.05 }
                    Card(
                        shape = CardShape,
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        "This week",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                    Text(
                                        Format.distance(a?.currentWeekKm ?: 0.0, unit),
                                        style = MaterialTheme.typography.displaySmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                val weekGoal = activeGoal?.weeklyKmGoal
                                if (weekGoal != null && weekGoal > 0) {
                                    ProgressRing(
                                        progress = ((a?.currentWeekKm ?: 0.0) / weekGoal).toFloat(),
                                        modifier = Modifier.size(64.dp),
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                StatTile(
                                    label = if (ridesThisWeek > 0 || otherThisWeek > 0) "Runs · Rides" else "Runs",
                                    value = if (ridesThisWeek > 0 || otherThisWeek > 0) {
                                        "$runsThisWeek · $ridesThisWeek" + (if (otherThisWeek > 0) " (+$otherThisWeek)" else "")
                                    } else "$runsThisWeek",
                                    icon = Icons.Outlined.DirectionsRun,
                                )
                                StatTile(
                                    label = "Fitness",
                                    value = Format.intOrDash(a?.ctl),
                                    icon = Icons.Outlined.Favorite,
                                    accent = MaterialTheme.colorScheme.primary,
                                    caption = ctlDelta?.let {
                                        if (it > 0) "Δ7d +${Format.oneDecimal(it)}"
                                        else "Δ7d -${Format.oneDecimal(abs(it))}"
                                    },
                                    captionGood = ctlDelta?.let { it > 0 },
                                )
                            }
                        }
                    }
                }

                // ---- Recovery + Form quick squares ----
                item {
                    val a = analytics
                    val entry = todayEntry
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Recovery — today's readiness; tap for the detailed trends
                        val stateColor = readinessColor(entry?.state)
                        Card(
                            shape = MetricCardShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    if (entry == null) showDailyForm = true
                                    else onOpenAnalyticsSection("recovery")
                                },
                        ) {
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Box(
                                        Modifier
                                            .size(10.dp)
                                            .background(stateColor, CircleShape),
                                    )
                                    Text(
                                        "Recovery",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(
                                        entry?.score?.roundToInt()?.toString() ?: "—",
                                        style = MaterialTheme.typography.headlineLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = if (entry != null) stateColor
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (entry?.state != null) {
                                        InfoChip(
                                            text = entry.state.replaceFirstChar { it.uppercase() },
                                            container = stateColor.copy(alpha = 0.15f),
                                            contentColor = stateColor,
                                        )
                                    }
                                }
                                Text(
                                    when {
                                        entry == null -> "Tap to log how you feel"
                                        entry.restingHr != null || entry.hrvMs != null ->
                                            listOfNotNull(
                                                entry.restingHr?.let { "$it bpm" },
                                                entry.hrvMs?.let { "${it.roundToInt()} ms" },
                                            ).joinToString(" · ")
                                        else -> "No vitals yet"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        // Form — fitness/fatigue status; tap for the detailed trends
                        val status = a?.tsbStatus ?: TsbStatus.NEUTRAL
                        Card(
                            shape = MetricCardShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onOpenAnalyticsSection("form") },
                        ) {
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Box(
                                        Modifier
                                            .size(10.dp)
                                            .background(status.themedColor(), CircleShape),
                                    )
                                    Text(
                                        "Form",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                Text(
                                    status.label,
                                    style = MaterialTheme.typography.headlineLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = status.themedColor(),
                                )
                                Text(
                                    "TSB ${if (a != null && a.tsb > 0) "+" else ""}${Format.intOrDash(a?.tsb)} · CTL ${Format.intOrDash(a?.ctl)} · ATL ${Format.intOrDash(a?.atl)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }

                // ---- Race countdown ----
                if (activeGoal != null) {
                    item {
                        val goal = activeGoal!!
                        val raceDate = Format.localDate(goal.raceDate)
                        val daysToGo = ChronoUnit.DAYS.between(today, raceDate)
                        val done = workouts.count { it.isCompleted }
                        val total = workouts.size.coerceAtLeast(1)
                        val a = analytics
                        val race = goal.raceType()
                        // "Now" projection: the HR-based aerobic VO2max is the
                        // primary race-prediction VO2max (training VDOT is the
                        // fallback), penalised by the current marathon shape.
                        // Triathlon goals project the WHOLE race (swim + T1 +
                        // bike + T2 + run) — a run-distance prediction would
                        // show just the run leg (~1:40 for a middle distance).
                        val vo2 = a?.aerobicVo2max ?: a?.effectiveVdot
                        val nowPredicted = if (race.tri) {
                            vo2?.let { TriathlonTimeEstimator.estimate(it, race)?.projected?.totalSeconds }
                        } else {
                            (goal.customDistanceKm ?: race.distanceKm)?.let { km ->
                                vo2?.let {
                                    VdotMath.predictTimeWithShapeSec(
                                        it,
                                        km * 1000.0,
                                        a?.marathonShape?.roundToInt() ?: 100,
                                    )?.toInt()
                                }
                            }
                        }
                        Card(
                            shape = CardShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(
                                        Icons.Outlined.EmojiEvents, null,
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(goal.name, style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            "${goal.raceType().label} · ${Format.dateWithYear(raceDate)}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "$daysToGo",
                                            style = MaterialTheme.typography.headlineMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                        Text(
                                            if (daysToGo == 1L) "day to go" else "days to go",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }

                                LinearProgressIndicator(
                                    progress = { done.toFloat() / total },
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                Text(
                                    "$done of $total workouts completed",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )

                                if (goal.targetTimeSec != null) {
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column {
                                            Text("Goal", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(Format.duration(goal.targetTimeSec), style = MaterialTheme.typography.titleMedium)
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Now", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(
                                                nowPredicted?.let { Format.duration(it) } ?: "—",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (!hidePlanReminder) {
                    item {
                        Card(
                            shape = CardShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCreatePlan() },
                        ) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Flag, null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("No active goal", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        "Build a personalized training plan",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                TextButton(onClick = { hidePlanReminder = true }) {
                                    Text("Hide")
                                }
                                Icon(Icons.Outlined.Add, null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                // ---- Today's workout ----
                val todayWorkouts = workouts.filter { Format.localDate(it.scheduledDate) == today }
                if (todayWorkouts.isNotEmpty()) {
                    item {
                        SectionTitle("Today")
                        Spacer(Modifier.height(8.dp))
                        todayWorkouts.forEach { w ->
                            val type = runCatching { WorkoutType.valueOf(w.workoutType) }.getOrDefault(WorkoutType.EASY)
                            val visual = WorkoutVisuals.themedForType(type)
                            val readinessScore = todayEntry?.score
                            val isUncompletedNonRest = !w.isCompleted && type != WorkoutType.REST

                            // Auto-link confirmation banner (Decision U2)
                            if (w.suggestedActivityId != null) {
                                val suggestedAct = activities.firstOrNull { it.id == w.suggestedActivityId }
                                val actName = suggestedAct?.name ?: "Activity"
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 8.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text(
                                            "🔗 Link \"$actName\" to this workout?",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier.weight(1f),
                                        )
                                        TextButton(
                                            onClick = {
                                                scope.launch {
                                                    container.repository.acceptSuggestedActivityLink(w.id)
                                                }
                                            },
                                        ) {
                                            Text("Accept", fontWeight = FontWeight.Bold)
                                        }
                                        TextButton(
                                            onClick = {
                                                scope.launch {
                                                    container.repository.dismissSuggestedActivityLink(w.id)
                                                }
                                            },
                                        ) {
                                            Text("Dismiss")
                                        }
                                    }
                                }
                            }

                            // 1-tap Undo banner if workout has an active adaptation
                            if (w.adaptationType != null) {
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.4f),
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 8.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text(
                                            if (w.adaptationType == "REDUCE") "Adapted: Volume reduced (-25%)" else "Adapted: Rescheduled",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Medium,
                                            modifier = Modifier.weight(1f),
                                        )
                                        TextButton(
                                            onClick = {
                                                scope.launch {
                                                    val undone = container.repository.undoLastEdit(w.goalId)
                                                    if (undone) {
                                                        snackbarHostState.showSnackbar("Adaptation undone")
                                                    }
                                                }
                                            },
                                        ) {
                                            Icon(Icons.Outlined.Undo, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(4.dp))
                                            Text("Undo")
                                        }
                                    }
                                }
                            }

                            Card(
                                shape = CardShape,
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp),
                            ) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            Modifier
                                                .size(40.dp)
                                                .background(visual.container, CircleShape),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(visual.icon, type.label, tint = visual.color)
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(type.label, style = MaterialTheme.typography.titleMedium)
                                            Text(
                                                w.description,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 2,
                                            )
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        w.targetDistanceKm?.let {
                                            InfoChip(Format.distance(it, unit), icon = Icons.Outlined.DirectionsRun)
                                        }
                                        Format.paceLabelFor(w.workoutType, w.targetPaceSecPerKm?.toDouble(), unit)?.let {
                                            InfoChip(it, icon = Icons.Outlined.Speed)
                                        }
                                        w.targetDurationSec?.let {
                                            InfoChip(Format.duration(it), icon = Icons.Outlined.Timer)
                                        }
                                    }

                                    // Adaptive Today Card (< 65: Reduce Today + Reschedule)
                                    val showAdaptivePrompt = readinessScore != null &&
                                        readinessScore < 65.0 &&
                                        isUncompletedNonRest &&
                                        w.id !in dismissedAdaptations &&
                                        w.adaptationType == null

                                    if (showAdaptivePrompt) {
                                        val readinessResult = ReadinessResult(
                                            compositeScore = readinessScore!!,
                                            state = when {
                                                readinessScore >= 50.0 -> ReadinessState.MODERATE
                                                readinessScore >= 30.0 -> ReadinessState.REDUCED
                                                else -> ReadinessState.REST
                                            },
                                            confidence = DataConfidence.FULL,
                                            componentScores = emptyList(),
                                            reasons = emptyList(),
                                            adaptationType = if (readinessScore < 50.0) {
                                                com.runflow2.app.domain.readiness.AdaptationType.SWAP_TO_EASY
                                            } else {
                                                com.runflow2.app.domain.readiness.AdaptationType.VOLUME_REDUCTION
                                            },
                                        )
                                        val reduceAdaptation = ReadinessScoring.buildReduceAdaptation(w, readinessResult)
                                        val reduceLabel = reduceAdaptation?.title ?: if (readinessScore < 50.0) "Swap to Easy" else "Reduce Today (-25%)"

                                        val rescheduleAdaptation = ReadinessScoring.buildRescheduleAdaptation(w, workouts, readinessResult, today)
                                        val targetDate = rescheduleAdaptation?.recommendedDate
                                            ?: SmartScheduler.findSmartRescheduleDay(w, workouts, today)
                                        val dayName = targetDate?.dayOfWeek?.name?.lowercase()?.replaceFirstChar { it.uppercase() }
                                        val rescheduleLabel = if (dayName != null) "Reschedule (Move to $dayName)" else "Reschedule"

                                        Card(
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(
                                                containerColor = MaterialTheme.semanticColors.statusFatigued.copy(alpha = 0.12f),
                                            ),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Column(
                                                modifier = Modifier.padding(12.dp),
                                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                ) {
                                                    Icon(
                                                        Icons.Outlined.Tune,
                                                        contentDescription = null,
                                                        tint = MaterialTheme.semanticColors.statusFatigued,
                                                        modifier = Modifier.size(18.dp),
                                                    )
                                                    Text(
                                                        "Low Readiness (${readinessScore.roundToInt()})",
                                                        style = MaterialTheme.typography.titleSmall,
                                                        fontWeight = FontWeight.SemiBold,
                                                    )
                                                }
                                                Text(
                                                    "Adapt today's session to aid recovery and avoid excessive strain.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                ) {
                                                    OutlinedButton(
                                                        onClick = {
                                                            scope.launch {
                                                                container.repository.applyWorkoutAdaptation(w.id, AdaptationMode.REDUCE)
                                                                val res = snackbarHostState.showSnackbar(
                                                                    message = "Workout volume reduced by 25%",
                                                                    actionLabel = "Undo",
                                                                    duration = SnackbarDuration.Short,
                                                                )
                                                                if (res == SnackbarResult.ActionPerformed) {
                                                                    container.repository.undoLastEdit(w.goalId)
                                                                }
                                                            }
                                                        },
                                                        modifier = Modifier.weight(1f),
                                                    ) {
                                                        Text(reduceLabel, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelSmall)
                                                    }
                                                    if (targetDate != null) {
                                                        OutlinedButton(
                                                            onClick = {
                                                                scope.launch {
                                                                    container.repository.applyWorkoutAdaptation(w.id, AdaptationMode.RESCHEDULE)
                                                                    val res = snackbarHostState.showSnackbar(
                                                                        message = "Workout moved to $dayName",
                                                                        actionLabel = "Undo",
                                                                        duration = SnackbarDuration.Short,
                                                                    )
                                                                    if (res == SnackbarResult.ActionPerformed) {
                                                                        container.repository.undoLastEdit(w.goalId)
                                                                    }
                                                                }
                                                            },
                                                            modifier = Modifier.weight(1f),
                                                        ) {
                                                            Text(rescheduleLabel, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelSmall)
                                                        }
                                                    }
                                                }
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.End,
                                                ) {
                                                    TextButton(
                                                        onClick = {
                                                            dismissedAdaptations = dismissedAdaptations + w.id
                                                        },
                                                    ) {
                                                        Text("Keep Original", style = MaterialTheme.typography.labelMedium)
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (!w.isCompleted && type != WorkoutType.REST) {
                                        Button(
                                            onClick = { onStartWorkout(w.id) },
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Icon(Icons.Outlined.PlayArrow, null)
                                            Spacer(Modifier.width(6.dp))
                                            Text("Start workout")
                                        }
                                    } else if (w.isCompleted) {
                                        InfoChip(
                                            "Completed",
                                            container = MaterialTheme.colorScheme.secondaryContainer,
                                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ---- Recent activities ----
                item {
                    SectionTitle(
                        "Recent activities",
                        trailing = {
                            TextButton(onClick = onOpenActivities) { Text("All") }
                        },
                    )
                }
                val recent = activities.take(5)
                items(recent, key = { it.id }) { a ->
                    Card(
                        shape = CardShape,
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenActivity(a.id) },
                    ) {
                        Row(
                            Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            val type = runCatching { WorkoutType.valueOf(a.trainingType ?: "EASY") }
                                .getOrDefault(WorkoutType.EASY)
                            val visual = WorkoutVisuals.themedForType(type)
                            Box(
                                Modifier
                                    .size(40.dp)
                                    .background(visual.container, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(visual.icon, null, tint = visual.color)
                            }
                            Column(Modifier.weight(1f)) {
                                Text(
                                    a.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    maxLines = 1,
                                )
                                Text(
                                    "${Format.distance(a.distanceKm, unit)} · ${Format.duration(a.movingTimeSec)} · ${
                                        Format.activityPaceLabel(a.type, a.paceSecPerKm, unit) ?: "—"
                                    }",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                Format.relativeDay(Format.localDate(a.startDate), today),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // ---- Weekly volume mini ----
                item {
                    analytics?.let { a ->
                        Card(
                            shape = CardShape,
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                SectionTitle("Weekly volume")
                                Spacer(Modifier.height(12.dp))
                                WeeklyVolumeBars(
                                    weeks = a.weeklyVolume.takeLast(16),
                                    unitLabel = Format.distanceUnitLabel(unit),
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // ---- sign-in nudge dialog (Sign in / Remind in a week / Dismiss) ----
    if (showLoginPrompt) {
        AlertDialog(
            onDismissRequest = { loginPromptHidden = true },
            title = { Text("Sign in to sync your training") },
            text = {
                Text(
                    "Sign in with email or Strava to back up runs, sync plans across devices and use the AI coach. " +
                        "Your data always lives on this phone — signing in adds a synced copy on your account.",
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        loginPromptHidden = true
                        onLogin()
                    },
                ) { Text("Sign in") }
            },
            dismissButton = {
                androidx.compose.foundation.layout.Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    TextButton(
                        onClick = {
                            loginPromptHidden = true
                            scope.launch {
                                container.settings.setLoginPromptRemindAt(
                                    LoginPrompt.remindInAWeek(System.currentTimeMillis())
                                )
                            }
                        },
                    ) { Text("Remind in a week") }
                    TextButton(
                        onClick = {
                            loginPromptHidden = true
                            scope.launch { container.settings.setLoginPromptDismissed() }
                        },
                    ) { Text("Dismiss") }
                }
            },
        )
    }

    // ---- daily recovery form sheet ----
    if (showDailyForm) {
        DailyFormSheet(container = container, onDismiss = { showDailyForm = false })
    }
}

/** Floating-card corner radii: hero/week cards 24dp, compact metric cards 20dp. */
private val CardShape = RoundedCornerShape(24.dp)
private val MetricCardShape = RoundedCornerShape(20.dp)

/** Time-of-day greeting: morning before noon, afternoon before 6pm, evening after. */
private fun greetingFor(now: LocalTime): String = when {
    now.hour < 12 -> "Good morning"
    now.hour < 18 -> "Good afternoon"
    else -> "Good evening"
}

/**
 * Color for a readiness state wire name ("excellent" | "good" | …), using
 * scheme tones; "reduced" gets a warning orange (the app's StatusFatigued
 * tone) since the color scheme has no orange of its own. Null/unavailable
 * falls back to onSurfaceVariant.
 */
@Composable
private fun readinessColor(state: String?): Color = when (state) {
    "excellent" -> MaterialTheme.colorScheme.primary
    "good" -> MaterialTheme.colorScheme.tertiary
    "moderate" -> MaterialTheme.colorScheme.secondary
    "reduced" -> MaterialTheme.semanticColors.statusFatigued
    "rest" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

@Composable
private fun readinessStateColor(state: String?): Color = readinessColor(state)

/** Deltas under 0.5 count as stable (neutral tone). */
private fun deltaTone(delta: Double, lowerIsBetter: Boolean): Boolean? = when {
    abs(delta) < 0.5 -> null
    lowerIsBetter -> delta < 0
    else -> delta > 0
}

private fun deltaCaption(delta: Double): String = when {
    abs(delta) < 0.5 -> "stable vs 7-day avg"
    delta < 0 -> "▽ ${abs(delta).roundToInt()} vs 7-day avg"
    else -> "△ ${abs(delta).roundToInt()} vs 7-day avg"
}

/** StatTile variant whose third line carries a colored delta vs baseline. */
@Composable
private fun MetricDeltaTile(
    label: String,
    value: String,
    caption: String?,
    captionGood: Boolean?,
    icon: ImageVector,
    accent: Color,
) {
    Row(
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
            if (caption != null) {
                Text(
                    caption,
                    style = MaterialTheme.typography.bodySmall,
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
