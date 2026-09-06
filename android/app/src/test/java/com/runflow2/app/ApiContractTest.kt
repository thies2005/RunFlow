package com.runflow2.app

import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.CreateActivityRequest
import com.runflow2.app.data.net.EmailLoginRequest
import com.runflow2.app.data.net.RefreshRequest
import com.runflow2.app.data.net.RunFlowApi
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import okhttp3.MediaType.Companion.toMediaType

/**
 * Pins the wire contract against the same JSON the Flutter app sends and
 * receives: endpoint paths, request bodies, and response envelope shapes.
 */
class ApiContractTest {

    private lateinit var server: MockWebServer
    private lateinit var api: RunFlowApi

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(Api.json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(RunFlowApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `email login posts credentials to the mobile auth path`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"accessToken":"at","refreshToken":"rt","expiresIn":900,"tokenType":"Bearer",
                   "user":{"id":"u1","email":"a@b.c","name":"Runner","sex":"male"}}""".trimIndent()
            )
        )
        val resp = api.emailLogin(EmailLoginRequest("a@b.c", "pw"))
        val recorded = server.takeRequest()
        assertEquals("/api/mobile/v1/auth/email-login", recorded.path)
        assertEquals("POST", recorded.method)
        assertTrue(recorded.body.readUtf8().contains("\"email\":\"a@b.c\""))
        assertEquals("at", resp.accessToken)
        assertEquals("rt", resp.refreshToken)
        assertEquals("Runner", resp.user?.name)
    }

    @Test
    fun `activities list parses the pagination envelope`() = runTest {
        server.enqueue(
            MockResponse().setBody(
                """{"activities":[
                     {"id":"a1","type":"RUN","name":"Long Run","startDate":"2026-09-01T08:00:00.000Z",
                      "distance":21097.5,"movingTime":5700,"hasHeartrate":true,"totalElevation":120,
                      "trimp":88.2,"estimatedVdot":47.1,"hrZone1Time":600,"unknownField":123}
                   ],
                   "total":1,"limit":100,"offset":0,"hasMore":false}""".trimIndent()
            )
        )
        val page = api.activities(limit = 100, offset = 0)
        assertEquals("/api/mobile/v1/activities?limit=100&offset=0", server.takeRequest().path)
        assertEquals(1, page.activities.size)
        val a = page.activities.first()
        assertEquals("a1", a.id)
        assertEquals(21097.5, a.distance, 0.01)
        assertEquals(88.2, a.trimp!!, 0.01)
        assertEquals(600, a.hrZone1Time)
        assertEquals(false, page.hasMore)
    }

    @Test
    fun `create activity posts the create payload and unwraps the activity`() = runTest {
        server.enqueue(MockResponse().setBody("""{"activity":{"id":"server-1","type":"RUN","name":"Morning Run","distance":5000,"movingTime":1500}}"""))
        val resp = api.createActivity(
            CreateActivityRequest(
                name = "Morning Run", type = "RUN",
                startDate = "2026-09-06T10:00:00.000Z",
                distance = 5000.0, movingTime = 1500, elapsedTime = 1500,
                hasHeartrate = false,
            )
        )
        val recorded = server.takeRequest()
        assertEquals("/api/mobile/v1/activities", recorded.path)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"distance\":5000.0"))
        assertTrue(body.contains("\"movingTime\":1500"))
        // encodeDefaults=false: null fields must not be sent
        assertTrue(!body.contains("averageHr"))
        assertEquals("server-1", resp.activity.id)
    }

    @Test
    fun `chat endpoints hit the ai path family`() = runTest {
        server.enqueue(MockResponse().setBody("""{"sessions":[{"id":"s1","title":"Training","createdAt":"2026-09-01T08:00:00.000Z","updatedAt":"2026-09-02T08:00:00.000Z"}]}"""))
        val sessions = api.chatSessions()
        assertEquals("/api/ai/chat/sessions", server.takeRequest().path)
        assertEquals("s1", sessions.sessions.single().id)

        server.enqueue(MockResponse().setBody("""{"session":{"id":"s2"}}"""))
        assertEquals("s2", api.createChatSession().session.id)
        assertEquals("/api/ai/chat/sessions", server.takeRequest().path)

        server.enqueue(MockResponse().setBody("""{"messages":[{"id":"m1","role":"user","content":"hi","createdAt":"2026-09-01T08:00:00.000Z"},{"id":"m2","role":"assistant","content":"hello","createdAt":"2026-09-01T08:00:05.000Z"}]}"""))
        val history = api.chatHistory("s2")
        assertEquals("/api/ai/chat/history?sessionId=s2", server.takeRequest().path)
        assertEquals(2, history.messages.size)
        assertEquals("assistant", history.messages[1].role)
    }

    @Test
    fun `refresh posts the refresh token`() = runTest {
        server.enqueue(MockResponse().setBody("""{"accessToken":"at2","refreshToken":"rt2"}"""))
        val resp = api.refresh(RefreshRequest("rt-old"))
        val recorded = server.takeRequest()
        assertEquals("/api/mobile/v1/auth/refresh", recorded.path)
        assertTrue(recorded.body.readUtf8().contains("\"refreshToken\":\"rt-old\""))
        assertEquals("at2", resp.accessToken)
        assertEquals("rt2", resp.refreshToken)
    }
}
