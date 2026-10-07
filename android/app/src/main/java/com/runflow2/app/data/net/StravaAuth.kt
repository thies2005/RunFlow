package com.runflow2.app.data.net

import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.security.SecureRandom

/**
 * Strava OAuth flow, mirroring the Flutter app exactly:
 *
 *  1. open https://www.strava.com/oauth/authorize?...redirect_uri=<server>/api/auth/strava/callback
 *     (state = flutter_<epochMillis>_<nonce>; the nonce is minted by
 *     [beginFlow] and held in memory for this flow only)
 *  2. user consents; Strava 302s to the server callback
 *  3. the server callback 302s to runflow2://auth/callback?code=...&state=...
 *     (the scheme is chosen by the state prefix — `flutter_` maps to runflow2 —
 *     and the state timestamp must be under 10 minutes old)
 *  4. the app receives the deep link and accepts the code only when the state
 *     matches the in-flight flow ([validateAndConsumeCallbackState]) — the
 *     runflow2:// scheme is deliverable by any app on the device, so an
 *     unsolicited or forged callback must never reach the exchange — then
 *     exchanges the code via POST /api/mobile/v1/auth/login {code, redirectUri}
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

    /** profile:read_all makes Strava return athlete.email, so the account
     *  gets a real email on the server instead of a null placeholder. */
    const val SCOPE = "read,activity:read_all,profile:read_all"

    /**
     * State prefix the server's mobile branch routes on. The full format is
     * `flutter_<epochMillis>_<nonce>` — the server validates the prefix and
     * the timestamp (10-minute window) and forwards the state verbatim; only
     * the app knows the nonce and checks it when the deep link lands.
     */
    const val STATE_PREFIX = "flutter_"

    /**
     * How long a pending authorization flow may complete in — mirrors the
     * server's state-timestamp recency window.
     */
    const val FLOW_TTL_MS = 10 * 60 * 1000L

    /** 128 bits of SecureRandom per flow, hex-encoded (no `_`, so the state
     *  stays trivially splittable for the server's timestamp check). */
    private const val NONCE_BYTES = 16

    /** Server callback endpoint the browser is redirected to after consent. */
    fun callbackUriFor(baseUrl: String): String = "${baseUrl.trimEnd('/')}/api/auth/strava/callback"

    /**
     * An authorization flow this app instance started. Held in memory only:
     * a code is accepted exclusively while the process that built the consent
     * URL is still running, which is exactly the binding an arriving deep
     * link must prove. Single use — consumed by the first matching callback.
     */
    data class PendingFlow(val nonce: String, val createdAtMillis: Long, val expiresAtMillis: Long)

    /**
     * The one flow currently in flight, if any. Volatile: begun from the login
     * UI thread, consumed from the main activity's deep-link handler.
     */
    @Volatile
    private var pendingFlow: PendingFlow? = null

    /** Cryptographically random per-flow nonce (SecureRandom, 128 bits, hex). */
    fun newNonce(): String {
        val bytes = ByteArray(NONCE_BYTES)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /** Starts an authorization flow: mints the nonce a callback must echo. */
    fun beginFlow(nowMillis: Long = System.currentTimeMillis()): PendingFlow {
        val flow = PendingFlow(newNonce(), nowMillis, nowMillis + FLOW_TTL_MS)
        pendingFlow = flow
        return flow
    }

    /** Drops any in-flight flow (also used by tests to reset the singleton). */
    fun clearPendingFlow() {
        pendingFlow = null
    }

    /** The state a flow's callback must carry back verbatim. */
    fun stateFor(flow: PendingFlow): String = "${STATE_PREFIX}${flow.createdAtMillis}_${flow.nonce}"

    /**
     * Builds the Strava consent page URL for [flow]. The state embeds the
     * flow's nonce so the deep link can be bound back to this login attempt:
     * `flutter_<epochMillis>_<nonce>`. `approval_prompt=force` keeps the
     * consent screen visible even for returning users: the Authorize click
     * gives the browser the user activation it needs to follow the 302 back
     * to runflow2://.
     */
    fun authorizeUrl(baseUrl: String, flow: PendingFlow): String {
        val state = stateFor(flow)
        return "https://www.strava.com/oauth/authorize" +
            "?client_id=${url(CLIENT_ID)}" +
            "&redirect_uri=${url(callbackUriFor(baseUrl))}" +
            "&response_type=code" +
            "&approval_prompt=force" +
            "&scope=${url(SCOPE)}" +
            "&state=${url(state)}"
    }

    /**
     * Decides whether an arriving callback's [state] completes the flow this
     * app started. Accepts only an exact match with the in-flight nonce while
     * the flow is live; consumes the flow on success (single use) and on
     * expiry. Anything else — including a forged `flutter_<now>` link fired
     * by another app on the device, or a callback with no flow in flight at
     * all — is rejected, leaving the pending flow intact so a legit callback
     * that is still on its way can still complete.
     */
    fun validateAndConsumeCallbackState(
        state: String?,
        nowMillis: Long = System.currentTimeMillis(),
    ): Boolean {
        val flow = pendingFlow ?: return false
        if (nowMillis >= flow.expiresAtMillis) {
            pendingFlow = null
            return false
        }
        if (state != stateFor(flow)) return false
        pendingFlow = null
        return true
    }

    /** Result of parsing an incoming OAuth deep link. */
    sealed interface Callback {
        data class Authorized(val code: String, val state: String?) : Callback
        data class Failed(val error: String) : Callback
        data object NotForUs : Callback
    }

    /**
     * Accepts both return paths:
     *  - the verified App Link  https://runflow.schuelken.uk/auth/app-callback?code=…
     *    (host mirrors the manifest intent-filter)
     *  - the custom-scheme link runflow2://auth/callback?code=…
     */
    fun parseCallback(raw: String): Callback {
        val uri = runCatching { URI(raw) }.getOrNull() ?: return Callback.NotForUs
        val scheme = uri.scheme?.lowercase() ?: return Callback.NotForUs
        val path = uri.path ?: ""
        val appLinkHost = runCatching { URI(Api.DEFAULT_BASE_URL).host?.lowercase() }.getOrNull()
        val isAppLink = scheme == "https" &&
            uri.host?.lowercase() == appLinkHost &&
            (path == "/auth/app-callback" || path == "/auth/app-callback/")
        val isCustom = scheme == CALLBACK_SCHEME &&
            uri.host?.equals(CALLBACK_HOST, ignoreCase = true) == true &&
            (path == CALLBACK_PATH || path == "$CALLBACK_PATH/")
        if (!isAppLink && !isCustom) return Callback.NotForUs
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
     * the default browser when no Custom Tabs provider exists. Begins the
     * nonce-bound flow whose state the eventual deep link must echo; the flow
     * is dropped again when no browser could be opened at all.
     */
    fun openForAuthorization(context: android.content.Context, baseUrl: String): Boolean {
        val flow = beginFlow()
        val uri = android.net.Uri.parse(authorizeUrl(baseUrl, flow))
        val customTabs = androidx.browser.customtabs.CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        val viaCustomTab = runCatching {
            customTabs.launchUrl(context, uri)
            true
        }.getOrDefault(false)
        if (viaCustomTab) return true
        // No Custom Tabs provider (or launch failed) — plain browser.
        val opened = runCatching {
            context.startActivity(
                android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    uri,
                ).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            true
        }.getOrDefault(false)
        if (!opened) clearPendingFlow()
        return opened
    }
}
