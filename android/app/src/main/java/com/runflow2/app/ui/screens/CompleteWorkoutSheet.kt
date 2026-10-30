package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.repo.AppSettings
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompleteWorkoutSheet(
    workout: WorkoutEntity,
    container: AppContainer,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    val allActivities by container.repository.activities.collectAsState(initial = emptyList())
    val goalWorkouts by container.repository.workoutsForGoal(workout.goalId).collectAsState(initial = emptyList())
    var showMoreDays by remember { mutableStateOf(false) }
    var showAlreadyLinked by remember { mutableStateOf(false) }
    var selectedActivityId by remember { mutableStateOf<String?>(workout.activityId ?: workout.suggestedActivityId) }

    val workoutDate = remember(workout.scheduledDate) {
        Format.localDate(workout.scheduledDate)
    }

    val dayWindow = if (showMoreDays) 7L else 1L
    val startDateLimit = workoutDate.minusDays(dayWindow)
    val endDateLimit = workoutDate.plusDays(dayWindow)

    val linkedToOtherWorkoutMap: Map<String, WorkoutEntity> = remember(goalWorkouts, allActivities, workout.id) {
        buildMap {
            val actById = allActivities.associateBy { it.id }
            val actByServerId = allActivities.filter { it.serverId != null }.associateBy { it.serverId!! }
            for (w in goalWorkouts) {
                if (w.id != workout.id && w.activityId != null) {
                    val actId = w.activityId!!
                    put(actId, w)
                    actById[actId]?.serverId?.let { put(it, w) }
                    actByServerId[actId]?.let { put(it.id, w) }
                }
            }
        }
    }

    val allCandidateActivities = remember(allActivities, workoutDate, showMoreDays) {
        allActivities.filter { act ->
            val actDate = Format.localDate(act.startDate)
            !actDate.isBefore(startDateLimit) && !actDate.isAfter(endDateLimit)
        }.sortedByDescending { it.startDate }
    }

    val (unlinkedCandidates, alreadyLinkedCandidates) = remember(allCandidateActivities, linkedToOtherWorkoutMap, workout.activityId) {
        allCandidateActivities.partition { act ->
            val isLinkedToOther = act.id in linkedToOtherWorkoutMap || (act.serverId != null && act.serverId in linkedToOtherWorkoutMap)
            val isLinkedToCurrent = act.id == workout.activityId || (act.serverId != null && act.serverId == workout.activityId)
            !isLinkedToOther || isLinkedToCurrent
        }
    }

    val displayedActivities = if (showAlreadyLinked) allCandidateActivities else unlinkedCandidates

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Link,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (workout.isCompleted) "Link / Relink Activity" else "Complete Workout",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        workout.customName ?: workout.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            Text(
                "Select a recorded activity to pair with this planned workout (window: ±${dayWindow}d):",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (displayedActivities.isEmpty()) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            if (allCandidateActivities.isEmpty()) "No activities found within ±${dayWindow} days"
                            else "All activities within ±${dayWindow} days are already linked (${alreadyLinkedCandidates.size})",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (alreadyLinkedCandidates.isNotEmpty()) {
                            TextButton(onClick = { showAlreadyLinked = !showAlreadyLinked }) {
                                Text(
                                    if (showAlreadyLinked) "Hide already-linked activities (${alreadyLinkedCandidates.size})"
                                    else "Show already-linked activities (${alreadyLinkedCandidates.size})"
                                )
                            }
                        }
                        if (!showMoreDays) {
                            TextButton(onClick = { showMoreDays = true }) {
                                Text("Expand window to ±7 days")
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(displayedActivities, key = { it.id }) { act ->
                        val otherWorkout = linkedToOtherWorkoutMap[act.id] ?: act.serverId?.let { linkedToOtherWorkoutMap[it] }
                        val isSelected = selectedActivityId == act.id
                        CandidateActivityCard(
                            activity = act,
                            isSelected = isSelected,
                            unit = unit,
                            otherWorkout = if (act.id != workout.activityId && (act.serverId == null || act.serverId != workout.activityId)) otherWorkout else null,
                            onClick = {
                                selectedActivityId = if (isSelected) null else act.id
                            },
                        )
                    }

                    if (alreadyLinkedCandidates.isNotEmpty()) {
                        item {
                            TextButton(
                                onClick = { showAlreadyLinked = !showAlreadyLinked },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(
                                    if (showAlreadyLinked) "Hide already-linked activities (${alreadyLinkedCandidates.size})"
                                    else "Show already-linked activities (${alreadyLinkedCandidates.size})"
                                )
                            }
                        }
                    }

                    if (!showMoreDays) {
                        item {
                            TextButton(
                                onClick = { showMoreDays = true },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text("Show more activities (±7 days)")
                            }
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            container.repository.completeWorkoutWithActivity(workout.id, null)
                            onDismiss()
                        }
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Complete Without Activity", maxLines = 1, overflow = TextOverflow.Ellipsis)
                }

                Button(
                    onClick = {
                        val actId = selectedActivityId
                        if (actId != null) {
                            scope.launch {
                                container.repository.completeWorkoutWithActivity(workout.id, actId)
                                onDismiss()
                            }
                        }
                    },
                    enabled = selectedActivityId != null,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Link & Complete", maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun CandidateActivityCard(
    activity: ActivityEntity,
    isSelected: Boolean,
    unit: DistanceUnit,
    otherWorkout: WorkoutEntity? = null,
    onClick: () -> Unit,
) {
    val sportIcon = when (activity.type.uppercase()) {
        "RIDE", "BIKE", "VIRTUAL_RIDE", "CYCLING" -> Icons.Outlined.DirectionsBike
        "SWIM", "SWIMMING" -> Icons.Outlined.Pool
        "WORKOUT", "STRENGTH", "WEIGHT_TRAINING" -> Icons.Outlined.FitnessCenter
        else -> Icons.Outlined.DirectionsRun
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            else MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .then(
                if (isSelected) {
                    Modifier.border(1.5.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
                } else Modifier
            ),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            RadioButton(
                selected = isSelected,
                onClick = onClick,
            )

            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    sportIcon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(Modifier.weight(1f)) {
                Text(
                    activity.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${Format.distance(activity.distanceKm, unit)} · ${Format.duration(activity.movingTimeSec)} · ${Format.dateWithYear(Format.localDate(activity.startDate))}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (otherWorkout != null) {
                    Text(
                        "Already linked to ${otherWorkout.customName ?: otherWorkout.workoutType}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
