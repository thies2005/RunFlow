package com.runflow2.app.recording

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import com.runflow2.app.MainActivity
import com.runflow2.app.R
import com.runflow2.app.RunFlowApp
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.domain.model.PaceZoneStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.Locale
import java.util.UUID

/**
 * Foreground service that drives [RecordingController] while a workout is in progress:
 * fused GPS samples, 1 Hz ticker, TTS voice coach, and the ongoing notification.
 */
class RecordingService : Service(), TextToSpeech.OnInitListener {

    private val container get() = (application as RunFlowApp).container
    private val controller get() = container.recording

    private lateinit var locationManager: LocationManager
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    /**
     * All [RecordingController] mutations must stay on the main thread: the GPS
     * callback arrives on the main looper and the ticker below also runs on Main,
     * so their read-modify-write state updates can never race each other.
     */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val locationListener = LocationListener { last: Location ->
        controller.onLocation(
            lat = last.latitude,
            lng = last.longitude,
            ele = last.altitude,
            speed = if (last.hasSpeed()) last.speed.toDouble() else 0.0,
            accuracy = last.accuracy,
        )
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LocationManager::class.java)
        tts = TextToSpeech(this, this)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                // guard against a second START resetting a live session
                val current = controller.state.value.status
                if (current == RecStatus.RUNNING || current == RecStatus.PAUSED ||
                    current == RecStatus.COUNTDOWN
                ) {
                    return START_STICKY
                }
                val workoutId = intent.getStringExtra(EXTRA_WORKOUT_ID)
                val autoPause = intent.getBooleanExtra(EXTRA_AUTO_PAUSE, true)
                val voice = intent.getBooleanExtra(EXTRA_VOICE, true)
                val workout = workoutId?.let { runBlockingWorkout(it) }
                controller.configure(autoPause, voice)
                controller.start(workout)
                startAsForeground()
                startGps()
                startTicker()
                collectVoice()
            }
            ACTION_PAUSE -> controller.pause()
            ACTION_RESUME -> controller.resume()
            ACTION_STOP -> {
                scope.launch { saveAndStop() }
            }
            ACTION_DISCARD -> {
                scope.launch {
                    controller.reset()
                    stopSelf()
                }
            }
            else -> if (controller.state.value.status == RecStatus.IDLE) stopSelf()
        }
        return START_STICKY
    }

    private fun runBlockingWorkout(id: String) = kotlinx.coroutines.runBlocking {
        container.repository.workout(id)
    }

    private fun startAsForeground() {
        val notification = buildNotification("Preparing…", "")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startGps() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) return
        // Platform LocationManager: no Google Play Services dependency, works on
        // emulators and de-Googled devices. Register every available provider.
        val providers = buildList {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) add(LocationManager.GPS_PROVIDER)
            if (locationManager.isProviderEnabled(LocationManager.FUSED_PROVIDER)) add(LocationManager.FUSED_PROVIDER)
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) add(LocationManager.NETWORK_PROVIDER)
        }
        try {
            providers.forEach { provider ->
                locationManager.requestLocationUpdates(
                    provider, 1000L, 1f, locationListener, Looper.getMainLooper(),
                )
            }
        } catch (_: SecurityException) {
        }
    }

    private var tickerJob: kotlinx.coroutines.Job? = null
    private var voiceJob: kotlinx.coroutines.Job? = null
    private var notifJob: kotlinx.coroutines.Job? = null
    private var stateJob: kotlinx.coroutines.Job? = null

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = scope.launch {
            while (isActive) {
                controller.tick()
                delay(1000)
            }
        }
        notifJob?.cancel()
        notifJob = scope.launch {
            var lastText = ""
            while (isActive) {
                val s = controller.state.value
                if (s.status != RecStatus.IDLE) {
                    val text = "${Format.distance(s.distanceM / 1000.0)} · ${Format.duration(s.elapsedMovingSec.toLong())}"
                    if (text != lastText) {
                        lastText = text
                        updateNotification(text, statusLabel(s.status))
                    }
                }
                delay(2000)
            }
        }
        stateJob?.cancel()
        stateJob = scope.launch {
            controller.state.collectLatest { s ->
                if (s.status == RecStatus.IDLE || s.status == RecStatus.FINISHED) {
                    stopGps()
                    stopSelf()
                }
            }
        }
    }

    private fun collectVoice() {
        voiceJob?.cancel()
        voiceJob = scope.launch {
            controller.voice.collect { event ->
                val s = controller.state.value
                if (!s.voiceEnabled) return@collect
                speak(
                    when (event) {
                        is VoiceEvent.Countdown -> "${event.n}"
                        is VoiceEvent.Started -> "Go!"
                        is VoiceEvent.KmDone -> "Kilometer ${event.km}, ${paceSpeech(event.paceSecPerKm)} per kilometer."
                        is VoiceEvent.StepStart -> when (event.label) {
                            "Main set" -> "Start main set. Settle into your target pace."
                            "Warm-up" -> "Start warm-up. Keep it easy."
                            "Cool-down" -> "Start cool-down. Bring it down easy."
                            else -> "Begin ${event.label.lowercase(Locale.ENGLISH)}."
                        }
                        is VoiceEvent.StepDone -> "${event.label} complete."
                        is VoiceEvent.PaceWarning -> when (event.status) {
                            PaceZoneStatus.TOO_FAST -> "You are ahead of target pace. Ease off slightly."
                            PaceZoneStatus.TOO_SLOW -> "You are behind target pace. Pick it up."
                            else -> ""
                        }
                        is VoiceEvent.AutoPaused -> "Auto paused."
                    },
                )
            }
        }
    }

    private fun paceSpeech(secPerKm: Int): String {
        if (secPerKm <= 0) return ""
        val m = secPerKm / 60
        val s = secPerKm % 60
        return "$m minutes ${s}s".replace(" 0s", "")
    }

    private fun statusLabel(status: RecStatus): String = when (status) {
        RecStatus.RUNNING -> "Recording run"
        RecStatus.PAUSED -> "Paused"
        RecStatus.COUNTDOWN -> "Starting…"
        else -> "RunFlow"
    }

    private fun stopGps() {
        runCatching { locationManager.removeUpdates(locationListener) }
    }

    private suspend fun saveAndStop() {
        val s = controller.state.value
        if (s.status != RecStatus.IDLE && s.distanceM > 10) {
            val profile = container.repository.profileOnce()
            val entity = buildActivity(s, profile.thresholdPaceSecPerKm, profile.weightKg)
            container.repository.saveActivity(entity)
            s.workoutId?.let { container.repository.completeWorkout(it, entity.id) }
            controller.lastSavedActivityId = entity.id
            // Upload opportunistically; if offline the outbox keeps it queued.
            com.runflow2.app.data.sync.SyncWorker.syncNow(this)
        }
        controller.reset()
        stopSelf()
    }

    private fun buildActivity(s: RecordingState, thresholdPace: Int, weightKg: Double): ActivityEntity {
        val now = LocalDateTime.now()
        val name = s.workoutName ?: when (now.toLocalTime()) {
            in LocalTime.of(5, 0)..LocalTime.of(11, 0) -> "Morning Run"
            in LocalTime.of(11, 0)..LocalTime.of(14, 0) -> "Midday Run"
            in LocalTime.of(14, 0)..LocalTime.of(18, 0) -> "Afternoon Run"
            else -> "Evening Run"
        }
        val km = s.distanceM / 1000.0
        val moving = s.elapsedMovingSec.toInt()
        val trimp = com.runflow2.app.data.repo.RunFlowRepository.computeTrimp(
            movingTimeSec = moving,
            avgHr = s.currentHr?.toDouble(),
            zoneSeconds = List(7) { 0 },
            distanceKm = km,
            thresholdPaceSecPerKm = thresholdPace,
        )
        val route = s.points.take(MAX_ROUTE_POINTS).joinToString(",", "[", "]") {
            "[${"%.5f".format(Locale.ENGLISH, it.lat)},${"%.5f".format(Locale.ENGLISH, it.lng)}]"
        }
        val laps = s.laps.joinToString(",", "[", "]") {
            """{"km":${it.km},"durSec":${it.durSec},"paceSecPerKm":${it.paceSecPerKm}}"""
        }
        val cadence = s.cadence
        val calories = (moving / 60.0 * weightKg * 0.9 * 1.05).toInt().takeIf { it > 0 }
        return ActivityEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            type = "RUN",
            startDate = s.startedAtMillis ?: System.currentTimeMillis(),
            distanceMeters = s.distanceM,
            movingTimeSec = moving,
            averageHr = s.currentHr?.toDouble(),
            maxHr = null,
            averageCadence = cadence?.toDouble(),
            totalElevation = s.elevationGainM,
            calories = calories,
            trimp = trimp,
            trainingType = null,
            estimatedVdot = com.runflow2.app.data.repo.RunFlowRepository.estimateVdot(km, moving),
            routeJson = if (s.points.size > 1) route else null,
            lapsJson = if (s.laps.isNotEmpty()) laps else null,
        )
    }

    // ---------- TTS ----------
    override fun onInit(status: Int) {
        ttsReady = status == TextToSpeech.SUCCESS
        if (ttsReady) tts?.language = Locale.ENGLISH
    }

    private fun speak(text: String) {
        if (!ttsReady || text.isBlank()) return
        tts?.speak(text, TextToSpeech.QUEUE_ADD, null, "runflow_${System.nanoTime()}")
    }

    // ---------- notification ----------
    private fun buildNotification(line1: String, line2: String): Notification {
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_run)
            .setContentTitle(line2.ifBlank { "RunFlow" })
            .setContentText(line1)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .build()
    }

    private fun updateNotification(text: String, label: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, buildNotification(text, label))
    }

    private fun createChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Workout recording",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Ongoing workout recording" },
        )
    }

    override fun onDestroy() {
        tickerJob?.cancel()
        voiceJob?.cancel()
        notifJob?.cancel()
        stateJob?.cancel()
        scope.cancel()
        stopGps()
        tts?.shutdown()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "recording"
        const val NOTIFICATION_ID = 421
        const val ACTION_START = "com.runflow2.app.START"
        const val ACTION_PAUSE = "com.runflow2.app.PAUSE"
        const val ACTION_RESUME = "com.runflow2.app.RESUME"
        const val ACTION_STOP = "com.runflow2.app.STOP"
        const val ACTION_DISCARD = "com.runflow2.app.DISCARD"
        const val EXTRA_WORKOUT_ID = "workout_id"
        const val EXTRA_AUTO_PAUSE = "auto_pause"
        const val EXTRA_VOICE = "voice"
        private const val MAX_ROUTE_POINTS = 4000

        fun start(context: Context, workoutId: String?, autoPause: Boolean, voice: Boolean) {
            val intent = Intent(context, RecordingService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_WORKOUT_ID, workoutId)
                putExtra(EXTRA_AUTO_PAUSE, autoPause)
                putExtra(EXTRA_VOICE, voice)
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun send(context: Context, action: String) {
            context.startService(Intent(context, RecordingService::class.java).apply { this.action = action })
        }
    }
}
