package com.runflow2.app

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.net.ActivityDto
import com.runflow2.app.data.net.UserDto
import com.runflow2.app.data.sync.applyTo
import com.runflow2.app.data.sync.localTypeFromServer
import com.runflow2.app.data.sync.mergeInto
import com.runflow2.app.data.sync.serverTypeFromLocal
import com.runflow2.app.data.sync.toCreateRequest
import com.runflow2.app.data.sync.toUpdateRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncMappersTest {

    private fun localActivity() = ActivityEntity(
        id = "local-1",
        name = "Morning Run",
        type = "RUN",
        startDate = 1_700_000_000_000,
        distanceMeters = 10_000.0,
        movingTimeSec = 3_000,
        averageHr = 155.0,
        maxHr = 172,
        averageCadence = 178.0,
        totalElevation = 80.0,
        calories = 650,
        trimp = 55.0,
        trainingType = null,
        estimatedVdot = 44.0,
        routeJson = "[[50.9,6.9]]",
        lapsJson = "[{\"km\":1}]",
        dirty = true,
    )

    @Test
    fun `server type mapping round-trips known types`() {
        assertEquals("WORKOUT", serverTypeFromLocal("STRENGTH"))
        assertEquals("RUN", serverTypeFromLocal("RUN"))
        assertEquals("RIDE", localTypeFromServer("VIRTUAL_RIDE"))
        assertEquals("RUN", localTypeFromServer("run"))
        assertEquals("OTHER", localTypeFromServer(null))
        assertEquals("OTHER", localTypeFromServer("JETPACK"))
    }

    @Test
    fun `create request carries the wire contract`() {
        val req = localActivity().toCreateRequest()
        assertEquals("Morning Run", req.name)
        assertEquals("RUN", req.type)
        assertEquals(10_000.0, req.distance, 0.01)
        assertEquals(3_000, req.movingTime)
        assertEquals(3_000, req.elapsedTime)
        assertEquals(155.0, req.averageHr!!, 0.01)
        assertEquals(true, req.hasHeartrate)
        assertTrue(req.startDate.endsWith("Z"))
        assertEquals("2023-11-14T22:13:20Z", req.startDate)
    }

    @Test
    fun `merge keeps local route and laps, server wins metrics`() {
        val dto = ActivityDto(
            id = "server-9",
            type = "RUN",
            name = "Renamed by server",
            startDate = "2026-09-01T08:00:00.000Z",
            distance = 10_050.0,
            movingTime = 2_980,
            averageHr = 154.0,
            trimp = 57.5,
            estimatedVdot = 44.8,
            trainingType = "TEMPO",
            hrZone1Time = 100, hrZone2Time = 200, hrZone3Time = 300,
            hrZone4Time = 400, hrZone5Time = 500, hrZone6Time = 600, hrZone7Time = 700,
        )
        val merged = dto.mergeInto(localActivity(), now = 42L)
        // local identity + local-only data preserved
        assertEquals("local-1", merged.id)
        assertEquals("server-9", merged.serverId)
        assertEquals("[[50.9,6.9]]", merged.routeJson)
        assertEquals("[{\"km\":1}]", merged.lapsJson)
        // server values applied
        assertEquals("Renamed by server", merged.name)
        assertEquals(10_050.0, merged.distanceMeters, 0.01)
        assertEquals(2_980, merged.movingTimeSec)
        assertEquals(57.5, merged.trimp, 0.01)
        assertEquals(44.8, merged.estimatedVdot!!, 0.01)
        assertEquals("TEMPO", merged.trainingType)
        assertEquals(700, merged.hrZone7Sec)
        assertFalse(merged.dirty)
        assertEquals(42L, merged.updatedAt)
    }

    @Test
    fun `merge creates a fresh row when no local match`() {
        val dto = ActivityDto(id = "server-1", type = "RIDE", name = "Ride", distance = 25_000.0, movingTime = 3_600)
        val merged = dto.mergeInto(null, now = 1L)
        assertEquals("server-1", merged.id)
        assertEquals("server-1", merged.serverId)
        assertEquals("RIDE", merged.type)
        assertEquals(25_000.0, merged.distanceMeters, 0.01)
    }

    @Test
    fun `user dto fills profile without clobbering local values`() {
        val profile = ProfileEntity(name = "Local Name", hrMax = 190, weightKg = 75.0, hrRest = 50)
        val server = UserDto(
            id = "u1",
            email = "a@b.c",
            name = "Server Name",
            sex = "male",
            birthDate = "1995-04-01T00:00:00.000Z",
            hrMax = 192,
            weight = 73.5,
            vdotCorrectionFactor = 1.02,
        )
        val merged = server.applyTo(profile)
        assertEquals("Server Name", merged.name)
        assertEquals("a@b.c", merged.email)
        assertEquals("MALE", merged.sex)
        assertEquals(192, merged.hrMax)
        assertEquals(50, merged.hrRest) // server null -> keep local
        assertEquals(73.5, merged.weightKg, 0.01)
        assertEquals(1.02, merged.vdotCorrection, 0.001)
        assertFalse(merged.dirty)
    }

    @Test
    fun `profile update request carries all editable fields`() {
        val req = ProfileEntity(
            name = "Thies", sex = "MALE", birthYear = 1995,
            hrMax = 194, hrRest = 48, weightKg = 70.0, heightCm = 180.0, vdotCorrection = 0.98,
        ).toUpdateRequest()
        assertEquals("Thies", req.name)
        assertEquals("MALE", req.sex)
        assertEquals(194, req.hrMax)
        assertEquals(48, req.hrRest)
        assertEquals(70.0, req.weight!!, 0.01)
        assertEquals(180.0, req.height!!, 0.01)
        assertEquals(0.98, req.vdotCorrectionFactor!!, 0.001)
        assertTrue(req.birthDate!!.startsWith("1995-"))
    }
}
