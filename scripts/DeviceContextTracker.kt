package com.zpass

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.os.Build
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.TimeZone

data class DeviceContextState(
    val enabled: Boolean = false,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracyMeters: Float? = null,
    val country: String = "",
    val city: String = "",
    val address: String = "",
    val ip: String = "",
    val updatedAt: Long = 0L,
    val unavailable: Boolean = false
)

/** Explicit, account/device-scoped foreground sharing. Never reads vault data. */
object DeviceContextTracker {
    private val mutableState = MutableStateFlow(DeviceContextState())
    val state = mutableState.asStateFlow()
    private var app: Context? = null
    private var foreground = false
    private var activeUid: String? = null
    private var client: FusedLocationProviderClient? = null
    private var callback: LocationCallback? = null
    private var session: CoroutineScope? = null
    private var lastUploadElapsed = 0L
    private var lastGeocodeElapsed = 0L
    private var lastUploadedLocation: Location? = null
    private var authListener: FirebaseAuth.AuthStateListener? = null

    private fun preferenceKey(context: Context, uid: String) = "share_${uid}_${DeviceIdentity.current(context)}"
    fun isEnabled(context: Context): Boolean {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return false
        return context.getSharedPreferences("device_context", Context.MODE_PRIVATE)
            .getBoolean(preferenceKey(context, uid), false)
    }
    fun setEnabled(context: Context, enabled: Boolean) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        context.getSharedPreferences("device_context", Context.MODE_PRIVATE)
            .edit().putBoolean(preferenceKey(context, uid), enabled).apply()
        stop()
        mutableState.value = DeviceContextState(enabled = enabled)
        if (enabled && foreground) start(context.applicationContext)
        if (!enabled) {
            // Withdraw precise/device context when the user switches sharing off.
            val device = FirebaseFirestore.getInstance().collection("users").document(uid)
                .collection("devices").document(DeviceIdentity.current(context))
            device.set(mapOf("ownerUid" to uid, "deviceId" to DeviceIdentity.current(context),
                "contextSharingEnabled" to false, "deviceContext" to FieldValue.delete()), SetOptions.merge())
            FirebaseFirestore.getInstance().collection("users").document(uid)
                .set(mapOf("lastDeviceContext" to FieldValue.delete()), SetOptions.merge())
        }
    }
    fun resume(context: Context) {
        app = context.applicationContext
        foreground = true
        if (authListener == null) {
            authListener = FirebaseAuth.AuthStateListener {
                if (activeUid != it.currentUser?.uid) {
                    stop(); mutableState.value = DeviceContextState()
                    if (foreground) app?.let(::start)
                }
            }.also { FirebaseAuth.getInstance().addAuthStateListener(it) }
        }
        start(context.applicationContext)
    }
    fun pause() { foreground = false; stop() }
    private fun stop() {
        callback?.let { listener -> client?.removeLocationUpdates(listener) }
        callback = null; client = null; activeUid = null
        session?.cancel(); session = null
        lastUploadElapsed = 0; lastGeocodeElapsed = 0; lastUploadedLocation = null
    }
    @SuppressLint("MissingPermission")
    private fun start(context: Context) {
        if (!foreground || !isEnabled(context) || callback != null) return
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) { mutableState.value = DeviceContextState(unavailable = true); return }
        activeUid = uid
        mutableState.value = DeviceContextState(enabled = true)
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        session = scope
        scope.launch { fetchNetworkContext(context, uid) }
        val listener = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                if (activeUid != uid || !foreground || !isEnabled(context)) return
                val location = result.lastLocation ?: return
                if (location.latitude !in -90.0..90.0 || location.longitude !in -180.0..180.0) return
                // Discard stale cached fixes; callbacks may otherwise report an old visit.
                if (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos > 120_000_000_000L) return
                mutableState.value = mutableState.value.copy(latitude = location.latitude,
                    longitude = location.longitude, accuracyMeters = location.accuracy,
                    updatedAt = System.currentTimeMillis(), unavailable = false)
                val now = SystemClock.elapsedRealtime()
                if (lastUploadElapsed == 0L || now - lastUploadElapsed >= 60_000L) {
                    lastUploadElapsed = now
                    upload(context, uid)
                }
                if (lastGeocodeElapsed == 0L || (now - lastGeocodeElapsed >= 60_000L &&
                    (lastUploadedLocation?.distanceTo(location) ?: Float.MAX_VALUE) >= 100f)) {
                    lastGeocodeElapsed = now; lastUploadedLocation = Location(location)
                    scope.launch {
                        val address = withContext(Dispatchers.IO) {
                            runCatching {
                                @Suppress("DEPRECATION")
                                Geocoder(context, Locale.getDefault()).getFromLocation(location.latitude, location.longitude, 1)?.firstOrNull()
                            }.getOrNull()
                        }
                        if (activeUid == uid && foreground && isEnabled(context) && address != null) {
                            mutableState.value = mutableState.value.copy(address = address.getAddressLine(0).orEmpty().take(500),
                                city = address.locality.orEmpty().take(100), country = address.countryCode.orEmpty().uppercase(Locale.US))
                            upload(context, uid)
                        }
                    }
                }
            }
        }
        callback = listener
        runCatching {
            client = LocationServices.getFusedLocationProviderClient(context)
            val request = LocationRequest.Builder(if (fine) Priority.PRIORITY_HIGH_ACCURACY else Priority.PRIORITY_BALANCED_POWER_ACCURACY, 5000L)
                .setMinUpdateIntervalMillis(2000L).setWaitForAccurateLocation(false).build()
            client!!.requestLocationUpdates(request, listener, Looper.getMainLooper())
                .addOnFailureListener {
                    if (activeUid == uid) { mutableState.value = mutableState.value.copy(unavailable = true); callback = null }
                }
        }.onFailure { mutableState.value = mutableState.value.copy(unavailable = true); callback = null }
    }
    private suspend fun fetchNetworkContext(context: Context, uid: String) {
        val network = withContext(Dispatchers.IO) {
            runCatching {
                val connection = URL("https://ipapi.co/json/").openConnection() as HttpURLConnection
                connection.connectTimeout = 5000; connection.readTimeout = 5000
                try {
                    if (connection.responseCode != 200) return@runCatching null
                    val payload = connection.inputStream.bufferedReader().use { it.readText().take(16_384) }
                    JSONObject(payload).takeUnless { it.optBoolean("error") }
                } finally { connection.disconnect() }
            }.getOrNull()
        } ?: return
        if (activeUid != uid || !foreground || !isEnabled(context)) return
        val country = network.optString("country_code", network.optString("country")).uppercase(Locale.US)
            .takeIf { it.matches(Regex("[A-Z]{2}")) }.orEmpty()
        val ip = network.optString("ip").takeIf { it.length <= 64 && it.matches(Regex("[0-9a-fA-F:.]+")) }.orEmpty()
        val old = mutableState.value
        mutableState.value = old.copy(ip = ip, country = old.country.ifBlank { country },
            city = old.city.ifBlank { network.optString("city").take(100) })
        upload(context, uid)
    }
    private fun upload(context: Context, uid: String) {
        val user = FirebaseAuth.getInstance().currentUser ?: return
        if (user.uid != uid || activeUid != uid || !foreground || !isEnabled(context)) return
        val snapshot = mutableState.value
        val deviceId = DeviceIdentity.current(context)
        val details = mutableMapOf<String, Any>(
            "deviceModel" to Build.MODEL, "manufacturer" to Build.MANUFACTURER,
            "androidVersion" to Build.VERSION.RELEASE, "sdkVersion" to Build.VERSION.SDK_INT,
            "appVersion" to BuildConfig.VERSION_NAME, "timeZone" to TimeZone.getDefault().id,
            "language" to Locale.getDefault().toLanguageTag(), "countryCode" to snapshot.country,
            "city" to snapshot.city, "address" to snapshot.address, "ipAddress" to snapshot.ip,
            "locationSource" to if (snapshot.latitude != null) "GPS" else "IP_APPROXIMATE",
            "updatedAt" to FieldValue.serverTimestamp())
        snapshot.latitude?.let { details["latitude"] = it }
        snapshot.longitude?.let { details["longitude"] = it }
        snapshot.accuracyMeters?.let { details["accuracyMeters"] = it }
        user.phoneNumber?.takeIf { it.isNotBlank() }?.let { details["phoneNumber"] = it }
        FirebaseFirestore.getInstance().collection("users").document(uid)
            .collection("devices").document(deviceId).set(mapOf("ownerUid" to uid,
                "deviceId" to deviceId, "contextSharingEnabled" to true, "deviceContext" to details,
                "lastSeenAt" to FieldValue.serverTimestamp()), SetOptions.merge())
        val profile = mutableMapOf<String, Any>("lastDeviceContext" to details, "lastSeenAt" to FieldValue.serverTimestamp())
        if (snapshot.country.isNotBlank()) profile["countryCode"] = snapshot.country
        FirebaseFirestore.getInstance().collection("users").document(uid).set(profile, SetOptions.merge())
    }
}
