package com.runflow2.app.recording

import com.runflow2.app.core.gps.GpsSample
import com.runflow2.app.core.gps.LocationFilter
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

/** Completed structured step (in-memory split marker; not part of the km laps). */
data class StepSplit(
    val index: Int,
    val label: String,
    val durSec: Int,
    val distanceM: Double,
    val paceSecPerKm: Int?,
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
    // seconds left (TIME steps) or meters left (DISTANCE steps) in the active step
    val currentStepRemaining: Double? = null,
    val stepSplits: List<StepSplit> = emptyList(),
) {
    val paceZone: PaceZoneStatus
        get() = PaceZoneEvaluator.evaluate(currentPaceSecPerKm, targetPaceSecPerKm)
}

/**
 * Singleton recording state machine. The foreground service feeds it GPS samples
 * and wall-clock ticks; the UI observes [state] and sends commands.
 *
 * All state (including [gpsFilter]) is main-thread confined: the GPS callback
 * and the service ticker both arrive on the main looper, so nothing here is
 * synchronized.
 */
class RecordingController(
    /**
     * Kalman GPS smoothing on/off; plain snapshot of the gpsSmoothing setting
     * taken by RecordingService when a session starts (changing the setting
     * mid-run applies to the next session). Tests inject it directly.
     */
    var gpsSmoothingEnabled: Boolean = true,
) {

    /** Set by the dashboard/plan when the user taps Start on a specific planned workout. */
    var pendingWorkoutId: String? = null

    /** Id of the most recently saved recording, for post-run summary navigation. */
    var lastSavedActivityId: String? = null

    private val _state = MutableStateFlow(RecordingState())
    val state: StateFlow<RecordingState> = _state.asStateFlow()

    private val _voice = MutableSharedFlow<VoiceEvent>(extraBufferCapacity = 16)
    val voice: SharedFlow<VoiceEvent> = _voice.asSharedFlow()

    // One Kalman GPS-smoothing filter per session; reset on start, resume and
    // session end so each session (and each pause) re-anchors on a fresh fix.
    private val gpsFilter = LocationFilter()

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
    private var lastStepCue = 0

    fun configure(autoPause: Boolean, voice: Boolean) {
        _state.value = _state.value.copy(autoPauseEnabled = autoPause, voiceEnabled = voice)
    }

    /**
     * [resolvedSteps] lets a caller that has VDOT access inject the parsed
     * structuredSteps; without them the flat targets are synthesized as before.
     */
    fun start(workout: WorkoutEntity?, countdownSec: Int = 3, resolvedSteps: List<StepRuntime>? = null) {
        val steps = resolvedSteps ?: buildSteps(workout)
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
            currentStepRemaining = steps.firstOrNull()?.let { stepRemaining(it, 0.0, 0.0) },
        )
        stepStartDist = 0.0
        stepStartMoving = 0.0
        lastStepCue = 0
        gpsFilter.reset()
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
        gpsFilter.reset() // fresh anchor after the pause (manual or auto-pause)
        autoPaused = false // a manual resume must not be undone by the latch
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

        // Kalman smoothing first (disabled -> the raw sample passes through
        // unchanged). A rejected fix adds no point/distance/pace, but a better
        // raw accuracy still updates the GPS chip so it reflects signal quality.
        val raw = GpsSample(lat, lng, ele, accuracy, speed.toFloat(), t)
        val fix = if (gpsSmoothingEnabled) gpsFilter.filter(raw) else raw
        if (fix == null) {
            if (accuracy < (s.gpsAccuracyM ?: Float.MAX_VALUE)) {
                _state.value = s.copy(gpsAccuracyM = accuracy, gpsFixed = true)
            }
            return
        }
        val pt = GeoPt(fix.latitude, fix.longitude, fix.altitudeMeters, fix.timestampMs, fix.speedMetersPerSecond.toDouble())

        var ns = if (s.status == RecStatus.RUNNING) {
            var dist = s.distanceM
            var eleGain = s.elevationGainM
            val last = lastPt
            if (last != null) {
                val d = haversine(last.lat, last.lng, fix.latitude, fix.longitude)
                if (d > 1.5 && d < 60.0 && accuracy < 25f) {
                    dist += d
                    val dEle = fix.altitudeMeters - (lastEle ?: fix.altitudeMeters)
                    if (dEle > 1.0) eleGain += dEle
                }
            }
            lastEle = fix.altitudeMeters
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
        val distInStep = s.distanceM - stepStartDist
        val movingInStep = s.elapsedMovingSec - stepStartMoving
        val done = when (step.durationType) {
            StepDurationType.DISTANCE -> distInStep >= step.distanceM && step.distanceM > 0
            StepDurationType.TIME -> movingInStep >= step.durationSec && step.durationSec > 0
        }
        if (done) {
            _voice.tryEmit(VoiceEvent.StepDone(step.label))
            val split = StepSplit(
                index = s.activeStepIndex,
                label = step.label,
                durSec = movingInStep.toInt(),
                distanceM = distInStep,
                paceSecPerKm = if (distInStep > 50) (movingInStep / (distInStep / 1000.0)).toInt() else null,
            )
            val next = s.activeStepIndex + 1
            stepStartDist = s.distanceM
            stepStartMoving = s.elapsedMovingSec
            lastStepCue = 0
            return if (next < s.steps.size) {
                _voice.tryEmit(VoiceEvent.StepStart(s.steps[next].label))
                s.copy(
                    activeStepIndex = next,
                    stepProgress = 0f,
                    currentStepRemaining = stepRemaining(s.steps[next], 0.0, 0.0),
                    stepSplits = s.stepSplits + split,
                )
            } else {
                s.copy(
                    activeStepIndex = -1,
                    stepProgress = 1f,
                    currentStepRemaining = null,
                    stepSplits = s.stepSplits + split,
                )
            }
        }
        val progress = when (step.durationType) {
            StepDurationType.DISTANCE -> if (step.distanceM > 0) (distInStep / step.distanceM).toFloat() else 0f
            StepDurationType.TIME -> if (step.durationSec > 0) (movingInStep / step.durationSec).toFloat() else 0f
        }
        val remaining = stepRemaining(step, distInStep, movingInStep)
        if (step.durationType == StepDurationType.TIME) {
            stepCountdownCue(remaining, lastStepCue)?.let { cue ->
                lastStepCue = cue
                _voice.tryEmit(VoiceEvent.Countdown(cue))
            }
        }
        return s.copy(stepProgress = progress.coerceIn(0f, 1f), currentStepRemaining = remaining)
    }

    private fun activeLabel(): String {
        val s = _state.value
        return s.steps.getOrNull(s.activeStepIndex)?.label ?: "run"
    }

    fun reset() {
        gpsFilter.reset()
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
        lastStepCue = 0
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

        /** Seconds (TIME) or meters (DISTANCE) left in a step, clamped at 0. */
        fun stepRemaining(step: StepRuntime, distInStep: Double, movingInStep: Double): Double =
            when (step.durationType) {
                StepDurationType.DISTANCE -> (step.distanceM - distInStep).coerceAtLeast(0.0)
                StepDurationType.TIME -> (step.durationSec - movingInStep).coerceAtLeast(0.0)
            }

        /** 3-2-1 cue worth speaking for a TIME step's remaining seconds, or null. */
        fun stepCountdownCue(remainingSec: Double, lastEmitted: Int): Int? {
            if (remainingSec <= 0.0) return null
            val cue = kotlin.math.ceil(remainingSec).toInt()
            return cue.takeIf { it in 1..3 && it != lastEmitted }
        }

        /** Fallback flat step list from a workout's targets when no structuredSteps exist. */
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
