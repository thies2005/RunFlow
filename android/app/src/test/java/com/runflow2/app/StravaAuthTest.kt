package com.runflow2.app

import com.runflow2.app.data.net.StravaAuth
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder

class StravaAuthTest {

    @Before
    fun resetPendingFlow() {
        // StravaAuth holds the in-flight flow in singleton memory — every
        // test starts from "no flow in flight".
        StravaAuth.clearPendingFlow()
    }

    @Test
    fun `authorize url carries the wire contract`() {
        val flow = StravaAuth.beginFlow(nowMillis = 1_700_000_000_000)
        val url = StravaAuth.authorizeUrl("https://runflow.schuelken.uk", flow)
        val uri = URI(url)
        val q = uri.rawQuery.split('&').associate {
            it.substringBefore('=') to it.substringAfter('=')
        }
        assertEquals("www.strava.com", uri.host)
        assertEquals("/oauth/authorize", uri.path)
        assertEquals(StravaAuth.CLIENT_ID, q["client_id"])
        assertEquals("code", q["response_type"])
        // consent is forced so the Authorize click provides the user
        // activation browsers require to follow the runflow2:// 302
        assertEquals("force", q["approval_prompt"])
        // redirect_uri is URL-encoded and points at the server callback
        assertEquals(
            "https%3A%2F%2Frunflow.schuelken.uk%2Fapi%2Fauth%2Fstrava%2Fcallback",
            q["redirect_uri"],
        )
        // state must be flutter_<millis>_<nonce> — the server picks the
        // runflow2 scheme and validates the timestamp; the app binds the
        // eventual deep link back to the nonce
        assertEquals("flutter_1700000000000_${flow.nonce}", q["state"])
        // profile:read_all makes Strava return athlete.email so the account gets a real email
        assertEquals("read%2Cactivity%3Aread_all%2Cprofile%3Aread_all", q["scope"])
    }

    @Test
    fun `callback uri strips trailing slash from custom server`() {
        assertEquals(
            "https://staging.example.com/api/auth/strava/callback",
            StravaAuth.callbackUriFor("https://staging.example.com/"),
        )
    }

    @Test
    fun `parses a successful deep link`() {
        val result = StravaAuth.parseCallback(
            "runflow2://auth/callback?code=abc123&state=flutter_1700000000000_3fa9b2c1d4e5f60718293a4b5c6d7e8f&scope=read"
        )
        assertTrue(result is StravaAuth.Callback.Authorized)
        result as StravaAuth.Callback.Authorized
        assertEquals("abc123", result.code)
        assertEquals("flutter_1700000000000_3fa9b2c1d4e5f60718293a4b5c6d7e8f", result.state)
    }

    @Test
    fun `parses error deep links`() {
        assertEquals(
            StravaAuth.Callback.Failed("access_denied"),
            StravaAuth.parseCallback("runflow2://auth/callback?error=access_denied"),
        )
        assertEquals(
            StravaAuth.Callback.Failed("missing_code"),
            StravaAuth.parseCallback("runflow2://auth/callback?state=flutter_1"),
        )
    }

    @Test
    fun `rejects foreign uris`() {
        assertEquals(StravaAuth.Callback.NotForUs, StravaAuth.parseCallback("https://auth/callback?code=1"))
        assertEquals(StravaAuth.Callback.NotForUs, StravaAuth.parseCallback("runflow2://other/callback?code=1"))
        assertEquals(StravaAuth.Callback.NotForUs, StravaAuth.parseCallback("runflow2://auth/elsewhere?code=1"))
        assertEquals(StravaAuth.Callback.NotForUs, StravaAuth.parseCallback("not a uri"))
    }

    @Test
    fun `decodes url-encoded code values`() {
        val result = StravaAuth.parseCallback("runflow2://auth/callback?code=a%2Bb%3Dc")
        assertEquals("a+b=c", (result as StravaAuth.Callback.Authorized).code)
    }

