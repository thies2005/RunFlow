package com.runflow2.app.data.ai

/**
 * Incremental parser for the AI coach's token stream. The server speaks
 * Server-Sent-Events: each `data: {...}` line carries one {"token": "..."}
 * JSON object; a literal `data: [DONE]` terminates the response. Chunks can
 * split anywhere (including mid-line and multi-byte), so partial input is
 * buffered until the next feed().
 */
class SseParser {

    private var buffer = ""
    private var done = false

    /** Set when a payload carries {"error": "..."} — surfaced by the repository. */
    var errorPayload: String? = null
        private set

    /** Feed a raw chunk; returns the tokens completed by this chunk. */
    fun feed(chunk: String): List<String> {
        if (done) return emptyList()
        buffer += chunk
        val tokens = mutableListOf<String>()
        val lines = buffer.split('\n')
        buffer = lines.last() // keep the trailing partial line
        for (line in lines.dropLast(1)) {
            parseLine(line)?.let { tokens += it }
            if (done) break
        }
        return tokens
    }

    /** Flush any final buffered line (servers end with a newline; safety net). */
    fun finish(): List<String> {
        if (done || buffer.isEmpty()) return emptyList()
        val last = buffer
        buffer = ""
        return parseLine(last)?.let { listOf(it) } ?: emptyList()
    }

    val isDone: Boolean get() = done

    private fun parseLine(line: String): String? {
        val trimmed = line.trimEnd('\r')
        if (!trimmed.startsWith("data:")) return null
        val data = trimmed.removePrefix("data:").trim()
        if (data.isEmpty()) return null
        if (data == "[DONE]") {
            done = true
            return null
        }
        if (errorPayload == null) {
            extractStringField(data, "error")?.let { errorPayload = it }
        }
        return extractStringField(data, "token")
    }

    private fun extractStringField(data: String, field: String): String? {
        val key = "\"$field\""
        val keyIdx = data.indexOf(key)
        if (keyIdx < 0) return null
        var i = data.indexOf('"', keyIdx + key.length)
        if (i < 0) return null
        val sb = StringBuilder()
        while (++i < data.length) {
            val c = data[i]
            when {
                c == '\\' && i + 1 < data.length -> {
                    i++
                    when (val e = data[i]) {
                        'n' -> sb.append('\n')
                        't' -> sb.append('\t')
                        'r' -> sb.append('\r')
                        'u' -> {
                            if (i + 4 < data.length) {
                                sb.append(runCatching { data.substring(i + 1, i + 5).toInt(16).toChar() }.getOrNull() ?: '?')
                                i += 4
                            }
                        }
                        else -> sb.append(e)
                    }
                }
                c == '"' -> return sb.toString()
                else -> sb.append(c)
            }
        }
        return null
    }
}
