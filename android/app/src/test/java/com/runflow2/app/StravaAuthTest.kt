package com.runflow2.app

import com.runflow2.app.data.net.StravaAuth
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URI

class StravaAuthTest {

    @Test
    fun `authorize url carries the wire contract`() {
        val url = StravaAuth.authorizeUrl("https://runflow.schuelken.uk", nowMillis = 1_700_000_000_000)
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
        // state must be flutter_<millis> — the server picks the runflow2 scheme
        // and validates the timestamp from it
        assertEquals("flutter_1700000000000", q["state"])
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
            "runflow2://auth/callback?code=abc123&state=flutter_1700000000000&scope=read"
        )
        assertTrue(result is StravaAuth.Callback.Authorized)
        result as StravaAuth.Callback.Authorized
        assertEquals("abc123", result.code)
        assertEquals("flutter_1700000000000", result.state)
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
            "https://runflow.schuelken.uk/auth/app-callback?code=xyz&state=flutter_1700000000000&scope=read"
        )
        assertTrue(result is StravaAuth.Callback.Authorized)
        result as StravaAuth.Callback.Authorized
        assertEquals("xyz", result.code)
        assertEquals("flutter_1700000000000", result.state)
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
}