    @Test
    fun `parses the verified app link form`() {
        val result = StravaAuth.parseCallback(
            "https://runflow.schuelken.uk/auth/app-callback?code=xyz&state=flutter_1700000000000_3fa9b2c1d4e5f60718293a4b5c6d7e8f&scope=read"
        )
        assertTrue(result is StravaAuth.Callback.Authorized)
        result as StravaAuth.Callback.Authorized
        assertEquals("xyz", result.code)
        assertEquals("flutter_1700000000000_3fa9b2c1d4e5f60718293a4b5c6d7e8f", result.state)
    }

    @Test
    fun `app link error and foreign https paths are handled`() {
        assertEquals(
            StravaAuth.Callback.Failed("access_denied"),
            StravaAuth.parseCallback("https://runflow.schuelken.uk/auth/app-callback?error=access_denied"),
        )
        assertEquals(
            StravaAuth.Callback.NotForUs,
            StravaAuth.parseCallback("https://runflow.schuelken.uk/login?code=1"),
        )
        assertEquals(
            StravaAuth.Callback.NotForUs,
            StravaAuth.parseCallback("https://other-host.example.com/auth/app-callback?code=1"),
        )
    }

    @Test
    fun `server urls are normalized to origin only`() {
        // The bug: an API path in the server URL leaked into the OAuth
        // redirect_uri and Strava returned to a nonexistent callback.
        assertEquals(
            "https://runflow.schuelken.uk",
            com.runflow2.app.data.net.Api.normalizeServerUrl("https://runflow.schuelken.uk/api/mobile/v1"),
        )
        assertEquals(
            "https://runflow.schuelken.uk",
            com.runflow2.app.data.net.Api.normalizeServerUrl("runflow.schuelken.uk/"),
        )
        assertEquals(
            "http://staging.local:8080",
            com.runflow2.app.data.net.Api.normalizeServerUrl("http://staging.local:8080/api"),
        )
        assertEquals(
            com.runflow2.app.data.net.Api.DEFAULT_BASE_URL,
            com.runflow2.app.data.net.Api.normalizeServerUrl(""),
        )
    }

    @Test
    fun `callback uri stays correct with any stored server value`() {
        assertEquals(
            "https://runflow.schuelken.uk/api/auth/strava/callback",
            StravaAuth.callbackUriFor(
                com.runflow2.app.data.net.Api.normalizeServerUrl("https://runflow.schuelken.uk/api/mobile/v1")
            ),
        )
    }

    // ---- OAuth callback binding: the deep link must complete a flow this
    // app started (nonce-bound state, in flight, not expired, single use).

    @Test
    fun `nonces are 128-bit hex and unique per flow`() {
        val a = StravaAuth.newNonce()
        val b = StravaAuth.newNonce()
        // 32 lowercase hex chars — no `_`, so the state stays splittable for
        // the server's timestamp check
        assertTrue(a.matches(Regex("[0-9a-f]{32}")))
        assertTrue(b.matches(Regex("[0-9a-f]{32}")))
        assertNotEquals(a, b)
    }

    @Test
    fun `matching state is accepted exactly once`() {
        val flow = StravaAuth.beginFlow(nowMillis = 1_000_000)
        val state = StravaAuth.stateFor(flow)
        assertTrue(StravaAuth.validateAndConsumeCallbackState(state, nowMillis = 1_000_000 + 5 * 60_000))
        // single use: replaying the same deep link must never yield a second
        // accepted code
        assertFalse(StravaAuth.validateAndConsumeCallbackState(state, nowMillis = 1_000_000 + 5 * 60_001))
    }

