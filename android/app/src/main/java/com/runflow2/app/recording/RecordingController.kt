package com.runflow2.app.recording

import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.model.PaceZoneEvaluator
import com.runflow2.app.domain.model.PaceZoneStatus
import com.runflow2.app.domain.model.WorkoutType
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

enum class RecStatus { IDLE, COUNTDOWN, RUNNING, PAUSED, FINISHED }

data class GeoPt(val lat: Double, val lng: Double, val ele: Double, val t: Long, val speed: Double)

data class Lap(val km: Int, val durSec: Int, val paceSecPerKm: Int)

enum class StepDurationType { TIME, DISTANCE }

data class StepRuntime(
    val label: String,
    val kind: String, // warmup / main / recovery / cooldown / repeat
    val durationType: StepDurationType,
    val durationSec: Double,
    val distanceM: Double,
    val targetPaceSecPerKm: Double?,
)

sealed interface VoiceEvent {
    data class Countdown(val n: Int) : VoiceEvent
    data class KmDone(val km: Int, val paceSecPerKm: Int) : VoiceEvent
    data class StepStart(val label: String) : VoiceEvent
    data class StepDone(val label: String) : VoiceEvent
    data class PaceWarning(val status: PaceZoneStatus) : VoiceEvent
    data object AutoPaused : VoiceEvent
    data object Started : VoiceEvent
}

data class RecordingState(
    val status: RecStatus = RecStatus.IDLE,
    val countdownRemaining: Int = 3,
    val startedAtMillis: Long? = null,
    val elapsedMovingSec: Double = 0.0,
    val elapsedTotalSec: Double = 0.0,
    val distanceM: Double = 0.0,
    val currentPaceSecPerKm: Double? = null,
    val avgPaceSecPerKm: Double? = null,
    val currentHr: Int? = null,
    val cadence: Int? = null,
    val elevationGainM: Double = 0.0,
    val gpsAccuracyM: Float? = null,
    val gpsFixed: Boolean = false,
    val points: List<GeoPt> = emptyList(),
    val laps: List<Lap> = emptyList(),
    val autoPauseEnabled: Boolean = true,
    val voiceEnabled: Boolean = true,
    val targetPaceSecPerKm: Double? = null,
    val workoutName: String? = null,
    val workoutId: String? = null,
    val steps: List<StepRuntime> = emptyList(),
    val activeStepIndex: Int = -1,
    val stepProgress: Float = 0f,
) {
    val paceZone: PaceZoneStatus
        get() = PaceZoneEvaluator.evaluate(currentPaceSecPerKm, targetPaceSecPerKm)
}

/**
 * Singleton recording state machine. The foreground service feeds it GPS samples
 * and wall-clock ticks; the UI observes [state] and sends commands.
 */
class RecordingController {

    /** Set by the dashboard/plan when the user taps Start on a specific planned workout. */
    var pendingWorkoutId: String? = null

    /** Id of the most recently saved recording, for post-run summary navigation. */
    var lastSavedActivityId: String? = null

    private val _state = MutableStateFlow(RecordingState())
    val state: StateFlow<RecordingState> = _state.asStateFlow()

    private val _voice = MutableSharedFlow<VoiceEvent>(extraBufferCapacity = 16)
    val voice: SharedFlow<VoiceEvent> = _voice.asSharedFlow()

    // engine internals
    private var lastPt: GeoPt? = null
    private var lastLapDistM = 0.0
    private var lastLapMovingSec = 0.0
    private val speedWindow = ArrayDeque<Pair<Long, Double>>() // t, cumulative distance
    private var lastEle: Double? = null
    private var slowSinceMs: Long? = null
    private var paceWarnSinceMs: Long? = null
    private var autoPaused = false
    private var lastTick: Long = 0

    // step engine
    private var stepStartDist = 0.0
    private var stepStartMoving = 0.0

    fun configure(autoPause: Boolean, voice: Boolean) {
        _state.value = _state.value.copy(autoPauseEnabled = autoPause, voiceEnabled = voice)
    }

    fun start(workout: WorkoutEntity?, countdownSec: Int = 3) {
        val steps = buildSteps(workout)
        _state.value = RecordingState(
            status = RecStatus.COUNTDOWN,
            countdownRemaining = countdownSec,
            autoPauseEnabled = _state.value.autoPauseEnabled,
            voiceEnabled = _state.value.voiceEnabled,
            targetPaceSecPerKm = workout?.targetPaceSecPerKm?.toDouble(),
            workoutName = workout?.let { runName(it) },
            workoutId = workout?.id,
            steps = steps,
            activeStepIndex = if (steps.isEmpty()) -1 else 0,
        )
        stepStartDist = 0.0
        stepStartMoving = 0.0
        _voice.tryEmit(VoiceEvent.Started)
    }

