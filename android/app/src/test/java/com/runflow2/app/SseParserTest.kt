package com.runflow2.app

import com.runflow2.app.data.ai.SseParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SseParserTest {

    @Test
    fun `parses simple token lines`() {
        val p = SseParser()
        val out = p.feed("data: {\"token\": \"Hello\"}\ndata: {\"token\": \" world\"}\n\n")
        assertEquals(listOf("Hello", " world"), out)
    }

    @Test
    fun `handles chunks split mid-line`() {
        val p = SseParser()
        val a = p.feed("data: {\"to")
        val b = p.feed("ken\": \"He")
        val c = p.feed("llo\"}\n")
        assertEquals(emptyList<String>(), a)
        assertEquals(emptyList<String>(), b)
        assertEquals(listOf("Hello"), c)
    }

    @Test
    fun `stops at DONE and ignores events after it`() {
        val p = SseParser()
        val out = p.feed("data: {\"token\": \"x\"}\ndata: [DONE]\ndata: {\"token\": \"y\"}\n")
        assertEquals(listOf("x"), out)
        assertTrue(p.isDone)
        assertEquals(emptyList<String>(), p.feed("data: {\"token\": \"z\"}\n"))
    }

    @Test
    fun `decodes escaped characters`() {
        val p = SseParser()
        val out = p.feed("data: {\"token\": \"line1\\nline2 \\\"q\\\" \\u00e9\"}\n")
        assertEquals(listOf("line1\nline2 \"q\" é"), out)
    }

    @Test
    fun `ignores non-data and empty lines`() {
        val p = SseParser()
        val out = p.feed(": heartbeat\nevent: message\n\n\ndata: {\"token\": \"ok\"}\n")
        assertEquals(listOf("ok"), out)
    }

    @Test
    fun `ignores payloads without a token field`() {
        val p = SseParser()
        val out = p.feed("data: {\"error\": \"boom\"}\ndata: {\"token\": \"still here\"}\n")
        assertEquals(listOf("still here"), out)
    }

    @Test
    fun `finish flushes a trailing line without newline`() {
        val p = SseParser()
        assertEquals(emptyList<String>(), p.feed("data: {\"token\": \"end\"}"))
        assertEquals(listOf("end"), p.finish())
    }

    @Test
    fun `carriage returns are tolerated`() {
        val p = SseParser()
        val out = p.feed("data: {\"token\": \"crlf\"}\r\n")
        assertEquals(listOf("crlf"), out)
    }

    @Test
    fun `captures error payloads while still delivering tokens`() {
        val p = SseParser()
        val out = p.feed(
            "data: {\"sessionId\":\"s1\"}\n" +
                "data: {\"error\":\"AI access denied\"}\n" +
                "data: {\"token\":\"hi\"}\n"
        )
        assertEquals(listOf("hi"), out)
        assertEquals("AI access denied", p.errorPayload)
    }
}
