package com.runflow.app.data.model

import com.google.gson.JsonElement

/**
 * Standardized API error response structure.
 * Matches the backend ApiError interface from apiResponse.ts
 *
 * @property error Human-readable error message
 * @property code Machine-readable error code for client handling
 * @property details Additional error details (optional)
 * @property timestamp ISO timestamp when the error occurred
 * @property path Request path for debugging (optional)
 */
@kotlinx.serialization.Serializable
data class ApiErrorResponse(
    val error: String,
    val code: String,
    val timestamp: String,
    val details: Map<String, @kotlinx.serialization.Contextual Any>? = null,
    val path: String? = null
)

/**
 * Standardized API success response wrapper (optional).
 * Matches the backend ApiSuccess<T> interface from apiResponse.ts
 *
 * @property data The actual response data
 * @property timestamp ISO timestamp of the response
 */
@kotlinx.serialization.Serializable
data class ApiSuccess<T>(
    val data: T,
    val timestamp: String
)

/**
 * Error codes matching backend ErrorCode enum.
 * Use these for consistent error handling across the app.
 */
enum class ErrorCode(val value: String) {
    // Authentication errors (4xx)
    UNAUTHORIZED("UNAUTHORIZED"),
    INVALID_TOKEN("INVALID_TOKEN"),
    TOKEN_EXPIRED("TOKEN_EXPIRED"),
    FORBIDDEN("FORBIDDEN"),

    // Client errors (4xx)
    BAD_REQUEST("BAD_REQUEST"),
    VALIDATION_ERROR("VALIDATION_ERROR"),
    NOT_FOUND("NOT_FOUND"),
    CONFLICT("CONFLICT"),
    RATE_LIMITED("RATE_LIMITED"),

    // Server errors (5xx)
    INTERNAL_ERROR("INTERNAL_ERROR"),
    SERVICE_UNAVAILABLE("SERVICE_UNAVAILABLE"),
    DATABASE_ERROR("DATABASE_ERROR");

    companion object {
        fun fromValue(value: String?): ErrorCode? =
            values().find { it.value == value }
    }
}

/**
 * Wrapper for API responses that may be either success or error.
 * Used for type-safe response handling.
 */
sealed class ApiResponse<out T> {
    data class Success<T>(val data: T) : ApiResponse<T>()
    data class Error(val error: ApiErrorResponse) : ApiResponse<Nothing>()
}