    private fun runName(w: WorkoutEntity): String = when (runCatching { WorkoutType.valueOf(w.workoutType) }.getOrDefault(WorkoutType.EASY)) {
        WorkoutType.LONG_RUN -> "Long Run"
        WorkoutType.TEMPO -> "Tempo Run"
        WorkoutType.INTERVALS -> "Interval Session"
        WorkoutType.FARTLEK -> "Fartlek"
        WorkoutType.REPETITIONS -> "Repetition Session"
        WorkoutType.RACE -> "Race"
        WorkoutType.RECOVERY -> "Recovery Run"
        else -> "Training Run"
    }

    fun beginCountdownTick() {
        // called by service every second while COUNTDOWN
        val s = _state.value
        if (s.status != RecStatus.COUNTDOWN) return
        val n = s.countdownRemaining - 1
        if (n <= 0) {
            _state.value = s.copy(status = RecStatus.RUNNING, countdownRemaining = 0, startedAtMillis = System.currentTimeMillis())
            lastTick = System.currentTimeMillis()
            _voice.tryEmit(VoiceEvent.StepStart(activeLabel()))
        } else {
            _state.value = s.copy(countdownRemaining = n)
            _voice.tryEmit(VoiceEvent.Countdown(n))
        }
    }

    fun pause() {
        val s = _state.value
        if (s.status != RecStatus.RUNNING) return
        autoPaused = false
        slowSinceMs = null
        _state.value = s.copy(status = RecStatus.PAUSED)
    }

    fun resume() {
        val s = _state.value
        if (s.status != RecStatus.PAUSED) return
        _state.value = s.copy(status = RecStatus.RUNNING)
        lastTick = System.currentTimeMillis()
    }

    /** Called by the service ticker roughly every second. */
    fun tick() {
        val s = _state.value
        when (s.status) {
            RecStatus.COUNTDOWN -> beginCountdownTick()
            RecStatus.RUNNING -> {
                val now = System.currentTimeMillis()
                val dt = (now - lastTick) / 1000.0
                lastTick = now
                val moving = s.elapsedMovingSec + dt
                var ns = s.copy(elapsedTotalSec = s.elapsedTotalSec + dt, elapsedMovingSec = moving)
                ns = advanceSteps(ns)
                _state.value = ns
            }
            RecStatus.PAUSED -> {
                val now = System.currentTimeMillis()
                val dt = (now - lastTick) / 1000.0
                lastTick = now
                _state.value = s.copy(elapsedTotalSec = s.elapsedTotalSec + dt)
            }
            else -> {}
        }
    }

    /** GPS sample from the location client. */
    fun onLocation(lat: Double, lng: Double, ele: Double, speed: Double, accuracy: Float, t: Long = System.currentTimeMillis()) {
        val s = _state.value
        if (s.status != RecStatus.RUNNING && s.status != RecStatus.PAUSED) return
        val pt = GeoPt(lat, lng, ele, t, speed)

        var ns = if (s.status == RecStatus.RUNNING) {
            var dist = s.distanceM
            var eleGain = s.elevationGainM
            val last = lastPt
            if (last != null) {
                val d = haversine(last.lat, last.lng, lat, lng)
                if (d > 1.5 && d < 60.0 && accuracy < 25f) {
                    dist += d
                    val dEle = ele - (lastEle ?: ele)
                    if (dEle > 1.0) eleGain += dEle
                }
            }
            lastEle = ele
            lastPt = pt
            // pace window (30 s)
            speedWindow.addLast(t to dist)
            while (speedWindow.size > 2 && t - speedWindow.first().first > 30_000) speedWindow.removeFirst()
            val windowDist = dist - speedWindow.first().second
            val windowTime = (t - speedWindow.first().first) / 1000.0
            val pace = if (windowTime > 4.0 && windowDist > 8.0) 1000.0 / (windowDist / windowTime) else null

            // auto-pause detection
            val instSpeed = if (windowTime > 3.0) windowDist / windowTime else speed
            if (s.autoPauseEnabled && instSpeed < 0.5) {
                val since = slowSinceMs ?: t.also { slowSinceMs = it }
                if (t - since > 8_000) {
                    autoPaused = true
                    slowSinceMs = null
                    _voice.tryEmit(VoiceEvent.AutoPaused)
                }
            } else {
                slowSinceMs = null
            }

            // pace zone voice warning (needs 20 s continuously out of zone)
            val zone = PaceZoneEvaluator.evaluate(pace, s.targetPaceSecPerKm)
            if (zone == PaceZoneStatus.TOO_FAST || zone == PaceZoneStatus.TOO_SLOW) {
                val since = paceWarnSinceMs ?: t.also { paceWarnSinceMs = it }
                if (t - since > 20_000) {
                    _voice.tryEmit(VoiceEvent.PaceWarning(zone))
                    paceWarnSinceMs = t
                }
            } else {
                paceWarnSinceMs = null
            }

            val avgPace = if (dist > 20.0) 1000.0 / (dist / s.elapsedMovingSec.coerceAtLeast(1.0)) else null

            var st = s.copy(
                distanceM = dist,
                elevationGainM = eleGain,
                currentPaceSecPerKm = pace,
                avgPaceSecPerKm = avgPace,
                gpsAccuracyM = accuracy,
                gpsFixed = true,
                points = s.points + pt,
                status = if (autoPaused) RecStatus.PAUSED else RecStatus.RUNNING,
            )

            // auto-lap
            val kmCompleted = (dist / 1000.0).toInt()
            val kmAlready = (lastLapDistM / 1000.0).toInt()
            if (kmCompleted > kmAlready) {
                val lapMoving = st.elapsedMovingSec - lastLapMovingSec
                val lapDist = st.distanceM - lastLapDistM
                val lapPace = if (lapDist > 100) (lapMoving / (lapDist / 1000.0)).toInt() else 0
                lastLapDistM = kmCompleted * 1000.0
                lastLapMovingSec = st.elapsedMovingSec
                st = st.copy(laps = st.laps + Lap(kmCompleted, lapMoving.toInt(), lapPace))
                _voice.tryEmit(VoiceEvent.KmDone(kmCompleted, lapPace))
            }
            st
        } else {
            s.copy(gpsAccuracyM = accuracy, gpsFixed = true, points = s.points + pt)
        }
        _state.value = advanceSteps(ns)
    }

