package com.runflow2.app.ui.components

import kotlin.math.abs
import kotlin.math.cos

/** Valid GPS fixes in latitude/longitude order. (0, 0) is a valid location. */
fun validRoute(points: List<Pair<Double, Double>>): List<Pair<Double, Double>> =
    points.filter { (lat, lng) -> lat.isFinite() && lng.isFinite() && abs(lat) <= 90 && abs(lng) <= 180 }

data class RouteSample(val point: Pair<Double, Double>, val fraction: Float)

/** Retain each fix's original progress when corrupt coordinates are omitted. */
fun routeSamples(points: List<Pair<Double, Double>>): List<RouteSample> =
    points.mapIndexedNotNull { index, point ->
        if (point.first.isFinite() && point.second.isFinite() && abs(point.first) <= 90 && abs(point.second) <= 180) {
            RouteSample(point, index.toFloat() / points.lastIndex.coerceAtLeast(1))
        } else null
    }

/** Fits a route north-up, preserving local aspect ratio and date-line continuity. */
fun projectRoute(points: List<Pair<Double, Double>>, width: Double, height: Double): List<Pair<Double, Double>> {
    val fixes = validRoute(points)
    if (fixes.size < 2 || width <= 0 || height <= 0 || !width.isFinite() || !height.isFinite()) return emptyList()
    val cosLat = cos(Math.toRadians(fixes.map { it.first }.average()))
    var longitude = fixes.first().second
    val projected = fixes.mapIndexed { index, (lat, lng) ->
        if (index > 0) {
            var delta = lng - fixes[index - 1].second
            if (delta > 180) delta -= 360
            if (delta < -180) delta += 360
            longitude += delta
        }
        longitude * cosLat to -lat
    }
    val minX = projected.minOf { it.first }
    val maxX = projected.maxOf { it.first }
    val minY = projected.minOf { it.second }
    val maxY = projected.maxOf { it.second }
    val span = maxOf((maxX - minX) / (width * .86), (maxY - minY) / (height * .86))
    if (span < 1e-12) return projected.map { width / 2 to height / 2 }
    return projected.map { (x, y) ->
        width / 2 + (x - (minX + maxX) / 2) / span to height / 2 + (y - (minY + maxY) / 2) / span
    }
}
