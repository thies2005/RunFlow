package com.runflow2.app.core.util

import java.time.Instant

data class DiagnosticsInfo(
    val version: String,
    val serverOrigin: String,
    val accountId: String?,
    val accountName: String?,
    val syncStatus: String?,
    val pending: Int,
    val failed: Int,
)

/** Redact credentials in both log messages and stack traces before exporting them. */
internal fun redactDiagnostics(value: String): String {
    var text = value
    text = text.replace(Regex("""(?im)(authorization\s*[:=]\s*)[^\r\n]+"""), "$1[REDACTED]")
    text = text.replace(Regex("""(?i)\bBearer\s+[^\s,;"']+"""), "Bearer [REDACTED]")
    val key = "(?:authorization|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|code)"
    text = text.replace(Regex("""(?i)(["']?$key["']?\s*[:=]\s*)"[^"]*""""), "$1[REDACTED]")
    text = text.replace(Regex("""(?i)(["']?$key["']?\s*[:=]\s*)'[^']*'"""), "$1[REDACTED]")
    text = text.replace(Regex("""(?i)(["']?$key["']?\s*[:=]\s*)([^\s,;&"'}]+)"""), "$1[REDACTED]")
    return text
}

fun formatDiagnostics(info: DiagnosticsInfo, entries: List<LogEntry>): String {
    val stacks = linkedMapOf<String, Int>()
    val report = buildString {
        appendLine("RunFlow diagnostics")
        appendLine("Version: ${info.version}")
        appendLine("Server: ${info.serverOrigin}")
        appendLine("Account ID: ${info.accountId ?: "unknown"}")
        appendLine("Account name: ${info.accountName ?: "unknown"}")
        appendLine("Sync: ${info.syncStatus ?: "unknown"}")
        appendLine("Queue: ${info.pending} pending, ${info.failed} failed")
        appendLine("Events (${entries.size}, oldest first):")
        entries.sortedBy { it.at }.forEach { entry ->
            val level = when (entry.level) { Level.ERROR -> "ERROR"; Level.WARN -> "WARN"; Level.INFO -> "INFO"; else -> "DEBUG" }
            append("${Instant.ofEpochMilli(entry.at)} $level ${entry.tag}: ${entry.message}")
            entry.error?.let { error ->
                val redacted = redactDiagnostics(error)
                val id = stacks.getOrPut(redacted) { stacks.size + 1 }
                append(" [stack $id]")
            }
            appendLine()
        }
        stacks.forEach { (stack, id) ->
            appendLine("\nStack $id:")
            appendLine(stack)
        }
    }
    return redactDiagnostics(report)
}
