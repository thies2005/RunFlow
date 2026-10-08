package com.runflow2.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.DailyEntryEntity
import kotlinx.coroutines.launch
import java.time.LocalDate
import kotlin.math.roundToInt

private const val SLIDER_DEFAULT = 5

/**
 * Bottom sheet for editing today's daily entry (RHR / HRV / sleep / the
 * three subjective sliders / a note). Loads the existing row once as the
 * editing base; saving merges the edited fields on top of it via
 * [com.runflow2.app.data.repo.RunFlowRepository.saveManualDailyEntry], so
 * fields the form leaves blank keep their stored value (Health Connect
 * stage data like deep/REM/light sleep is never touched).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DailyFormSheet(
    container: AppContainer,
    onDismiss: () -> Unit,
) {
    var base by remember { mutableStateOf<DailyEntryEntity?>(null) }
    var loaded by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        base = container.repository.dailyEntryByDate(LocalDate.now().toString())
        loaded = true
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        if (!loaded) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else {
            DailyFormContent(
                base = base,
                onSave = { entry ->
                    // Process-lifetime scope: the save must survive the sheet
                    // leaving composition the moment onDismiss() fires.
                    container.appScope.launch {
                        container.repository.saveManualDailyEntry(entry)
                    }
                    onDismiss()
                },
            )
        }
    }
}

@Composable
private fun DailyFormContent(
    base: DailyEntryEntity?,
    onSave: (DailyEntryEntity) -> Unit,
) {
    val today = remember { LocalDate.now() }

    var rhrText by remember { mutableStateOf(base?.restingHr?.toString().orEmpty()) }
    var hrvText by remember { mutableStateOf(base?.hrvMs.toFieldText()) }
    var sleepText by remember { mutableStateOf(base?.sleepMinutes?.toString().orEmpty()) }
    var note by remember { mutableStateOf(base?.note.orEmpty()) }

    // The sliders display 5 when nothing was ever recorded, but a null
    // answer stays null until the user actually moves the slider — moving
    // one marks it "touched" and only touched answers are saved.
    var exhaustion by remember { mutableStateOf(base?.exhaustionLevel ?: SLIDER_DEFAULT) }
    var exhaustionTouched by remember { mutableStateOf(false) }
    var soreness by remember { mutableStateOf(base?.muscleSoreness ?: SLIDER_DEFAULT) }
    var sorenessTouched by remember { mutableStateOf(false) }
    var stress by remember { mutableStateOf(base?.stressLevel ?: SLIDER_DEFAULT) }
    var stressTouched by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column {
            Text(
                "Daily recovery",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                Format.relativeDay(today),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // ---- Resting heart rate ----
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionTitle(
                "Resting heart rate",
                trailing = {
                    if (base?.sourceRhr == "hc") SourceBadge()
                },
            )
            OutlinedTextField(
                value = rhrText,
                onValueChange = { rhrText = it.filter(Char::isDigit).take(3) },
                label = { Text("Beats per minute") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // ---- HRV ----
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionTitle(
                "Heart-rate variability",
                trailing = {
                    if (base?.sourceHrv == "hc") SourceBadge()
                },
            )
            OutlinedTextField(
                value = hrvText,
                onValueChange = { hrvText = sanitizeDecimal(it).take(5) },
                label = { Text("RMSSD (ms)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // ---- Sleep ----
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionTitle(
                "Sleep",
                trailing = {
                    if (base?.sourceSleep == "hc") SourceBadge()
                },
            )
            OutlinedTextField(
                value = sleepText,
                onValueChange = { sleepText = it.filter(Char::isDigit).take(4) },
                label = { Text("Total minutes") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            val deep = base?.deepMinutes
            val rem = base?.remMinutes
            if (deep != null || rem != null) {
                Text(
                    buildString {
                        append("Deep ${deep ?: 0} min · REM ${rem ?: 0} min")
                        if (base?.sourceSleep == "hc") append(" (Health Connect)")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // ---- How do you feel? ----
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            SectionTitle("How do you feel?")
            Spacer(Modifier.height(4.dp))
            SliderQuestion("Exhaustion", exhaustion) {
                exhaustion = it
                exhaustionTouched = true
            }
            SliderQuestion("Muscle soreness", soreness) {
                soreness = it
                sorenessTouched = true
            }
            SliderQuestion("Stress", stress) {
                stress = it
                stressTouched = true
            }
        }

        // ---- Note ----
        OutlinedTextField(
            value = note,
            onValueChange = { note = it },
            label = { Text("Note (optional)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        Button(
            onClick = {
                val existing = base
                val entry = existing ?: DailyEntryEntity(
                    date = today.toString(),
                    restingHr = null,
                    hrvMs = null,
                    sleepMinutes = null,
                    deepMinutes = null,
                    remMinutes = null,
                    lightMinutes = null,
                    exhaustionLevel = null,
                    muscleSoreness = null,
                    stressLevel = null,
                    note = null,
                    sourceRhr = null,
                    sourceHrv = null,
                    sourceSleep = null,
                    updatedAt = System.currentTimeMillis(),
                    score = null,
                    state = null,
                    confidence = null,
                    componentScoresJson = null,
                )
                onSave(
                    entry.copy(
                        // Blank field = keep the stored value; on a fresh
                        // row (existing == null) that resolves to null.
                        restingHr = rhrText.toIntOrNull() ?: existing?.restingHr,
                        hrvMs = hrvText.toDoubleOrNull() ?: existing?.hrvMs,
                        sleepMinutes = sleepText.toIntOrNull() ?: existing?.sleepMinutes,
                        exhaustionLevel = if (exhaustionTouched) exhaustion else existing?.exhaustionLevel,
                        muscleSoreness = if (sorenessTouched) soreness else existing?.muscleSoreness,
                        stressLevel = if (stressTouched) stress else existing?.stressLevel,
                        note = note.trim().ifBlank { null },
                    ),
                )
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Save")
        }

        Text(
            "Values sync to your account when signed in.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun SourceBadge() {
    InfoChip(
        text = "Health Connect",
        container = MaterialTheme.colorScheme.secondaryContainer,
        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
    )
}

@Composable
private fun SliderQuestion(
    label: String,
    value: Int,
    onChange: (Int) -> Unit,
) {
    Column {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(label, style = MaterialTheme.typography.titleSmall)
            Text(
                "$value / 10",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onChange(it.roundToInt().coerceIn(1, 10)) },
            valueRange = 1f..10f,
            steps = 9,
        )
    }
}

/** Renders 63.0 as "63" and keeps real fractions as typed decimals. */
private fun Double?.toFieldText(): String = when {
    this == null -> ""
    this % 1.0 == 0.0 -> toLong().toString()
    else -> toString()
}

/** Digits plus a single decimal point; everything else is dropped. */
private fun sanitizeDecimal(input: String): String {
    val cleaned = input.filter { it.isDigit() || it == '.' }
    val firstDot = cleaned.indexOf('.')
    if (firstDot == -1) return cleaned
    return cleaned.substring(0, firstDot + 1) +
        cleaned.substring(firstDot + 1).filter { it != '.' }
}
