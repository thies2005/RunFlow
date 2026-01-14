package com.runflow.app.data.remote

import com.google.gson.Gson
import com.google.gson.JsonParser
import com.runflow.app.data.model.ApiErrorResponse
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLException

/**
 * Centralized API error handler.
 *
 * Parses standardized error responses from the backend and converts them
 * into AppApiError objects for consistent error handling across the app.
 */
object ApiErrorHandler {

    /**
     * Parse an exception into an AppApiError.
     */
    fun parseException(throwable: Throwable): AppApiError {
        return when (throwable) {
            is HttpException -> parseHttpException(throwable)
            is SocketTimeoutException -> AppApiError(
                message = "Request timed out. Please check your connection.",
                code = ErrorCode.NETWORK_TIMEOUT,
                isRetryable = true
            )
            is IOException -> AppApiError(
                message = "Network error. Please check your connection.",
                code = ErrorCode.NETWORK_ERROR,
                isRetryable = true
            )
            is SSLException -> AppApiError(
                message = "Secure connection failed.",
                code = ErrorCode.SSL_ERROR,
                isRetryable = false
            )
            else -> AppApiError(
                message = throwable.message ?: "An unexpected error occurred",
                code = ErrorCode.UNKNOWN,
                isRetryable = false
            )
        }
    }

    /**
     * Parse HTTP exception with standardized error response.
     */
    fun parseHttpException(exception: HttpException): AppApiError {
        val code = exception.code()
        val errorBody = exception.response()?.errorBody()?.string()

        return if (errorBody != null) {
            try {
                // Try to parse as standardized ApiError
                val gson = Gson()
                val apiError = gson.fromJson(errorBody, ApiErrorResponse::class.java)

                AppApiError(
                    message = apiError.error,
                    code = parseErrorCode(apiError.code),
                    httpCode = code,
                    isRetryable = isRetryable(code, apiError.code),
                    details = if (apiError.details != null) gson.toJsonTree(apiError.details) else null
                )
            } catch (e: Exception) {
                // Fallback if parsing fails
                AppApiError(
                    message = extractErrorMessage(errorBody) ?: errorBody ?: "Server error",
                    code = httpCodeToErrorCode(code),
                    httpCode = code,
                    isRetryable = isRetryableByHttpCode(code)
                )
            }
        } else {
            AppApiError(
                message = getDefaultHttpMessage(code),
                code = httpCodeToErrorCode(code),
                httpCode = code,
                isRetryable = isRetryableByHttpCode(code)
            )
        }
    }

    /**
     * Parse backend error code string to ErrorCode enum.
     */
    private fun parseErrorCode(code: String?): ErrorCode {
        return when (code) {
            "UNAUTHORIZED" -> ErrorCode.UNAUTHORIZED
            "INVALID_TOKEN" -> ErrorCode.INVALID_TOKEN
            "TOKEN_EXPIRED" -> ErrorCode.TOKEN_EXPIRED
            "FORBIDDEN" -> ErrorCode.FORBIDDEN
            "BAD_REQUEST" -> ErrorCode.BAD_REQUEST
            "VALIDATION_ERROR" -> ErrorCode.VALIDATION_ERROR
            "NOT_FOUND" -> ErrorCode.NOT_FOUND
            "CONFLICT" -> ErrorCode.CONFLICT
            "RATE_LIMITED" -> ErrorCode.RATE_LIMITED
            "INTERNAL_ERROR" -> ErrorCode.INTERNAL_ERROR
            "SERVICE_UNAVAILABLE" -> ErrorCode.SERVICE_UNAVAILABLE
            "DATABASE_ERROR" -> ErrorCode.DATABASE_ERROR
            else -> ErrorCode.UNKNOWN
        }
    }

