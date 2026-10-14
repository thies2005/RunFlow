package com.runflow2.app.domain.plan.structured

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonClassDiscriminator
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class StructuredWorkoutV2(
    val version: Int = 2,
    val source: String = "engine",
    val steps: List<StepNode> = emptyList(),
)

@Serializable(with = StepNodeSerializer::class)
sealed interface StepNode

object StepNodeSerializer : JsonContentPolymorphicSerializer<StepNode>(StepNode::class) {
    override fun selectDeserializer(element: JsonElement): DeserializationStrategy<StepNode> {
        val kind = element.jsonObject["kind"]?.jsonPrimitive?.content
        return if (kind == "repeat") {
            RepeatGroup.serializer()
        } else {
            StructuredStep.serializer()
        }
    }
}

@Serializable
data class RepeatGroup(
    val kind: String = "repeat",
    val times: Int,
    val setRest: Duration? = null,
    val steps: List<StepNode> = emptyList(),
    val label: String? = null,
) : StepNode

@Serializable
data class StructuredStep(
    val kind: String, // warmup | work | recovery | cooldown | steady | transition
    val label: String? = null,
    val note: String? = null,
    val duration: Duration,
    val target: Target? = null,
    val hrZone: Int? = null,
    val cadenceRpm: Int? = null,
) : StepNode

@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonClassDiscriminator("type")
sealed interface Duration {
    @Serializable
    @SerialName("time")
    data class Time(val seconds: Int) : Duration

    @Serializable
    @SerialName("distance")
    data class Distance(val meters: Double) : Duration

    @Serializable
    @SerialName("lap_press")
    data object LapPress : Duration
}

@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonClassDiscriminator("type")
sealed interface Target {
    @Serializable
    @SerialName("pace")
    data class Pace(
        val unit: String = "sec_per_km",
        val min: Double? = null,
        val max: Double? = null,
        val zoneLabel: String? = null,
    ) : Target

    @Serializable
    @SerialName("hr")
    data class Hr(
        val zone: Int? = null,
        val minBpm: Int? = null,
        val maxBpm: Int? = null,
    ) : Target

    @Serializable
    @SerialName("power")
    data class Power(
        val minWatts: Int? = null,
        val maxWatts: Int? = null,
        val ftpPercent: Int? = null,
        val zoneLabel: String? = null,
    ) : Target

    @Serializable
    @SerialName("rpe")
    data class Rpe(val value: Int) : Target

    @Serializable
    @SerialName("free")
    data object Free : Target
}

@Serializable
data class FlattenedPlayerStep(
    val kind: String,
    val label: String? = null,
    val note: String? = null,
    val duration: Duration,
    val target: Target? = null,
    val hrZone: Int? = null,
    val cadenceRpm: Int? = null,
    val repeatIteration: Int? = null,
    val totalIterations: Int? = null,
    val isSetRest: Boolean = false,
)

const val MAX_FLATTENED_STEPS = 500

/**
 * Recursively flattens a [StructuredWorkoutV2] step tree into a sequential list
 * of [FlattenedPlayerStep] items, unwrapping [RepeatGroup] blocks up to depth 3
 * and inserting [RepeatGroup.setRest] recovery intervals between iterations.
 */
fun flattenStructuredWorkout(workout: StructuredWorkoutV2): List<FlattenedPlayerStep> {
    val result = mutableListOf<FlattenedPlayerStep>()

    fun processNodes(nodes: List<StepNode>, repeatIteration: Int? = null, totalIterations: Int? = null, depth: Int = 0) {
        if (depth > 3 || result.size >= MAX_FLATTENED_STEPS) return
        for (node in nodes) {
            if (result.size >= MAX_FLATTENED_STEPS) return
            when (node) {
                is RepeatGroup -> {
                    val times = node.times.coerceIn(1, 100)
                    for (i in 0 until times) {
                        if (result.size >= MAX_FLATTENED_STEPS) return
                        processNodes(node.steps, repeatIteration = i + 1, totalIterations = times, depth = depth + 1)
                        if (i < times - 1 && node.setRest != null) {
                            if (result.size >= MAX_FLATTENED_STEPS) return
                            result.add(
                                FlattenedPlayerStep(
                                    kind = "recovery",
                                    label = if (node.label != null) "${node.label} Rest" else "Set Rest",
                                    duration = node.setRest,
                                    repeatIteration = i + 1,
                                    totalIterations = times,
                                    isSetRest = true,
                                )
                            )
                        }
                    }
                }
                is StructuredStep -> {
                    result.add(
                        FlattenedPlayerStep(
                            kind = node.kind,
                            label = node.label,
                            note = node.note,
                            duration = node.duration,
                            target = node.target,
                            hrZone = node.hrZone,
                            cadenceRpm = node.cadenceRpm,
                            repeatIteration = repeatIteration,
                            totalIterations = totalIterations,
                        )
                    )
                }
            }
        }
    }

    processNodes(workout.steps)
    return result
}