    @Test
    fun `unsolicited callbacks are rejected when no flow is in flight`() {
        // Any app on the device can fire the deep link — without a flow
        // begun by this app instance there is nothing to match against,
        // however fresh and plausible the forged state looks.
        assertFalse(
            StravaAuth.validateAndConsumeCallbackState(
                "flutter_${System.currentTimeMillis()}_3fa9b2c1d4e5f60718293a4b5c6d7e8f",
                nowMillis = System.currentTimeMillis(),
            )
        )
        // ...and the legacy nonce-less form is equally worthless to an attacker
        assertFalse(
            StravaAuth.validateAndConsumeCallbackState(
                "flutter_${System.currentTimeMillis()}",
                nowMillis = System.currentTimeMillis(),
            )
        )
        assertFalse(StravaAuth.validateAndConsumeCallbackState(null, nowMillis = System.currentTimeMillis()))
    }

    @Test
    fun `mismatched nonce is rejected without killing the pending flow`() {
        val flow = StravaAuth.beginFlow(nowMillis = 1_000_000)
        val forged = "flutter_1000000_" + "0".repeat(32)
        assertFalse(StravaAuth.validateAndConsumeCallbackState(forged, nowMillis = 1_000_500))
        // the attacker's link must not consume the user's flow: the real
        // callback may still arrive and complete it
        assertTrue(
            StravaAuth.validateAndConsumeCallbackState(
                StravaAuth.stateFor(flow),
                nowMillis = 1_000_600,
            )
        )
    }

    @Test
    fun `expired flows are rejected and cleared`() {
        val flow = StravaAuth.beginFlow(nowMillis = 1_000_000)
        val state = StravaAuth.stateFor(flow)
        val pastExpiry = 1_000_000 + StravaAuth.FLOW_TTL_MS + 1
        assertFalse(StravaAuth.validateAndConsumeCallbackState(state, nowMillis = pastExpiry))
        // expiry consumed the flow: even the correct state is dead afterwards
        assertFalse(StravaAuth.validateAndConsumeCallbackState(state, nowMillis = pastExpiry + 1))
    }

    @Test
    fun `legacy and truncated states never match an in-flight flow`() {
        val flow = StravaAuth.beginFlow(nowMillis = 1_000_000)
        assertFalse(StravaAuth.validateAndConsumeCallbackState("flutter_1000000", nowMillis = 1_000_500))
        assertFalse(StravaAuth.validateAndConsumeCallbackState("flutter_1000000_${flow.nonce}x", nowMillis = 1_000_500))
        assertFalse(StravaAuth.validateAndConsumeCallbackState("android_1000000_${flow.nonce}", nowMillis = 1_000_500))
        assertFalse(StravaAuth.validateAndConsumeCallbackState("", nowMillis = 1_000_500))
        assertTrue(StravaAuth.validateAndConsumeCallbackState(StravaAuth.stateFor(flow), nowMillis = 1_000_600))
    }

    @Test
    fun `beginFlow replaces any earlier flow`() {
        val first = StravaAuth.beginFlow(nowMillis = 1_000_000)
        val second = StravaAuth.beginFlow(nowMillis = 1_000_001)
        assertFalse(StravaAuth.validateAndConsumeCallbackState(StravaAuth.stateFor(first), nowMillis = 1_000_500))
        assertTrue(StravaAuth.validateAndConsumeCallbackState(StravaAuth.stateFor(second), nowMillis = 1_000_500))
    }

    @Test
    fun `authorize url state round-trips through parseCallback into validation`() {
        // End-to-end JVM check of the binding: the state built into the
        // consent URL must survive the deep-link parse unchanged and then
        // validate against the flow that minted it.
        val flow = StravaAuth.beginFlow(nowMillis = 1_000_000)
        val consent = StravaAuth.authorizeUrl("https://runflow.schuelken.uk", flow)
        val stateParam = URLDecoder.decode(consent.substringAfterLast("state="), Charsets.UTF_8.name())
        val link = "runflow2://auth/callback?code=abc&state=${URLEncoder.encode(stateParam, Charsets.UTF_8.name())}"
        val parsed = StravaAuth.parseCallback(link) as StravaAuth.Callback.Authorized
        assertEquals(stateParam, parsed.state)
        assertTrue(StravaAuth.validateAndConsumeCallbackState(parsed.state, nowMillis = 1_000_100))
    }
}