    /**
     * Convert HTTP status code to ErrorCode.
     */
    private fun httpCodeToErrorCode(code: Int): ErrorCode {
        return when (code) {
            400 -> ErrorCode.BAD_REQUEST
            401 -> ErrorCode.UNAUTHORIZED
            403 -> ErrorCode.FORBIDDEN
            404 -> ErrorCode.NOT_FOUND
            409 -> ErrorCode.CONFLICT
            429 -> ErrorCode.RATE_LIMITED
            500 -> ErrorCode.INTERNAL_ERROR
            503 -> ErrorCode.SERVICE_UNAVAILABLE
            else -> ErrorCode.UNKNOWN
        }
    }

    /**
     * Check if error is retryable based on HTTP code and error code.
     */
    private fun isRetryable(httpCode: Int, errorCode: String?): Boolean {
        return when (httpCode) {
            429 -> true // Rate limited
            500, 502, 503, 504 -> true // Server errors
            else -> false
        }
    }

    /**
     * Check if error is retryable based only on HTTP code.
     */
    private fun isRetryableByHttpCode(code: Int): Boolean {
        return code in listOf(408, 429, 500, 502, 503, 504)
    }

    /**
     * Extract error message from error body.
     */
    private fun extractErrorMessage(errorBody: String): String? {
        return try {
            val json = JsonParser.parseString(errorBody).asJsonObject
            json.get("error")?.asString
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Get default error message for HTTP status code.
     */
    private fun getDefaultHttpMessage(code: Int): String {
        return when (code) {
            400 -> "Bad request"
            401 -> "Authentication required"
            403 -> "Access forbidden"
            404 -> "Resource not found"
            409 -> "Resource conflict"
            429 -> "Too many requests. Please try again later."
            500 -> "Internal server error"
            503 -> "Service temporarily unavailable"
            else -> "Request failed"
        }
    }
}

/**
 * Application-level error code enum.
 */
enum class ErrorCode {
    // Network errors
    NETWORK_TIMEOUT,
    NETWORK_ERROR,
    SSL_ERROR,
    NO_INTERNET,

    // Authentication errors
    UNAUTHORIZED,
    INVALID_TOKEN,
    TOKEN_EXPIRED,
    FORBIDDEN,

    // Client errors
    BAD_REQUEST,
    VALIDATION_ERROR,
    NOT_FOUND,
    CONFLICT,
    RATE_LIMITED,

    // Server errors
    INTERNAL_ERROR,
    SERVICE_UNAVAILABLE,
    DATABASE_ERROR,

    // Unknown
    UNKNOWN
}

/**
 * Application-level API error.
 *
 * @property message Human-readable error message
 * @property code Machine-readable error code
 * @property httpCode HTTP status code (if applicable)
 * @property isRetryable Whether the request can be retried
 * @property details Additional error details
 */
data class AppApiError(
    val message: String,
    val code: ErrorCode,
    val httpCode: Int? = null,
    val isRetryable: Boolean = false,
    val details: com.google.gson.JsonElement? = null
)

/**
 * Extension function to convert retrofit2.Response to ApiResult.
 * Handles standardized error responses.
 */
fun <T> handleApiResponse(response: retrofit2.Response<T>): ApiResult<T> {
    return if (response.isSuccessful && response.body() != null) {
        ApiResult.Success(response.body()!!)
    } else {
        val error = ApiErrorHandler.parseHttpException(
            HttpException(response)
        )
        ApiResult.Error(
            message = error.message,
            code = error.code,
            httpCode = error.httpCode,
            isRetryable = error.isRetryable
        )
    }
}

/**
 * Extension function to safely execute API calls.
 * Returns ApiResult with proper error handling.
 */
suspend fun <T> safeApiCall(call: suspend () -> retrofit2.Response<T>): ApiResult<T> {
    return try {
        val response = call()
        handleApiResponse(response)
    } catch (e: Exception) {
        val error = ApiErrorHandler.parseException(e)
        ApiResult.Error(
            message = error.message,
            code = error.code,
            httpCode = error.httpCode,
            isRetryable = error.isRetryable
        )
    }
}

// Updated ApiResult to include more error information
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(
        val message: String,
        val code: ErrorCode? = null,
        val httpCode: Int? = null,
        val isRetryable: Boolean = false
    ) : ApiResult<Nothing>()
    data object Loading : ApiResult<Nothing>()
}
