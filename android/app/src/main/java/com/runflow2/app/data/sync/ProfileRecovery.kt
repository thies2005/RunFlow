package com.runflow2.app.data.sync

import android.content.Context
import androidx.room.withTransaction
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.net.UserDto
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/** Called only after a successful authenticated profile GET and while holding SyncManager.mutex. */
internal data class ProfileRecoverySnapshot(val profile: ProfileEntity?, val queued: List<SyncQueueEntity>)

internal class ProfileRecovery(private val context: Context, private val db: AppDatabase) {
    /**
     * Write the snapshot first, then atomically replace the row and delete exactly the
     * archived outbox rows. A failure throws and rolls the database transaction back.
     * The file can outlive a failed commit; this is harmless and preserves evidence.
     */
    suspend fun replaceFromWeb(
        server: UserDto, accountEmail: String?, expected: ProfileRecoverySnapshot,
        settingsBackup: JSONObject, validateSession: () -> Unit,
    ): File = db.withTransaction {
        validateSession()
        val old = db.profileDao().get()
        val queued = db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE)
        check(old == expected.profile && queued == expected.queued) { "Profile changed during download. Try again." }
        val archive = writeBackup(old, queued, settingsBackup)
        validateSession()
        db.profileDao().upsert(server.applyTo(old ?: ProfileEntity(), accountEmail))
        queued.forEach { db.syncQueueDao().markCompleted(it.id) }
        archive
    }

    private fun writeBackup(profile: ProfileEntity?, queued: List<SyncQueueEntity>, settingsBackup: JSONObject): File {
        val dir = File(context.filesDir, "profile-recovery")
        check(dir.isDirectory || dir.mkdirs()) { "Cannot create profile backup directory" }
        val document = JSONObject().apply {
            put("formatVersion", 1)
            put("createdAtEpochMs", System.currentTimeMillis())
            put("profileSettings", settingsBackup)
            put("profile", profile?.let(::profileJson) ?: JSONObject.NULL)
            put("profileOutbox", JSONArray().apply { queued.forEach { put(queueJson(it)) } })
        }
        val name = "profile-${System.currentTimeMillis()}-${UUID.randomUUID()}.json"
        val tmp = File(dir, ".$name.tmp")
        val target = File(dir, name)
        try {
            FileOutputStream(tmp).use { out ->
                out.write(document.toString(2).toByteArray(Charsets.UTF_8))
                out.fd.sync()
            }
            check(tmp.renameTo(target)) { "Cannot finish profile backup" }
            return target
        } finally {
            tmp.delete()
        }
    }

    private fun profileJson(p: ProfileEntity) = JSONObject().apply {
        put("id", p.id); put("name", p.name); put("email", p.email); put("sex", p.sex)
        put("birthYear", p.birthYear); put("weightKg", p.weightKg); put("heightCm", p.heightCm)
        put("hrMax", p.hrMax); put("hrRest", p.hrRest)
        put("hrZone1Max", p.hrZone1Max); put("hrZone2Max", p.hrZone2Max)
        put("hrZone3Max", p.hrZone3Max); put("hrZone4Max", p.hrZone4Max)
        put("hrZone5Max", p.hrZone5Max); put("hrZone6Max", p.hrZone6Max)
        put("hrZonesAuto", p.hrZonesAuto); put("thresholdHr", p.thresholdHr)
        put("thresholdPaceSecPerKm", p.thresholdPaceSecPerKm)
        put("vdotCorrection", p.vdotCorrection)
        put("effectiveVo2maxCorrection", p.effectiveVo2maxCorrection); put("dirty", p.dirty)
    }
    private fun queueJson(q: SyncQueueEntity) = JSONObject().apply {
        put("id", q.id); put("entityType", q.entityType); put("localId", q.localId)
        put("payloadJson", q.payloadJson); put("retryCount", q.retryCount)
        put("maxRetries", q.maxRetries); put("dead", q.dead); put("createdAt", q.createdAt)
        put("lastAttemptAt", q.lastAttemptAt ?: JSONObject.NULL)
    }
}