    private fun advanceSteps(s: RecordingState): RecordingState {
        if (s.steps.isEmpty() || s.activeStepIndex < 0 || s.activeStepIndex >= s.steps.size) return s
        val step = s.steps[s.activeStepIndex]
        val done = when (step.durationType) {
            StepDurationType.DISTANCE -> (s.distanceM - stepStartDist) >= step.distanceM && step.distanceM > 0
            StepDurationType.TIME -> (s.elapsedMovingSec - stepStartMoving) >= step.durationSec && step.durationSec > 0
        }
        if (done) {
            _voice.tryEmit(VoiceEvent.StepDone(step.label))
            val next = s.activeStepIndex + 1
            stepStartDist = s.distanceM
            stepStartMoving = s.elapsedMovingSec
            return if (next < s.steps.size) {
                _voice.tryEmit(VoiceEvent.StepStart(s.steps[next].label))
                s.copy(activeStepIndex = next, stepProgress = 0f)
            } else {
                s.copy(activeStepIndex = -1, stepProgress = 1f)
            }
        }
        val progress = when (step.durationType) {
            StepDurationType.DISTANCE -> if (step.distanceM > 0) ((s.distanceM - stepStartDist) / step.distanceM).toFloat() else 0f
            StepDurationType.TIME -> if (step.durationSec > 0) ((s.elapsedMovingSec - stepStartMoving) / step.durationSec).toFloat() else 0f
        }
        return s.copy(stepProgress = progress.coerceIn(0f, 1f))
    }

    private fun activeLabel(): String {
        val s = _state.value
        return s.steps.getOrNull(s.activeStepIndex)?.label ?: "run"
    }

    fun reset() {
        lastPt = null
        lastEle = null
        lastLapDistM = 0.0
        lastLapMovingSec = 0.0
        speedWindow.clear()
        slowSinceMs = null
        paceWarnSinceMs = null
        autoPaused = false
        stepStartDist = 0.0
        stepStartMoving = 0.0
        _state.value = RecordingState(
            autoPauseEnabled = _state.value.autoPauseEnabled,
            voiceEnabled = _state.value.voiceEnabled,
        )
    }

    companion object {
        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6_371_000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2) * sin(dLng / 2)
            return 2 * r * atan2(sqrt(a), sqrt(1 - a))
        }

        /** Flat step list from a workout's targets (structured JSON steps come later). */
        fun buildSteps(workout: WorkoutEntity?): List<StepRuntime> {
            val w = workout ?: return emptyList()
            val steps = ArrayList<StepRuntime>()
            val distKm = w.targetDistanceKm
            val pace = w.targetPaceSecPerKm?.toDouble()
            if (distKm != null && distKm > 0) {
                if (distKm >= 8) steps += StepRuntime("Warm-up", "warmup", StepDurationType.DISTANCE, 0.0, 1500.0, pace?.let { it * 1.15 })
                steps += StepRuntime("Main set", "main", StepDurationType.DISTANCE, 0.0, (distKm * 1000 * if (distKm >= 8) 0.82 else 1.0), pace)
                if (distKm >= 8) steps += StepRuntime("Cool-down", "cooldown", StepDurationType.DISTANCE, 0.0, (distKm * 1000 * 0.05), pace?.let { it * 1.12 })
            } else if (w.targetDurationSec != null && w.targetDurationSec > 0) {
                val dur = w.targetDurationSec.toDouble()
                if (dur >= 1800) steps += StepRuntime("Warm-up", "warmup", StepDurationType.TIME, dur * 0.15, 0.0, pace?.let { it * 1.15 })
                steps += StepRuntime("Main set", "main", StepDurationType.TIME, dur * if (dur >= 1800) 0.75 else 1.0, 0.0, pace)
                if (dur >= 1800) steps += StepRuntime("Cool-down", "cooldown", StepDurationType.TIME, dur * 0.1, 0.0, pace?.let { it * 1.12 })
            }
            return steps
        }
    }
}
