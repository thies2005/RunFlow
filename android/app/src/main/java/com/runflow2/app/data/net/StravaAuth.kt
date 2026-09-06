package com.runflow2.app.data.net

import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder

/**
 * Strava OAuth flow, mirroring the Flutter app exactly:
 *
 *  1. open https://www.strava.com/oauth/authorize?...redirect_uri=<server>/api/auth/strava/callback
 *  2. user consents; Strava 302s to the server callback
 *  3. the server callback 302s to runflow2://auth/callback?code=... (the scheme
 *     is chosen by the state prefix — `flutter_` maps to runflow2 — and the
 *     state timestamp must be under 10 minutes old)
 *  4. the app receives the deep link and exchanges the code via
 *     POST /api/mobile/v1/auth/login {code, redirectUri}
 *
 * Pure java.net only — unit-testable on the JVM.
 */
object StravaAuth {
    /** Public Strava API client id (same as the Flutter app, see AGENTS.md). */
    const val CLIENT_ID = "193995"

    /** Deep-link scheme claimed by the runflow2 app family. */
    const val CALLBACK_SCHEME = "runflow2"
    const val CALLBACK_HOST = "auth"
    const val CALLBACK_PATH = "/callback"

    const val SCOPE = "read,activity:read_all"

    /** Server callback endpoint the browser is redirected to after consent. */
    fun callbackUriFor(baseUrl: String): String = "${baseUrl.trimEnd('/')}/api/auth/strava/callback"

    /**
     * Builds the Strava consent page URL. `state` must start with `flutter_`
     * followed by the current epoch millis — the server validates the age
     * (10-minute window) and picks the mobile deep-link scheme from it.
     * `approval_prompt=force` keeps the consent screen visible even for
     * returning users: the Authorize click gives the browser the user
     * activation it needs to follow the 302 back to runflow2://.
     */
    fun authorizeUrl(baseUrl: String, nowMillis: Long = System.currentTimeMillis()): String {
        val state = "flutter_$nowMillis"
        return "https://www.strava.com/oauth/authorize" +
            "?client_id=${url(CLIENT_ID)}" +
            "&redirect_uri=${url(callbackUriFor(baseUrl))}" +
            "&response_type=code" +
            "&approval_prompt=force" +
            "&scope=${url(SCOPE)}" +
            "&state=${url(state)}"
    }

    /** Result of parsing an incoming runflow2://auth/callback deep link. */
    sealed interface Callback {
        data class Authorized(val code: String, val state: String?) : Callback
        data class Failed(val error: String) : Callback
        data object NotForUs : Callback
    }

    fun parseCallback(raw: String): Callback {
        val uri = runCatching { URI(raw) }.getOrNull() ?: return Callback.NotForUs
        if (!uri.scheme.equals(CALLBACK_SCHEME, ignoreCase = true)) return Callback.NotForUs
        if (!uri.host.equals(CALLBACK_HOST, ignoreCase = true)) return Callback.NotForUs
        val path = uri.path ?: ""
        if (path != CALLBACK_PATH && path != "$CALLBACK_PATH/") return Callback.NotForUs
        val query = parseQuery(uri.rawQuery)
        query["error"]?.let { return Callback.Failed(it) }
        val code = query["code"]
        return if (code != null) {
            Callback.Authorized(code, query["state"])
        } else {
            Callback.Failed("missing_code")
        }
    }

    private fun parseQuery(rawQuery: String?): Map<String, String> {
        if (rawQuery.isNullOrEmpty()) return emptyMap()
        val out = mutableMapOf<String, String>()
        for (pair in rawQuery.split('&')) {
            if (pair.isEmpty()) continue
            val idx = pair.indexOf('=')
            if (idx < 0) {
                out[decode(pair)] = ""
            } else {
                out[decode(pair.substring(0, idx))] = decode(pair.substring(idx + 1))
            }
        }
        return out
    }

    private fun url(v: String) = URLEncoder.encode(v, Charsets.UTF_8.name())
    private fun decode(v: String) = URLDecoder.decode(v, Charsets.UTF_8.name())

    /**
     * Opens the Strava consent page in a Custom Tab — matching the Flutter
     * app's flutter_web_auth_2 behaviour. Custom Tabs let the server's 302 to
     * runflow2:// return to the app even when Strava auto-approves (no consent
     * click = no user activation, which plain Chrome blocks). Falls back to
     * the default browser when no Custom Tabs provider exists.
     */
    fun openForAuthorization(context: android.content.Context, baseUrl: String): Boolean {
        val uri = android.net.Uri.parse(authorizeUrl(baseUrl))
        val customTabs = androidx.browser.customtabs.CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        runCatching {
            customTabs.launchUrl(context, uri)
            return true
        }
        // No Custom Tabs provider (or launch failed) — plain browser.
        return runCatching {
            context.startActivity(
                android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    uri,
                ).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            true
        }.getOrDefault(false)
    }
}
