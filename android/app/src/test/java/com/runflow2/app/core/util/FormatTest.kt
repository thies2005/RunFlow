package com.runflow2.app.core.util

import com.runflow2.app.core.util.DistanceUnit.IMPERIAL
import com.runflow2.app.core.util.DistanceUnit.METRIC
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FormatTest {

    // ---- activity pace labels (input is ALWAYS seconds per km) ----

    @Test
    fun `swim activity pace converts sec-per-km to per-100m`() {
        // 1500 m in 28:00 → 1120 s/km → a 1:52/100m swimmer. Labeled raw this
        // used to display as "18:40 /100m" — ten times slower than reality.
        assertEquals("1:52 /100m", Format.activityPaceLabel("SWIM", 1120.0, METRIC))
        // 3800 m OW swim in 1:15:00 → 1184 s/km → 1:58/100m
        assertEquals("1:58 /100m", Format.activityPaceLabel("OPEN_WATER_SWIM", 1184.2, METRIC))
    }

    @Test
    fun `swim activity pace uses per-100yd in imperial`() {
        // 1120 s/km × 0.09144 = 102.4 s/100yd → 1:42
        assertEquals("1:42 /100yd", Format.activityPaceLabel("SWIM", 1120.0, IMPERIAL))
    }

    @Test
    fun `ride activity pace shows speed`() {
        // 114.3 s/km ≈ 31.5 km/h (a 41.6 km ride in 1:19:16)
        assertEquals("31.5 km/h", Format.activityPaceLabel("RIDE", 114.3, METRIC))
        assertEquals("32.3 km/h", Format.activityPaceLabel("VIRTUAL_RIDE", 111.5, METRIC))
    }

    @Test
    fun `run activity pace stays per-km or per-mile`() {
        assertEquals("5:12 /km", Format.activityPaceLabel("RUN", 312.0, METRIC))
        assertEquals("8:22 /mi", Format.activityPaceLabel("RUN", 312.0, IMPERIAL))
    }

    @Test
    fun `unusable activity paces return null`() {
        assertNull(Format.activityPaceLabel("SWIM", null))
        assertNull(Format.activityPaceLabel("SWIM", 0.0))
        assertNull(Format.activityPaceLabel("RUN", Double.NaN))
    }

    // ---- plan target pace labels (swim values are ALREADY per-100m) ----

    @Test
    fun `plan swim target stays per-100m without conversion`() {
        // web engine convention: swim targets stored as sec/100m (120 = 2:00)
        assertEquals("2:00 /100m", Format.paceLabelFor("SWIM", 120.0, METRIC))
        assertEquals("2:11 /100yd", Format.paceLabelFor("SWIM", 120.0, IMPERIAL))
    }

    @Test
    fun `plan run target keeps pace units`() {
        assertEquals("5:12 /km", Format.paceLabelFor("EASY_RUN", 312.0, METRIC))
    }

    // ---- sport nouns for chat wording ----

    @Test
    fun `activity nouns cover every sport family`() {
        assertEquals("run", Format.activityNoun("RUN"))
        assertEquals("ride", Format.activityNoun("RIDE"))
        assertEquals("ride", Format.activityNoun("VIRTUAL_RIDE"))
        assertEquals("swim", Format.activityNoun("SWIM"))
        assertEquals("walk", Format.activityNoun("WALK"))
        assertEquals("hike", Format.activityNoun("HIKE"))
        assertEquals("workout", Format.activityNoun("WORKOUT"))
        assertEquals("workout", Format.activityNoun("STRENGTH"))
        assertEquals("activity", Format.activityNoun(null))
        assertEquals("activity", Format.activityNoun("MYSTERY"))
    }
}
